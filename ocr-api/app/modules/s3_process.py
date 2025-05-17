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

# Initialize boto3 session (thread-safe, avoids global client)
def get_s3_client():
    """
    Create a new S3 client with configuration from settings.
    Uses IAM role if no credentials are provided (e.g., on EC2/ECS).
    """
    session = boto3.Session()
    return session.client(
        's3',
        aws_access_key_id=get_settings().AWS_ACCESS_KEY_ID or None,  # Allow None for IAM roles
        aws_secret_access_key=get_settings().AWS_SECRET_ACCESS_KEY or None,
        region_name=get_settings().AWS_REGION,
        config=boto3.session.Config(
            connect_timeout=10,
            read_timeout=60,
            retries={'max_attempts': 3, 'mode': 'standard'}  # Built-in retries
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
    Returns: True if successful, False otherwise.
    """
    if not file_url or not bucket_name or not download_path:
        logger.error("Invalid input: file_url, bucket_name, or download_path is empty")
        return False

    s3_client = get_s3_client()
    filename = urllib.parse.unquote(file_url.split("/")[-1])
    try:
        os.makedirs(os.path.dirname(download_path), exist_ok=True)  # Ensure directory exists
        s3_client.download_file(Bucket=bucket_name, Key=filename, Filename=download_path)
        logger.info(f"Successfully downloaded s3://{bucket_name}/{filename} to {download_path}")
        return True
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', 'Unknown')
        error_msg = e.response.get('Error', {}).get('Message', str(e))
        logger.error(
            f"Failed to download s3://{bucket_name}/{filename} to {download_path}: "
            f"Code={error_code}, Message={error_msg}"
        )
        return False
    except Exception as e:
        logger.error(f"Unexpected error downloading s3://{bucket_name}/{filename}: {str(e)}")
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