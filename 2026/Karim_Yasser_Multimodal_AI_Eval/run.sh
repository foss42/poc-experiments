#!/bin/bash

# Exit on any error
set -e

echo "Starting AI API Evaluation Framework..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "[ERROR] Docker is not running or not installed. Please start Docker and try again."
  exit 1
fi

# Start the containers in detached mode
echo "Building and starting Docker containers..."
docker-compose up -d --build

echo ""
echo "=========================================================="
echo "  AI API Evaluation Framework is running!"
echo ""
echo "  Frontend (Dashboard): http://localhost"
echo "  Backend (API):        http://localhost:8000"
echo ""
echo "  To stop the framework, run: docker-compose down"
echo "=========================================================="
echo ""
