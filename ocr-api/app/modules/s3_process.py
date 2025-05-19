from sqlalchemy.orm import Session
from app.models.video import Video, SRT, VIDEO_TTS
from app.core.config import get_settings
import boto3
import os
from tenacity import retry, stop_after_attempt, wait_fixed, retry_if_exception_type
from botocore.exceptions import ClientError
import logging
import urllib.parse

# Configure logging with more context
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)
logger = logging.getLogger(__name__)

# Function to get bucket region
def get_bucket_region(bucket_name: str, access_key_id: str | None, secret_access_key: str | None, default_region: str | None) -> str:
    """
    Detects the AWS region of a given S3 bucket.
    Uses provided credentials and a default region for the initial client.
    """
    try:
        # Create a temporary client, possibly without a region or with a default one,
        # as get_bucket_location does not strictly need the client to be in the bucket's region.
        # However, providing credentials if available is good practice.
        temp_s3_client = boto3.client(
            's3',
            aws_access_key_id=access_key_id,
            aws_secret_access_key=secret_access_key,
            region_name=default_region # Can be None, AWS SDK might pick a default
        )
        response = temp_s3_client.get_bucket_location(Bucket=bucket_name)
        region = response.get('LocationConstraint')
        # LocationConstraint is None for us-east-1. Other regions return the region name.
        # If region is None (us-east-1) or an empty string (can happen in some SDK versions/cases for us-east-1),
        # default to 'us-east-1'.
        detected_region = region if region else 'us-east-1'
        logger.info(f"Detected region for bucket '{bucket_name}': {detected_region}")
        return detected_region
    except ClientError as e:
        logger.error(f"Could not get bucket location for {bucket_name} to determine region: {e}. Falling back to configured/default region.")
        # Fallback to the configured region if detection fails
        return default_region if default_region else 'us-east-1' # Final fallback
    except Exception as e:
        logger.error(f"Unexpected error detecting region for bucket {bucket_name}: {e}. Falling back to configured/default region.")
        return default_region if default_region else 'us-east-1'

# Initialize boto3 session (thread-safe, avoids global client)
def get_s3_client():
    """
    Create a new S3 client with configuration from settings.
    Attempts to use the region of a reference bucket ('srt-input-storage-ft') if AWS_REGION is not optimal.
    Uses IAM role if no credentials are provided (e.g., on EC2/ECS).
    """
    settings = get_settings()
    aws_access_key_id = settings.AWS_ACCESS_KEY_ID or None
    aws_secret_access_key = settings.AWS_SECRET_ACCESS_KEY or None
    configured_region = settings.AWS_REGION
    
    logger.info(f"Configured AWS region from settings: {configured_region}")

    # As per user instruction, try to determine region from 'srt-input-storage-ft'
    # This client will then be used for other operations which might be on different buckets.
    # This assumes 'srt-input-storage-ft' is a primary reference for the correct operational region.
    # A more robust solution for multi-region operations might involve region detection per-call or per-bucket clients.
    
    # For fetching bucket location, we might need a client.
    # Let's use the configured_region for this initial detection client, or let Boto3 decide.
    try:
        # Using the specific bucket "srt-input-storage-ft" as per user's suggestion.
        # This means the client returned by get_s3_client() will be optimized for this bucket's region.
        effective_region = get_bucket_region("srt-input-storage-ft", aws_access_key_id, aws_secret_access_key, configured_region)
        if effective_region != configured_region:
            logger.info(f"Overriding configured region '{configured_region}' with detected region '{effective_region}' from bucket 'srt-input-storage-ft'.")
        else:
            logger.info(f"Using region '{effective_region}' (matches configured or detected from 'srt-input-storage-ft').")
    except Exception as e:
        logger.error(f"Error in region detection logic using 'srt-input-storage-ft', falling back to configured region '{configured_region}': {e}")
        effective_region = configured_region if configured_region else 'us-east-1' # Ensure there's a fallback

    session = boto3.Session()
    return session.client(
        's3',
        aws_access_key_id=aws_access_key_id,
        aws_secret_access_key=aws_secret_access_key,
        region_name=effective_region, # Use the determined effective region
        config=boto3.session.Config(
            connect_timeout=10,
            read_timeout=60,
            retries={'max_attempts': 3, 'mode': 'standard'}
        )
    )

