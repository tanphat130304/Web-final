import os
import re
import pysrt
from datetime import timedelta
import ffmpeg
import tempfile
import shutil
import traceback

from moviepy.video.io.VideoFileClip import VideoFileClip
from moviepy.video.compositing.CompositeVideoClip import CompositeVideoClip
from moviepy.video.VideoClip import TextClip


# Set đường dẫn ImageMagick - Removed hardcoded Windows path, Dockerfile ENV will be used.
# os.environ['IMAGEMAGICK_BINARY'] = r"C:\\Program Files\\ImageMagick-7.1.1-Q16\\magick.exe"
font_path = "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf" # Changed to Noto Sans for better Unicode support


def srt_time_to_seconds(time_obj):
    return time_obj.hours * 3600 + time_obj.minutes * 60 + time_obj.seconds + time_obj.milliseconds / 1000.0


def add_subtitles_to_video(video_path, subtitle_path, output_path):
    # Ensure output directory exists
    output_dir = os.path.dirname(output_path)
    if not output_dir: # Handle case where output_path is just a filename in CWD
        output_dir = "."
    os.makedirs(output_dir, exist_ok=True)

    # Ensure ffmpeg_logs directory exists inside the container (mapped by volume)
    ffmpeg_log_dir = "/app/ffmpeg_logs"
    os.makedirs(ffmpeg_log_dir, exist_ok=True)
    ffmpeg_error_log_path = os.path.join(ffmpeg_log_dir, f"ffmpeg_error_{os.path.basename(video_path)}.log")


    # Create a unique temporary file in the target output directory for FFmpeg to write to.
    # delete=False is important: FFmpeg needs to open it by name. We are responsible for cleanup.
    # Using a suffix related to the original video name can help in debugging if files are left over.
    base_video_name = os.path.basename(video_path)
    temp_file_for_ffmpeg = tempfile.NamedTemporaryFile(
        dir=output_dir,
        prefix="ffmpeg_processing_temp_",
        suffix="_" + base_video_name, # Suffix helps identify origin
        delete=False
    )
    ffmpeg_processing_path = temp_file_for_ffmpeg.name
    temp_file_for_ffmpeg.close()  # Close the file handle so FFmpeg can open/write to the path

    try:
        # Kiểm tra xem file subtitle có tồn tại không
        if not os.path.exists(subtitle_path):
            print(f"Warning: Subtitle file {subtitle_path} not found. Creating empty subtitle file.")
            # Ensure the directory for the subtitle_path exists if it's being created
            os.makedirs(os.path.dirname(subtitle_path), exist_ok=True)
            with open(subtitle_path, 'w', encoding='utf-8') as f:
                f.write("1\\\\n00:00:00,000 --> 00:00:05,000\\\\nNo subtitles available\\\\n\\\\n")

        video_input_stream = ffmpeg.input(video_path)
        audio_stream = video_input_stream.audio
        video_stream = video_input_stream.video

        video_with_subs_stream = ffmpeg.filter(video_stream, 'subtitles', subtitle_path, force_style='FontName=Noto Sans')

        output_stream_definition = ffmpeg.output(
            video_with_subs_stream, audio_stream,
            ffmpeg_processing_path,  # FFmpeg writes to this unique temporary file
            acodec='copy',
            vcodec='libx264',
            preset='fast',      # Faster preset for better performance
            threads=0,          # Use all available cores
            crf=23,             # Constant Rate Factor (quality, 23 is a good default)
            pix_fmt='yuv420p',
            movflags='+faststart',
            loglevel='verbose'  # Increased log verbosity
        )
        
        print(f"Running FFmpeg command: {' '.join(ffmpeg.compile(output_stream_definition, overwrite_output=True))}")

        # Run FFmpeg and capture stdout/stderr
        stdout_data, stderr_data = ffmpeg.run(
            output_stream_definition, 
            overwrite_output=True, 
            capture_stdout=True, # Capture stdout
            capture_stderr=True  # Capture stderr
        )

        # Log stderr even on success for performance analysis
        if stderr_data:
            # Save detailed ffmpeg log to a file for later inspection
            # This log will be in the mounted volume ./ffmpeg_logs/
            success_log_path = os.path.join(ffmpeg_log_dir, f"ffmpeg_success_{os.path.basename(video_path)}.log")
            with open(success_log_path, "wb") as f_log:
                f_log.write(stderr_data)
            print(f"FFmpeg process completed. Stderr logged to {success_log_path} (first 500 chars): {stderr_data[:500].decode('utf8', errors='ignore')}")


        # If FFmpeg was successful, move the processed file to the final output_path.
        # shutil.move will overwrite output_path if it's an existing file.
        shutil.move(ffmpeg_processing_path, output_path)
        print(f"Successfully processed video and saved to {output_path}")
        return True

    except ffmpeg.Error as e:
        print(f"FFmpeg Error during subtitle processing: {e}")
        # FFmpeg errors often have more detail in stderr
        if e.stderr:
            detailed_error_message = e.stderr.decode('utf8', errors='ignore')
            print(f"FFmpeg stderr: {detailed_error_message}")
            # Save detailed ffmpeg log to a file for later inspection
            with open(ffmpeg_error_log_path, "wb") as f_err:
                f_err.write(e.stderr)
            print(f"Detailed FFmpeg error log saved to: {ffmpeg_error_log_path}")
        else:
            print("FFmpeg error did not provide stderr.")
        traceback.print_exc()
        return False
    except Exception as e:
        print(f"General Error in add_subtitles_to_video: {e}")
        traceback.print_exc()
        return False
    finally:
        # Clean up the temporary file if it still exists
        if os.path.exists(ffmpeg_processing_path):
            try:
                os.remove(ffmpeg_processing_path)
                print(f"Cleaned up temporary file: {ffmpeg_processing_path}")
            except OSError as e_remove:
                print(f"Error cleaning up temporary file {ffmpeg_processing_path}: {e_remove}")