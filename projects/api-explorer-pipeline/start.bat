@echo off
REM API Explorer - Unified Startup Script
REM Starts Backend (port 3002) and Frontend (port 3001)

echo.
echo ========================================
echo   API Explorer - Unified Startup
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed.
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [1/2] Starting Backend on port 3002...
start "API Explorer Backend" cmd /k "cd backend && npm start"

timeout /t 3 /nobreak >nul

echo [2/2] Starting Frontend on port 3001...
start "API Explorer Frontend" cmd /k "cd frontend && npm start"

echo.
echo ========================================
echo   API Explorer is running!
echo ========================================
echo.
echo   Main App: http://localhost:3001
echo   Backend:  http://localhost:3002
echo.
echo Press any key to exit...
pause >nul
