# Python backend
FROM python:3.11-slim
WORKDIR /app

# Install pip dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend code
COPY backend /app

# Ensure persistent directories exist inside container
RUN mkdir -p /app/data /app/datasets

# Start the FastAPI server using uvicorn
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