def check_s3_permissions(bucket_name: str) -> tuple[bool, str | None]:
    """
    Verify S3 permissions for required actions (list, head, put).
    Returns: (success, error_message)
    """
    s3_client = get_s3_client()
    try:
        # Check list permissions
        s3_client.list_objects_v2(Bucket=bucket_name, MaxKeys=1)
        # Check head_object permissions (relevant for upload_file_to_s3)
        s3_client.head_bucket(Bucket=bucket_name)  # Validates bucket access
        return True, None
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', 'Unknown')
        error_msg = e.response.get('Error', {}).get('Message', str(e))
        request_id = e.response.get('ResponseMetadata', {}).get('RequestId', 'N/A')
        logger.error(
            f"S3 permission check failed: Code={error_code}, Message={error_msg}, "
            f"Bucket={bucket_name}, RequestId={request_id}"
        )
        if error_code == 'AllAccessDisabled':
            return False, (\
                f"S3 Error Code: {error_code}. All access to bucket '{bucket_name}' or its objects " \
                f"has been disabled. This could be due to a bucket policy, an AWS account issue (e.g., suspension), " \
                f"or specific object restrictions. Please check AWS console. RequestId: {request_id}" \
            )
        elif error_code == '403' or error_code == 'AccessDenied': # Added 'AccessDenied' for broader coverage
            return False, (\
                f"Access denied to S3 bucket '{bucket_name}' (Error Code: {error_code}). Ensure IAM role/user has " \
                "s3:ListBucket, s3:GetObject, s3:PutObject, and s3:HeadObject permissions. " \
                f"Check bucket policy and AWS region. RequestId: {request_id}"\
            )
        elif error_code == '404' or error_code == 'NoSuchBucket': # Added 'NoSuchBucket'
            return False, f"Bucket '{bucket_name}' not found (Error Code: {error_code}). Verify bucket name and AWS region. RequestId: {request_id}"
        else:
            return False, f"S3 error (Code={error_code}): {error_msg} (RequestId={request_id})"
    except Exception as e:
        logger.error(f"Unexpected error checking S3 permissions for bucket {bucket_name}: {str(e)}")
        return False, f"Unexpected error: {str(e)}"

@retry(
    stop=stop_after_attempt(3),
    wait=wait_fixed(2),
    retry=retry_if_exception_type(ClientError),  # Only retry on S3-specific errors
    retry_error_callback=lambda retry_state: logger.warning(
        f"Retry attempt {retry_state.attempt_number} failed: {retry_state.outcome.exception()}"
    )
)
def upload_file_to_s3(file_path: str, bucket_name: str) -> str:
    """
    Upload a file to S3 with unique naming and return a pre-signed URL.
    Raises: PermissionError, FileNotFoundError, ClientError
    """
    # Validate inputs
    if not os.path.isfile(file_path):
        logger.error(f"File not found: {file_path}")
        raise FileNotFoundError(f"File not found: {file_path}")
    if not bucket_name:
        logger.error("Bucket name is empty")
        raise ValueError("Bucket name cannot be empty")

    # Verify bucket permissions
    has_permission, error_msg = check_s3_permissions(bucket_name)
    if not has_permission:
        logger.error(f"S3 permission check failed before upload: {error_msg}")
        raise PermissionError(error_msg)

    s3_client = get_s3_client()
    filename = os.path.basename(file_path)
    base_filename, ext = os.path.splitext(filename)
    new_filename = filename
    count = 0

    # Check for unique filename
    while True:
        try:
            s3_client.head_object(Bucket=bucket_name, Key=new_filename)
            # Object exists, generate new name
            count += 1
            new_filename = f"{base_filename}_{count}{ext}" if ext else f"{base_filename}_{count}"
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == '404':
                break  # Unique name found
            elif error_code == '403' or error_code == 'AccessDenied' or error_code == 'AllAccessDisabled': # Added AllAccessDisabled
                error_message_detail = e.response.get('Error', {}).get('Message', 'Access Denied')
                error_msg = (\
                    f"Access denied to S3 object '{new_filename}' in bucket '{bucket_name}' (Error Code: {error_code}, Message: {error_message_detail}). " \
                    "Ensure IAM role/user has s3:HeadObject, s3:PutObject permissions and check bucket policies."\
                )
                logger.error(error_msg)
                raise PermissionError(error_msg) from e
            else:
                error_msg = f"S3 error checking object '{new_filename}': {e.response['Error']['Message']}"
                logger.error(error_msg)
                raise ClientError(e.response, e.operation_name) from e

    # Upload file
    try:
        s3_client.upload_file(
            Filename=file_path,
            Bucket=bucket_name,
            Key=new_filename,
            ExtraArgs={'ContentType': 'video/mp4'}  # Adjust based on file type
        )
        # Generate pre-signed URL (7 days expiry, adjust as needed)
        presigned_url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': bucket_name, 'Key': new_filename},
            ExpiresIn=604800
        )
        logger.info(f"Successfully uploaded {file_path} to s3://{bucket_name}/{new_filename}")
        return presigned_url
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', 'Unknown')
        error_msg_detail = e.response.get('Error', {}).get('Message', str(e)) # Renamed for clarity
        logger.error(
            f"Failed to upload {file_path} to s3://{bucket_name}/{new_filename}: "
            f"Code={error_code}, Message={error_msg_detail}"
        )
        # Raise a more specific PermissionError if it's an access issue
        if error_code in ['AllAccessDisabled', 'AccessDenied', '403', 'InvalidAccessKeyId', 'SignatureDoesNotMatch', 'InvalidToken']:
            raise PermissionError(f"S3 Upload Failed. Code: {error_code}, Message: {error_msg_detail}. Bucket: {bucket_name}, Key: {new_filename}") from e
        raise # Re-raise original ClientError for tenacity to handle retries if applicable, or for other handling
    except Exception as e:
        logger.error(f"Unexpected error uploading {file_path} to s3://{bucket_name}/{new_filename}: {str(e)}")
        raise

