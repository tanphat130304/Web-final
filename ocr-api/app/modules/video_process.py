import time
import pysrt
import difflib
import cv2
import re
from moviepy.video.io.VideoFileClip import VideoFileClip
from paddleocr import PaddleOCR
import google.generativeai as genai
import ffmpeg
import boto3
import os
from app.core.config import get_settings
from app.modules.s3_process import download_file_from_s3, upload_file_to_s3, delete_file_from_s3, replace_file_on_s3
from app.modules.module.module_text_to_speech_v2 import generate_audio_from_srt
from app.modules.module.module_meger_video_v2 import process_video_with_sync
from app.modules.module.module_meger_video_with_srt_translate import add_subtitles_to_video
from fastapi import HTTPException
import numpy as np
from langdetect import detect



# Cấu hình API Gemini
genai.configure(api_key=get_settings().API_KEY)
model = genai.GenerativeModel(get_settings().API_MODEL)



ocr = PaddleOCR(use_angle_cls=True, lang='en', det_db_thresh=0.2, det_db_box_thresh=0.5)

# Try to run a dummy OCR process to ensure models are downloaded
try:
    # Create a small dummy black image
    dummy_image = np.zeros((100, 100, 3), dtype=np.uint8)
    ocr.ocr(dummy_image, cls=True) # Explicitly use cls to trigger classifier download
    print("PaddleOCR models initialized and checked successfully.")
except Exception as e:
    print(f"Error during PaddleOCR model initialization check: {e}")

