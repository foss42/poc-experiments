#!/bin/bash

# Local Workflow Test Script
# Run this before pushing to GitHub to catch issues early

set -e  # Exit on error

echo "🧪 Testing API Explorer Workflow Locally"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track results
PASSED=0
FAILED=0

# Test function
run_test() {
    local test_name=$1
    local test_command=$2
    
    echo -e "${YELLOW}Testing: $test_name${NC}"
    
    if eval "$test_command"; then
        echo -e "${GREEN}✅ PASSED: $test_name${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}❌ FAILED: $test_name${NC}"
        FAILED=$((FAILED + 1))
    fi
    echo ""
}

# 1. Validate Files
echo "📋 Step 1: Validate Files"
echo "=========================="

run_test "Check data folder exists" "[ -d data ]"
run_test "Check pipeline folder exists" "[ -d pipeline ]"
run_test "Check backend folder exists" "[ -d backend ]"
run_test "Check frontend folder exists" "[ -d frontend ]"
run_test "Check requirements.txt exists" "[ -f requirements.txt ]"

# Validate JSON files
echo "Validating JSON files..."
for file in data/*.json; do
    if [ -f "$file" ]; then
        run_test "Validate $(basename $file)" "python -m json.tool $file > /dev/null 2>&1"
    fi
done

# Validate YAML files
echo "Validating YAML files..."
for file in data/*.yaml data/*.yml; do
    if [ -f "$file" ]; then
        run_test "Validate $(basename $file)" "python -c \"import yaml; yaml.safe_load(open('$file', 'r', encoding='utf-8'))\" 2>&1"
    fi
done

# 2. Test Pipeline
echo ""
echo "🔧 Step 2: Test Pipeline"
echo "========================"

run_test "Install Python dependencies" "pip install -q -r requirements.txt"
run_test "Run batch processor" "python pipeline/batch_processor.py data --clear > /dev/null 2>&1"
run_test "Check registry created" "[ -f registry/global_index.json ]"
run_test "Validate registry JSON" "python -m json.tool registry/global_index.json > /dev/null 2>&1"

# 3. Test Backend
echo ""
echo "🖥️  Step 3: Test Backend"
echo "======================="

run_test "Check package.json exists" "[ -f backend/package.json ]"
run_test "Check simple-server.js exists" "[ -f backend/simple-server.js ]"
run_test "Check agent_tools.js exists" "[ -f backend/agent_tools.js ]"

# Check if node_modules exists
if [ ! -d "backend/node_modules" ]; then
    echo "Installing backend dependencies..."
    (cd backend && npm install > /dev/null 2>&1)
fi

run_test "Validate JavaScript syntax" "node -c backend/simple-server.js"

# 4. Test Frontend
echo ""
echo "🌐 Step 4: Test Frontend"
echo "======================="

run_test "Check index.html exists" "[ -f frontend/index.html ]"
run_test "Check script.js exists" "[ -f frontend/script.js ]"
run_test "Check style.css exists" "[ -f frontend/style.css ]"
run_test "Validate HTML content" "grep -q 'API Explorer' frontend/index.html"
run_test "Validate JavaScript syntax" "node -c frontend/script.js"

# 5. Summary
echo ""
echo "📊 Test Summary"
echo "==============="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! Ready to push to GitHub.${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Please fix before pushing.${NC}"
    exit 1
fi