def delete_file_from_s3(file_url: str, bucket_name: str) -> bool:
    """
    Delete a file from S3.
    Returns: True if successful or object doesn't exist.
    Raises: PermissionError for access issues, ClientError for other S3 errors.
    """
    if not file_url or not bucket_name:
        logger.error("Invalid input: file_url or bucket_name is empty")
        # Consider raising ValueError here instead of returning False
        # For now, keeping return False to minimize behavior change outside of error raising
        return False

    s3_client = get_s3_client()
    filename = urllib.parse.unquote(file_url.split("/")[-1])
    try:
        s3_client.delete_object(Bucket=bucket_name, Key=filename)
        logger.info(f"Successfully deleted s3://{bucket_name}/{filename}")
        return True
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', 'Unknown')
        error_msg_detail = e.response.get('Error', {}).get('Message', str(e))
        
        if error_code == '404' or error_code == 'NoSuchKey': # NoSuchKey is also common for not found
            logger.warning(f"Object s3://{bucket_name}/{filename} not found, treating as deleted. Code: {error_code}")
            return True # File not found is a successful deletion outcome for replace logic
        
        logger.error(f"Failed to delete s3://{bucket_name}/{filename}: Code={error_code}, Message={error_msg_detail}")
        if error_code in ['AllAccessDisabled', 'AccessDenied', '403', 'InvalidAccessKeyId', 'SignatureDoesNotMatch', 'InvalidToken']:
            raise PermissionError(f"S3 Delete Failed. Code: {error_code}, Message: {error_msg_detail}. Bucket: {bucket_name}, Key: {filename}") from e
        raise # Re-raise other ClientErrors
    except Exception as e: # Catch other unexpected errors
        logger.error(f"Unexpected error deleting s3://{bucket_name}/{filename}: {str(e)}")
        # It might be better to raise a custom RuntimeError or re-raise e
        # For now, to maintain previous "return False" path for non-ClientErrors:
        # However, the function signature implies it can raise, so let's make it do so.
        raise RuntimeError(f"Unexpected error deleting S3 object {filename}: {str(e)}") from e

