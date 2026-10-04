FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for OpenCV and image processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install lightweight PyTorch CPU first
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Copy dependencies and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files and model
COPY main.py .
COPY best_v5.pt .
RUN cp best_v5.pt best_v3.pt && cp best_v5.pt best.pt

# Set environment defaults
ENV MODEL_PATH=best_v5.pt
ENV PORT=7860
ENV PYTHONUNBUFFERED=1

EXPOSE 7860

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
