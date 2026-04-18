@echo off
echo Quick Rebuilding AI API Evaluation Framework...

:: Check if Docker is running
docker info >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Docker is not running or not installed. Please start Docker and try again.
    exit /b 1
)

:: Enable Docker BuildKit to use advanced caching (--mount=type=cache)
set DOCKER_BUILDKIT=1
set COMPOSE_DOCKER_CLI_BUILD=1

set TARGET=%1
if "%TARGET%"=="" (
    echo Rebuilding ALL Docker containers using BuildKit cache...
    docker-compose up -d --build
) else (
    echo Rebuilding ONLY %TARGET% container using BuildKit cache...
    docker-compose up -d --build %TARGET%
)

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to rebuild container files. Check the docker-compose output above.
    exit /b 1
)

echo.
echo ==========================================================
echo   Rebuild Complete! Services are restarting.
echo.
echo   Frontend (Dashboard): http://localhost
echo   Backend (API):        http://localhost:8000
echo ==========================================================
echo.
