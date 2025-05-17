# Sử dụng Python 3.12 làm base image
FROM python:3.12

# Thiết lập các biến môi trường cơ bản
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    DEBIAN_FRONTEND=noninteractive

# Cài đặt các gói hệ thống cần thiết
RUN apt-get update && apt-get install -y \
    ffmpeg \
    imagemagick \
    libmagickwand-dev \
    default-libmysqlclient-dev \
    pkg-config \
    build-essential \
    fontconfig \
    fonts-noto-cjk \
    fonts-noto-core \
    fonts-noto-extra \
    fonts-freefont-ttf \
    fonts-liberation \
    fonts-dejavu-core \
    ccache \
    && rm -rf /var/lib/apt/lists/*

# Tạo thư mục làm việc
WORKDIR /app

# Copy requirements.txt trước để cài dependencies
COPY requirements.txt .

# Cài đặt các gói Python (bao gồm uvicorn[standard] để dùng --reload)
RUN pip install --no-cache-dir -r requirements.txt \
    && pip install "uvicorn[standard]"

# Thiết lập biến môi trường cho font - sử dụng DejaVu Sans làm font mặc định vì hỗ trợ nhiều ngôn ngữ
ENV FONT_PATH=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf

# Copy toàn bộ mã nguồn (tạm thời, nhưng sẽ mount ở ngoài trong dev)
COPY . .

# Tạo các thư mục tạm và cấp quyền truy cập
RUN mkdir -p tempvideo tempsrt tempaudio temp_thumbnails temp_processing \
    && chmod -R a+rwx tempvideo tempsrt tempaudio temp_thumbnails temp_processing

# Cấu hình ImageMagick
ENV IMAGEMAGICK_BINARY=/usr/bin/convert

# Làm mới cache font
RUN fc-cache -fv

# Mở cổng dịch vụ
EXPOSE 8000

# Lệnh mặc định: chạy uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