def format_timestamp(seconds):
    """Chuyển đổi giây thành định dạng SRT (hh:mm:ss,ms)"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds * 1000) % 1000)
    return f"{hours:02}:{minutes:02}:{secs:02},{millis:03}"

def detect_ocr_language(video_path, num_samples=5):
    """Lấy mẫu text từ một số frame đầu và nhận diện ngôn ngữ."""
    clip = VideoFileClip(video_path)
    frames = []
    for i, frame in enumerate(clip.iter_frames(fps=clip.fps, dtype='uint8')):
        if i >= num_samples:
            break
        frames.append(frame)
    clip.close()

    # Chạy OCR thử với các model phổ biến
    ocr_en = PaddleOCR(use_angle_cls=True, lang='en')
    ocr_ch = PaddleOCR(use_angle_cls=True, lang='ch')
    ocr_jp = PaddleOCR(use_angle_cls=True, lang='japan')
    ocr_kr = PaddleOCR(use_angle_cls=True, lang='korean')
    texts = []
    for frame in frames:
        for ocr, lang in [(ocr_ch, 'ch'), (ocr_jp, 'japan'), (ocr_kr, 'korean'), (ocr_en, 'en')]:
            result = ocr.ocr(frame)
            text = " ".join([line[1][0] for line in result[0]]) if result and result[0] else ""
            if text:
                texts.append((lang, text))
    # Ưu tiên nếu có ký tự unicode đặc trưng
    for lang, text in texts:
        if re.search(r'[\u4e00-\u9fff]', text):
            return 'ch'
        if re.search(r'[\u3040-\u30ff]', text):
            return 'japan'
        if re.search(r'[\uac00-\ud7af]', text):
            return 'korean'
    # Nếu không, dùng langdetect
    all_text = " ".join([t for _, t in texts])
    try:
        lang = detect(all_text)
        if lang == 'vi':
            return 'vi'
        if lang == 'en':
            return 'en'
    except:
        pass
    return 'en'  # fallback

def extract_subtitles(video_path, output_srt):
    """Tự động nhận diện ngôn ngữ OCR và trích xuất phụ đề."""
    # 1. Nhận diện ngôn ngữ
    ocr_lang = detect_ocr_language(video_path)
    print(f"[Auto OCR] Đã nhận diện ngôn ngữ: {ocr_lang}")
    ocr = PaddleOCR(use_angle_cls=True, lang=ocr_lang, det_db_thresh=0.2, det_db_box_thresh=0.5)

    clip = VideoFileClip(video_path)
    try:
        fps = clip.fps
        subtitles = []
        prev_text = ""
        start_time = 0.0
        min_length = 3
        similarity_threshold = 0.8
        frame_skip = 5  # Bỏ qua 5 frame để tối ưu OCR

        # Create tempsrt directory if it doesn't exist
        os.makedirs("tempsrt", exist_ok=True)
        
        # Tao ten moi cho file output
        base_name = os.path.splitext(os.path.basename(output_srt))[0]
        counter = 1
        temp_srt = output_srt
        while os.path.exists(os.path.join("tempsrt", temp_srt)):
            temp_srt = f"{counter}_{base_name}.srt"
            counter += 1

        # Create temporary file in current directory
        temp_file = "temp_" + os.path.basename(temp_srt)
        final_path = os.path.join("tempsrt", os.path.basename(temp_srt))
        
        with open(temp_file, 'w', encoding='utf-8') as srt_file:
            for frame_number, frame in enumerate(clip.iter_frames(fps=fps, dtype='uint8')):
                if frame_number % frame_skip != 0:
                    continue
                gray = cv2.cvtColor(frame, cv2.COLOR_RGB2GRAY)
                result = ocr.ocr(gray)
                current_text = " ".join([line[1][0] for line in result[0] if len(line) > 1 and line[1][0].strip()]) if result and result[0] else ""
                if len(current_text) < min_length:
                    continue
                current_time = frame_number / fps
                if difflib.SequenceMatcher(None, current_text, prev_text).ratio() < similarity_threshold:
                    if prev_text:
                        subtitles.append((format_timestamp(start_time), format_timestamp(current_time), prev_text))
                    start_time = current_time
                    prev_text = current_text
            if prev_text:
                subtitles.append((format_timestamp(start_time), format_timestamp(clip.duration), prev_text))
            for i, (start, end, text) in enumerate(subtitles):
                srt_file.write(f"{i + 1}\n")
                srt_file.write(f"{start} --> {end}\n")
                srt_file.write(f"{text}\n\n")
        # Ensure temp file exists before moving
        if os.path.exists(temp_file):
            os.rename(temp_file, final_path)
            return final_path
        else:
            with open(final_path, 'w', encoding='utf-8') as srt_file:
                srt_file.write("1\n00:00:00,000 --> 00:00:05,000\nNo subtitles detected\n\n")
            return final_path
    finally:
        clip.close()

def batch_translate_text(text_list, source_lang="auto", batch_size=20):
    """
    Dịch danh sách phụ đề sang tiếng Việt, xử lý theo batch để tránh vượt giới hạn prompt.
    """
    if not text_list:
        return text_list

    def parse_numbered_lines(lines):
        result = {}
        for line in lines:
            match = re.match(r"(\d+)\.\s*(.*)", line)
            if match:
                idx, txt = int(match.group(1)), match.group(2)
                result[idx] = txt
        return result

    translated_result = []

    for i in range(0, len(text_list), batch_size):
        sublist = text_list[i:i+batch_size]
        formatted_text = "\n".join(f"{j+1}. {text}" for j, text in enumerate(sublist))

        prompt_vi = f"""
Bạn là chuyên gia dịch thuật. Hãy dịch từng câu sau từ {source_lang} sang tiếng Việt tự nhiên, giữ nguyên số thứ tự.
Nếu không dịch được, hãy giữ nguyên nội dung gốc. Chỉ trả về phần dịch, không bao gồm câu gốc, không giải thích.

{formatted_text}
"""
        try:
            response_vi = model.generate_content(prompt_vi)
            vi_lines = response_vi.text.strip().split("\n")
            vi_dict = parse_numbered_lines(vi_lines)
            translated_texts = [vi_dict.get(j+1, sublist[j]) for j in range(len(sublist))]

            # Nếu dịch được tiếng Việt hợp lệ thì thêm vào kết quả
            if is_valid_vietnamese(translated_texts):
                translated_result.extend(translated_texts)
                continue

            # Nếu không, fallback: dịch sang tiếng Anh
            prompt_en = f"""
Bạn là chuyên gia dịch thuật. Hãy dịch từng câu sau từ {source_lang} sang tiếng Anh tự nhiên, giữ nguyên số thứ tự.
Nếu không dịch được, hãy giữ nguyên nội dung gốc. Chỉ trả về phần dịch, không bao gồm câu gốc, không giải thích.

