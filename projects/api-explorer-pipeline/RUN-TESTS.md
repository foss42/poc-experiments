# How to Run Tests Locally

## 🪟 Windows (PowerShell)

```powershell
# Navigate to project directory
cd projects\api-explorer-pipeline

# Run the PowerShell test script
.\test-workflow-locally.ps1
```

## 🐧 Linux / macOS (Bash)

```bash
# Navigate to project directory
cd projects/api-explorer-pipeline

# Make script executable
chmod +x test-workflow-locally.sh

# Run the bash test script
./test-workflow-locally.sh
```

## 🔧 Manual Testing (Any Platform)

### 1. Validate Files

```powershell
# Check structure
Test-Path data, pipeline, backend, frontend, requirements.txt

# Validate JSON
python -m json.tool data\test_weather_api.json

# Validate YAML
python -c "import yaml; yaml.safe_load(open('data/sample_petstore.yaml'))"
```

### 2. Test Pipeline

```powershell
# Install dependencies
pip install -r requirements.txt

# Run batch processor
python pipeline\batch_processor.py data --clear

# Check registry
Test-Path registry\global_index.json
```

### 3. Test Backend

```powershell
# Install dependencies
cd backend
npm install

# Start server
node simple-server.js

# In another terminal, test endpoints
curl http://localhost:3002/
curl http://localhost:3002/apis
```

### 4. Test Frontend

```powershell
# Validate JavaScript
node -c frontend\script.js

# Check HTML
Select-String "API Explorer" frontend\index.html
```

## ⚠️ Common Issues

### Issue: "python not found"
**Solution:** Install Python 3.9+ from python.org

### Issue: "node not found"
**Solution:** Install Node.js 18+ from nodejs.org

### Issue: "pip not found"
**Solution:** 
```powershell
python -m ensurepip --upgrade
```

### Issue: "npm install fails"
**Solution:**
```powershell
cd backend
Remove-Item node_modules -Recurse -Force
Remove-Item package-lock.json
npm install
```

## ✅ Expected Output

When all tests pass, you should see:

```
🧪 Testing API Explorer Workflow Locally
========================================

📋 Step 1: Validate Files
==========================
✅ PASSED: Check data folder exists
✅ PASSED: Check pipeline folder exists
...

📊 Test Summary
===============
Passed: 25
Failed: 0

🎉 All tests passed! Ready to push to GitHub.
```

## 🚀 Next Steps

After all tests pass:

```powershell
# Add changes
git add .

# Commit
git commit -m "Update workflow and add tests"

# Push to GitHub
git push
```

Then check GitHub Actions to see the workflow run!
