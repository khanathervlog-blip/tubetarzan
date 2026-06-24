FROM python:3.11-slim

# System deps: ffmpeg, opencv, git (for cloning MuseTalk/Wav2Lip), build tools
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libopencv-dev \
    python3-opencv \
    git \
    wget \
    curl \
    cmake \
    build-essential \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies first (layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Clone Wav2Lip (CPU-capable fallback — always available)
RUN git clone --depth 1 https://github.com/Rudrabha/Wav2Lip /app/Wav2Lip || true
RUN cd /app/Wav2Lip && pip install --no-cache-dir -r requirements.txt || true

# Download Wav2Lip checkpoint (GAN version — better quality)
# If this URL changes, update manually and rebuild
RUN mkdir -p /app/Wav2Lip && \
    wget -q -O /app/Wav2Lip/wav2lip_gan.pth \
    "https://github.com/Rudrabha/Wav2Lip/releases/download/v1.0/wav2lip_gan.pth" || \
    echo "Wav2Lip checkpoint download failed — will fall back to ffmpeg merge"

# Clone MuseTalk (GPU, better quality — requires Railway Pro with GPU)
RUN git clone --depth 1 https://github.com/TMElyralab/MuseTalk /app/MuseTalk || true
RUN cd /app/MuseTalk && pip install --no-cache-dir -r requirements.txt || true

# Copy service code
COPY . .

EXPOSE 8000

CMD ["python", "main.py"]
