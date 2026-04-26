# Local Workflow Test Script (PowerShell)
# Run this before pushing to GitHub to catch issues early

Write-Host "🧪 Testing API Explorer Workflow Locally" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Track results
$PASSED = 0
$FAILED = 0

# Test function
function Run-Test {
    param(
        [string]$TestName,
        [scriptblock]$TestCommand
    )
    
    Write-Host "Testing: $TestName" -ForegroundColor Yellow
    
    try {
        $result = & $TestCommand
        if ($LASTEXITCODE -eq 0 -or $result) {
            Write-Host "✅ PASSED: $TestName" -ForegroundColor Green
            $script:PASSED++
        } else {
            Write-Host "❌ FAILED: $TestName" -ForegroundColor Red
            $script:FAILED++
        }
    } catch {
        Write-Host "❌ FAILED: $TestName - $($_.Exception.Message)" -ForegroundColor Red
        $script:FAILED++
    }
    Write-Host ""
}

# 1. Validate Files
Write-Host "📋 Step 1: Validate Files" -ForegroundColor Cyan
Write-Host "==========================" -ForegroundColor Cyan

Run-Test "Check data folder exists" { Test-Path "data" }
Run-Test "Check pipeline folder exists" { Test-Path "pipeline" }
Run-Test "Check backend folder exists" { Test-Path "backend" }
Run-Test "Check frontend folder exists" { Test-Path "frontend" }
Run-Test "Check requirements.txt exists" { Test-Path "requirements.txt" }

# Validate JSON files
Write-Host "Validating JSON files..." -ForegroundColor Yellow
Get-ChildItem "data\*.json" -ErrorAction SilentlyContinue | ForEach-Object {
    Run-Test "Validate $($_.Name)" {
        python -m json.tool $_.FullName | Out-Null
        $LASTEXITCODE -eq 0
    }
}

# Validate YAML files
Write-Host "Validating YAML files..." -ForegroundColor Yellow
Get-ChildItem "data\*.yaml", "data\*.yml" -ErrorAction SilentlyContinue | ForEach-Object {
    Run-Test "Validate $($_.Name)" {
        python -c "import yaml; yaml.safe_load(open('$($_.FullName)', 'r', encoding='utf-8'))" 2>&1 | Out-Null
        $LASTEXITCODE -eq 0
    }
}

# 2. Test Pipeline
Write-Host ""
Write-Host "🔧 Step 2: Test Pipeline" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan

Run-Test "Install Python dependencies" {
    pip install -q -r requirements.txt 2>&1 | Out-Null
    $LASTEXITCODE -eq 0
}

Run-Test "Run batch processor" {
    python pipeline\batch_processor.py data --clear 2>&1 | Out-Null
    $LASTEXITCODE -eq 0
}

Run-Test "Check registry created" { Test-Path "registry\global_index.json" }

Run-Test "Validate registry JSON" {
    python -m json.tool registry\global_index.json | Out-Null
    $LASTEXITCODE -eq 0
}

# 3. Test Backend
Write-Host ""
Write-Host "🖥️  Step 3: Test Backend" -ForegroundColor Cyan
Write-Host "=======================" -ForegroundColor Cyan

Run-Test "Check package.json exists" { Test-Path "backend\package.json" }
Run-Test "Check simple-server.js exists" { Test-Path "backend\simple-server.js" }
Run-Test "Check agent_tools.js exists" { Test-Path "backend\agent_tools.js" }

# Check if node_modules exists
if (-not (Test-Path "backend\node_modules")) {
    Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
    Push-Location backend
    npm install 2>&1 | Out-Null
    Pop-Location
}

Run-Test "Validate JavaScript syntax" {
    node -c backend\simple-server.js 2>&1 | Out-Null
    $LASTEXITCODE -eq 0
}

# 4. Test Frontend
Write-Host ""
Write-Host "🌐 Step 4: Test Frontend" -ForegroundColor Cyan
Write-Host "=======================" -ForegroundColor Cyan

Run-Test "Check index.html exists" { Test-Path "frontend\index.html" }
Run-Test "Check script.js exists" { Test-Path "frontend\script.js" }
Run-Test "Check style.css exists" { Test-Path "frontend\style.css" }

Run-Test "Validate HTML content" {
    $content = Get-Content "frontend\index.html" -Raw
    $content -match "API Explorer"
}

Run-Test "Validate JavaScript syntax" {
    node -c frontend\script.js 2>&1 | Out-Null
    $LASTEXITCODE -eq 0
}

# 5. Summary
Write-Host ""
Write-Host "📊 Test Summary" -ForegroundColor Cyan
Write-Host "===============" -ForegroundColor Cyan
Write-Host "Passed: $PASSED" -ForegroundColor Green
Write-Host "Failed: $FAILED" -ForegroundColor Red
Write-Host ""

if ($FAILED -eq 0) {
    Write-Host "🎉 All tests passed! Ready to push to GitHub." -ForegroundColor Green
    exit 0
} else {
    Write-Host "❌ Some tests failed. Please fix before pushing." -ForegroundColor Red
    exit 1
}