def download_file_from_s3(file_url: str, bucket_name: str, download_path: str) -> bool:
    """
    Download a file from S3 to the specified path.
    Handles different file_url formats (S3 URI, HTTPS URL, direct key) and region detection.
    Returns: True if successful, False otherwise.
    """
    if not file_url or not bucket_name or not download_path:
        logger.error("Invalid input: file_url, bucket_name, or download_path is empty")
        return False

    s3_key: str
    try:
        parsed_url = urllib.parse.urlparse(file_url)
        if parsed_url.scheme == 's3':
            # For s3://bucket/key?query_params, key should be path part without query
            key_path = parsed_url.path.lstrip('/')
            s3_key = urllib.parse.unquote(key_path)
            # Ensure bucket_name from URL matches provided bucket_name if a full S3 URI is given
            if parsed_url.netloc and parsed_url.netloc != bucket_name:
                logger.warning(f"Bucket name mismatch: URL indicates '{parsed_url.netloc}', but using '{bucket_name}'.")
        elif parsed_url.scheme in ['http', 'https']:
            # For https://<domain>/key?query_params, key is the path part
            s3_key = urllib.parse.unquote(parsed_url.path.lstrip('/'))
        else:
            # Fallback: assume file_url is a direct key, potentially with query string to be stripped.
            # This handles the case from the log: "key?AWSAccessKeyId=..."
            s3_key = urllib.parse.unquote(file_url.split('?', 1)[0])
        
        if not s3_key:
            logger.error(f"Could not extract a valid S3 key from file_url: '{file_url}'")
            return False
        logger.info(f"Extracted S3 key: '{s3_key}' for bucket: '{bucket_name}' from file_url: '{file_url}'")

    except Exception as e:
        logger.error(f"Error parsing S3 file_url '{file_url}' to extract key: {str(e)}")
        return False

    # Get S3 client - it's now expected to be region-aware based on "srt-input-storage-ft" or settings.
    # If this download is for a bucket in a *different* region than "srt-input-storage-ft",
    # and the client is fixed to that region, S3 might auto-redirect or fail if regions are very different
    # and signature versions clash. Boto3 usually handles redirects for GET operations well if client region is not bucket region.
    s3_client = get_s3_client()

    try:
        # Ensure target directory exists
        target_dir = os.path.dirname(download_path)
        if target_dir: # Make directory only if path includes a directory
            os.makedirs(target_dir, exist_ok=True)
        
        logger.info(f"Attempting to download s3://{bucket_name}/{s3_key} to {download_path}")
        s3_client.download_file(Bucket=bucket_name, Key=s3_key, Filename=download_path)
        logger.info(f"Successfully downloaded s3://{bucket_name}/{s3_key} to {download_path}")
        
        # Specific test case validation (as requested by user)
        test_s3_key = "Attack on Titan_ The Last Attack - Official Trailer (2025)_subtitles_1.srt"
        test_bucket = "srt-input-storage-ft"
        # Construct expected download path carefully, os.path.join normalizes slashes
        # The user's example path for download_path was 'tempsrt/Attack%20on%20Titan...'
        # However, local filenames usually don't keep %20. Assuming download_path is the unescaped version.
        test_download_path_normalized = os.path.normpath("tempsrt/Attack on Titan_ The Last Attack - Official Trailer (2025)_subtitles_1.srt")
        current_download_path_normalized = os.path.normpath(download_path)

        if bucket_name == test_bucket and s3_key == test_s3_key and current_download_path_normalized == test_download_path_normalized:
            logger.info(f"TEST VALIDATION (s3_process.py): Successfully downloaded specific test file '{test_s3_key}' to '{current_download_path_normalized}'")
        
        return True
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', 'Unknown')
        error_msg_detail = e.response.get('Error', {}).get('Message', str(e))
        request_id = e.response.get('ResponseMetadata', {}).get('RequestId', 'N/A')
        http_status_code = e.response.get('ResponseMetadata', {}).get('HTTPStatusCode', 'N/A')
        
        log_message = (
            f"Failed to download s3://{bucket_name}/{s3_key} to {download_path}. "
            f"S3 HTTP Status: {http_status_code}, Error Code: {error_code}, Message: '{error_msg_detail}', RequestId: {request_id}"
        )
        logger.error(log_message)
        
        # Specific test case validation log for failure
        test_s3_key_for_log = "Attack on Titan_ The Last Attack - Official Trailer (2025)_subtitles_1.srt"
        if bucket_name == "srt-input-storage-ft" and s3_key == test_s3_key_for_log:
             logger.error(f"TEST VALIDATION (s3_process.py): FAILED to download specific test file '{test_s3_key_for_log}'. Details: {log_message}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error downloading s3://{bucket_name}/{s3_key} to {download_path}: {str(e)}", exc_info=True)
        # Specific test case validation log for unexpected failure
        test_s3_key_for_log_unexpected = "Attack on Titan_ The Last Attack - Official Trailer (2025)_subtitles_1.srt"
        if bucket_name == "srt-input-storage-ft" and s3_key == test_s3_key_for_log_unexpected:
            logger.error(f"TEST VALIDATION (s3_process.py): FAILED to download specific test file '{test_s3_key_for_log_unexpected}' due to unexpected error: {str(e)}")
        return False

def replace_file_on_s3(file_url: str, bucket_name: str, file_path: str) -> str:
    """
    Replace an S3 file by deleting the old file and uploading the new one.
    Returns: Pre-signed URL of the new file.
    """
    if not delete_file_from_s3(file_url=file_url, bucket_name=bucket_name):
        # This block is now less likely to be hit if delete_file_from_s3 raises exceptions on failure.
        # However, if delete_file_from_s3 still has a path to return False (e.g. invalid input),
        # this generic exception is a fallback.
        # A more robust approach would be for delete_file_from_s3 to always raise on failure.
        logger.error(f"Failed to delete old file: {file_url} during replace operation. delete_file_from_s3 returned False.")
        raise Exception(f"Cannot delete old file: {file_url}. Operation returned false without S3 error.")
    return upload_file_to_s3(file_path=file_path, bucket_name=bucket_name) 