{formatted_text}
"""
            response_en = model.generate_content(prompt_en)
            en_lines = response_en.text.strip().split("\n")
            en_dict = parse_numbered_lines(en_lines)
            english_texts = [en_dict.get(j+1, sublist[j]) for j in range(len(sublist))]

            # Dịch từ tiếng Anh sang tiếng Việt
            formatted_english = "\n".join(f"{j+1}. {text}" for j, text in enumerate(english_texts))
            prompt_en2vi = f"""
Bạn là chuyên gia dịch thuật. Hãy dịch từng câu sau từ tiếng Anh sang tiếng Việt tự nhiên, giữ nguyên số thứ tự.
Nếu không dịch được, hãy giữ nguyên nội dung gốc. Chỉ trả về phần dịch, không bao gồm câu gốc, không giải thích.

{formatted_english}
"""
            response_en2vi = model.generate_content(prompt_en2vi)
            vi2_lines = response_en2vi.text.strip().split("\n")
            vi2_dict = parse_numbered_lines(vi2_lines)
            translated_texts = [vi2_dict.get(j+1, english_texts[j]) for j in range(len(english_texts))]

            translated_result.extend(translated_texts)

        except Exception as e:
            print(f"Lỗi dịch batch từ dòng {i}: {e}")
            translated_result.extend(sublist)  # fallback giữ nguyên

    return translated_result


def translate_srt(input_srt, output_srt):
    """Dịch file SRT bằng cách gửi toàn bộ nội dung lên API một lần"""
    try:
        # Create tempsrt directory if it doesn't exist
        os.makedirs("tempsrt", exist_ok=True)
        
        # Ensure output_srt is a full path
        if not os.path.dirname(output_srt):
            output_srt = os.path.join("tempsrt", output_srt)
        
        # Generate unique filename
        base_name = os.path.splitext(os.path.basename(output_srt))[0]
        counter = 1
        temp_srt = os.path.basename(output_srt)
        while os.path.exists(os.path.join("tempsrt", temp_srt)):
            temp_srt = f"{counter}_{base_name}.srt"
            counter += 1
        
        # Create a temporary file path
        temp_file = os.path.join("tempsrt", f"temp_{temp_srt}")
        
        # Check if input file exists
        if not os.path.exists(input_srt):
            # Create a default subtitle file
            with open(output_srt, 'w', encoding='utf-8') as srt_file:
                srt_file.write("1\n00:00:00,000 --> 00:00:05,000\nNo subtitles available\n\n")
            return output_srt
        
        # Read and translate subtitles
        subs = pysrt.open(input_srt, encoding='utf-8')
        texts_to_translate = [sub.text for sub in subs]
        
        if not texts_to_translate:
            # Create a default subtitle file if no text to translate
            with open(output_srt, 'w', encoding='utf-8') as srt_file:
                srt_file.write("1\n00:00:00,000 --> 00:00:05,000\nNo subtitles to translate\n\n")
            return output_srt
            
        translated_texts = batch_translate_text(texts_to_translate)

        # Write translated subtitles to output file
        with open(output_srt, 'w', encoding='utf-8') as srt_file:
            for i, sub in enumerate(subs):
                srt_file.write(f"{sub.index}\n")
                srt_file.write(f"{sub.start} --> {sub.end}\n")
                srt_file.write(f"{translated_texts[i]}\n\n")

        return output_srt
            
    except Exception as e:
        print(f"Error in translate_srt: {e}")
        # Create a default subtitle file in case of error
        try:
            with open(output_srt, 'w', encoding='utf-8') as srt_file:
                srt_file.write("1\n00:00:00,000 --> 00:00:05,000\nTranslation error occurred\n\n")
            return output_srt
        except:
            raise


def compress_file(video_path: str, output_path: str, crf: int = 23, preset: str = 'fast') -> bool:
    try:
        # Tạo thư mục output nếu chưa tồn tại
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        #  Tao ten mới cho file output
        basename, ext = os.path.splitext(os.path.basename(output_path))
        new_filename = basename + "_compressed" + ext
        output_path = os.path.join(os.path.dirname(output_path), new_filename)
        
        # Cấu hình ffmpeg
        stream = ffmpeg.input(video_path)
        stream = ffmpeg.output(
            stream,
            output_path,
            vcodec='libx264',      # Codec video
            acodec='aac',          # Codec audio
            crf=crf,               # Chất lượng video
            preset=preset,         # Tốc độ nén
            movflags='+faststart', # Tối ưu cho streaming
            threads=0,             # Sử dụng tất cả CPU cores
            **{'b:v': '2M'}        # Bitrate video
        )
        
        # Chạy ffmpeg
        ffmpeg.run(stream, overwrite_output=True, capture_stdout=True, capture_stderr=True)
        
        return True
    except ffmpeg.Error:
        return False
    except Exception:
        return False


def uncompressed_file(video_path: str, output_path: str) -> bool:
    try:
        # Tạo thư mục output nếu chưa tồn tại
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        #  Tao ten mới cho file output
        basename, ext = os.path.splitext(os.path.basename(output_path))
        new_filename = basename + "_uncompressed" + ext
        output_path = os.path.join(os.path.dirname(output_path), new_filename)
        
        # Cấu hình ffmpeg
        stream = ffmpeg.input(video_path)
        stream = ffmpeg.output(
            stream,
            output_path,
            vcodec='copy',      # Codec video
            acodec='copy',      # Codec audio
            **{'b:v': '2M'}     # Bitrate video
        )
        
        # Chạy ffmpeg
        ffmpeg.run(stream, overwrite_output=True, capture_stdout=True, capture_stderr=True)
        
        return True
    except ffmpeg.Error:
        return False
    except Exception:
        return False
    

def tts_and_process_video(voice_choice, selected_video):

    voice = "vi-VN-NamMinhNeural" if voice_choice == "2" else "vi-VN-HoaiMyNeural"

    #  Duong dan luu video va phu de da sub
    local_video_path = os.path.join("tempvideo", selected_video['file_name'])
    local_subtitle_path = os.path.join("tempsrt", f"{selected_video['file_name'].split('.')[0]}.srt")

    # Tạo TTS từ phụ đề đã sub
    os.makedirs("tempsound", exist_ok=True)

    tts_audio_path = os.path.join("tempsound", f"tts_audio_{selected_video['video_id']}.mp3")
    tts_audio_path = generate_audio_from_srt(local_subtitle_path, "tempvideo", voice)

    if not tts_audio_path or not os.path.exists(tts_audio_path):
        print(f"Không thể tạo âm thanh từ phụ đề, file không tồn tại: {tts_audio_path}")
        return

    # Đường dẫn cho các file xử lý video
    adjusted_audio_path = os.path.join("tempvideo", f"adjusted_audio_{selected_video['video_id']}.mp3")
    output_srt_path = os.path.join("tempvideo", f"adjusted_{selected_video['video_id']}.srt")
    final_video_path = os.path.join("tempvideo", f"final_{selected_video['file_name']}")

    # Ghép âm thanh vào video
    process_video_with_sync(
        audio_file=tts_audio_path,  # File TTS gốc
        video_file=local_video_path,
        srt_file=local_subtitle_path,
        output_audio=adjusted_audio_path,
        output_srt=output_srt_path,
        output_video=final_video_path
    )

    if not os.path.exists(final_video_path):
        print(f"Không thể xử lý video: {final_video_path}")
        return

    # Tải video đã xử lý lên S3 bucket `video-sub`
    processed_filename = os.path.basename(final_video_path)
    processed_s3_url = upload_file_to_s3(final_video_path, get_settings().AWS_BUCKET_TEST , processed_filename)

    # Xóa các file tạm
    os.remove(tts_audio_path)
    os.remove(adjusted_audio_path)  
    os.remove(output_srt_path)
    os.remove(final_video_path)

    return processed_s3_url

def is_valid_vietnamese(texts):
    # Kiểm tra có ký tự tiếng Việt
    vietnamese_chars = "ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ"
    
    # Ít nhất 40% số dòng phải chứa ký tự tiếng Việt để coi là hợp lệ
    valid_lines = 0
    for text in texts:
        if any(char.lower() in vietnamese_chars for char in text):
            valid_lines += 1
    
    return valid_lines / len(texts) >= 0.4 if texts else False

