Write-Host "🚀 Starting API Explorer Complete System" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# Get the script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Check if Node.js is available
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js from https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Check if Python is available
try {
    $pythonVersion = python --version
    Write-Host "✅ Python version: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python not found. Please install Python from https://python.org" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📦 Checking backend dependencies..." -ForegroundColor Yellow
$backendPath = Join-Path $scriptDir "backend"
if (-not (Test-Path (Join-Path $backendPath "node_modules"))) {
    Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
    Push-Location $backendPath
    npm install
    Pop-Location
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install backend dependencies" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "🔧 Starting backend server on port 3002..." -ForegroundColor Yellow
$backendCmd = "Set-Location '$backendPath'; Write-Host '🚀 Backend Server Starting...' -ForegroundColor Green; Write-Host 'Directory: ' -NoNewline; Get-Location; node simple-server.js"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd

# Wait a moment for backend to start
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "🌐 Starting frontend server on port 3001..." -ForegroundColor Yellow
$frontendPath = Join-Path $scriptDir "frontend"
$frontendCmd = "Set-Location '$frontendPath'; Write-Host '🌐 Frontend Server Starting...' -ForegroundColor Green; Write-Host 'Directory: ' -NoNewline; Get-Location; node serve.js"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd

Write-Host ""
Write-Host "✅ System startup complete!" -ForegroundColor Green
Write-Host "🔗 Backend: http://localhost:3002" -ForegroundColor Cyan
Write-Host "🌐 Frontend: http://localhost:3001" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Note: Two new PowerShell windows should have opened." -ForegroundColor Yellow
Write-Host "   - One for the backend server (port 3002)" -ForegroundColor Yellow
Write-Host "   - One for the frontend server (port 3001)" -ForegroundColor Yellow
Write-Host ""
Write-Host "🛑 To stop: Close both PowerShell windows or press Ctrl+C in each" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press any key to exit this setup script..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")