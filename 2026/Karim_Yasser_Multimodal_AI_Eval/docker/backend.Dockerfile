# Python backend
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies required for building pip packages and pdf processing
RUN apt-get update && apt-get install -y \
    build-essential \
    gcc \
    g++ \
    poppler-utils \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install pip dependencies
COPY backend/requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip pip install -r requirements.txt

# Copy the backend code
COPY backend /app

# Ensure persistent directories exist inside container
RUN mkdir -p /app/data /app/datasets

# Start the FastAPI server using uvicorn
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
