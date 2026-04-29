#!/bin/bash

# API Explorer - Unified Startup Script
# Starts Backend (port 3002) and Frontend (port 3001)

echo "🚀 Starting API Explorer..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start Backend
echo "📡 Starting Backend (port 3002)..."
cd backend
npm start &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 3

# Start Frontend
echo "🌐 Starting Frontend (port 3001)..."
cd frontend
npm start &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ API Explorer is running!"
echo ""
echo "📍 Access Points:"
echo "   • Main App: http://localhost:3001"
echo "   • Backend:  http://localhost:3002"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Wait for processes
wait
