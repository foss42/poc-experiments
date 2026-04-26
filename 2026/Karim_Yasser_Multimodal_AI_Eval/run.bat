@echo off
echo Starting AI API Evaluation Framework...

:: Check if Docker is running
docker info >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Docker is not running or not installed. Please start Docker and try again.
    exit /b 1
)

:: Start the containers in detached mode
echo Building and starting Docker containers...
docker-compose up -d --build

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to start containers. Check the docker-compose output above.
    exit /b 1
)

echo.
echo ==========================================================
echo   AI API Evaluation Framework is running!
echo.
echo   Frontend (Dashboard): http://localhost
echo   Backend (API):        http://localhost:8000
echo.
echo   To stop the framework, run: docker-compose down
echo ==========================================================
echo.
