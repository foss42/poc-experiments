# GitHub Workflow - PROJECT_DIR Configuration Guide

**Date:** April 26, 2026  
**Issue:** Understanding and configuring PROJECT_DIR correctly  

---

## Current Status: ✅ YOUR CONFIGURATION IS CORRECT

Your files are located in: `projects/api-explorer-pipeline/`  
Your workflow uses: `PROJECT_DIR: projects/api-explorer-pipeline`  

**This is CORRECT!** ✅

---

## Project Structure Verification

### Your Actual Structure:
```
gsoc-poc/                           ← Repository root
├── .github/
│   └── workflows/
│       └── main.yml
├── projects/
│   └── api-explorer-pipeline/      ← PROJECT_DIR points here ✅
│       ├── data/                   ← Files are HERE
│       ├── frontend/               ← Files are HERE
│       ├── backend/                ← Files are HERE
│       ├── pipeline/               ← Files are HERE
│       └── requirements.txt        ← Files are HERE
└── .gitignore
```

### Current Workflow Configuration:
```yaml
env:
  PYTHON_VERSION: "3.9"
  NODE_VERSION: "18"
  PROJECT_DIR: projects/api-explorer-pipeline  ✅ CORRECT
```

---

## Why You Might See Errors

If you're seeing "No such file or directory" errors, it's **NOT** because of wrong PROJECT_DIR. 

Possible causes:

### 1. Working Directory Not Set
Some steps might be missing `working-directory`:

```yaml
# ❌ WRONG - No working directory
- name: Some step
  run: |
    ls data/  # This looks in root, not PROJECT_DIR

# ✅ CORRECT - With working directory
- name: Some step
  working-directory: ${{ env.PROJECT_DIR }}
  run: |
    ls data/  # This looks in projects/api-explorer-pipeline/data/
```

### 2. Checkout Step Missing
Workflow must checkout code first:

```yaml
steps:
  - name: Checkout code
    uses: actions/checkout@v4  # ✅ Must be first
  
  - name: Do something
    working-directory: ${{ env.PROJECT_DIR }}
    run: ls data/
```

### 3. Path Issues in Commands
Some commands might use absolute paths incorrectly:

```yaml
# ❌ WRONG
run: cd /data && ls

# ✅ CORRECT
working-directory: ${{ env.PROJECT_DIR }}
run: ls data/
```

---

## Two Scenarios Explained

### Scenario A: Files in Subdirectory (YOUR CASE ✅)

**Structure:**
```
repo/
└── projects/
    └── api-explorer-pipeline/
        ├── data/
        ├── frontend/
        └── backend/
```

**Configuration:**
```yaml
env:
  PROJECT_DIR: projects/api-explorer-pipeline  ✅
```

**Usage:**
```yaml
- name: Test
  working-directory: ${{ env.PROJECT_DIR }}
  run: ls data/  # Looks in projects/api-explorer-pipeline/data/
```

---

### Scenario B: Files in Root (NOT YOUR CASE)

**Structure:**
```
repo/
├── data/
├── frontend/
└── backend/
```

**Configuration:**
```yaml
env:
  PROJECT_DIR: .  # Root directory
```

**Usage:**
```yaml
- name: Test
  working-directory: ${{ env.PROJECT_DIR }}
  run: ls data/  # Looks in data/
```

---

## How to Verify Your Structure

### Command 1: Check from Repository Root
```bash
cd /c/Users/dell/Documents/gsoc-poc

# Check if files are in root
ls -la data/ 2>/dev/null && echo "✅ Files in ROOT" || echo "❌ Not in root"

# Check if files are in subdirectory
ls -la projects/api-explorer-pipeline/data/ 2>/dev/null && echo "✅ Files in SUBDIRECTORY" || echo "❌ Not in subdirectory"
```

### Command 2: Full Structure Check
```bash
cd /c/Users/dell/Documents/gsoc-poc

echo "=== Checking Root ==="
[ -d "data" ] && echo "✅ data/ in root" || echo "❌ data/ not in root"
[ -d "frontend" ] && echo "✅ frontend/ in root" || echo "❌ frontend/ not in root"
[ -d "backend" ] && echo "✅ backend/ in root" || echo "❌ backend/ not in root"

echo ""
echo "=== Checking Subdirectory ==="
[ -d "projects/api-explorer-pipeline/data" ] && echo "✅ data/ in subdirectory" || echo "❌ data/ not in subdirectory"
[ -d "projects/api-explorer-pipeline/frontend" ] && echo "✅ frontend/ in subdirectory" || echo "❌ frontend/ not in subdirectory"
[ -d "projects/api-explorer-pipeline/backend" ] && echo "✅ backend/ in subdirectory" || echo "❌ backend/ not in subdirectory"
```

**Your Expected Output:**
```
=== Checking Root ===
❌ data/ not in root
❌ frontend/ not in root
❌ backend/ not in root

=== Checking Subdirectory ===
✅ data/ in subdirectory
✅ frontend/ in subdirectory
✅ backend/ in subdirectory
```

This confirms: **PROJECT_DIR: projects/api-explorer-pipeline** is correct! ✅

---

## If You Want to Move Files to Root

If you prefer to have files in root directory instead:

### Step 1: Move Files
```bash
cd /c/Users/dell/Documents/gsoc-poc

# Move all project files to root
mv projects/api-explorer-pipeline/* .
mv projects/api-explorer-pipeline/.* . 2>/dev/null

# Remove empty directory
rmdir projects/api-explorer-pipeline
rmdir projects
```

### Step 2: Update Workflow
```yaml
env:
  PYTHON_VERSION: "3.9"
  NODE_VERSION: "18"
  PROJECT_DIR: .  # Changed from projects/api-explorer-pipeline
```

### Step 3: Update All Paths
No other changes needed if all steps use `working-directory: ${{ env.PROJECT_DIR }}`

---

## Common Workflow Patterns

### Pattern 1: Using PROJECT_DIR (Recommended ✅)
```yaml
env:
  PROJECT_DIR: projects/api-explorer-pipeline

jobs:
  test:
    steps:
      - uses: actions/checkout@v4
      
      - name: Install dependencies
        working-directory: ${{ env.PROJECT_DIR }}
        run: pip install -r requirements.txt
      
      - name: Run tests
        working-directory: ${{ env.PROJECT_DIR }}
        run: python pipeline/batch_processor.py data
```

### Pattern 2: Without PROJECT_DIR (If files in root)
```yaml
jobs:
  test:
    steps:
      - uses: actions/checkout@v4
      
      - name: Install dependencies
        run: pip install -r requirements.txt
      
      - name: Run tests
        run: python pipeline/batch_processor.py data
```

---

## Debugging Workflow Errors

### Add Debug Step
Add this to your workflow to see actual structure:

```yaml
- name: Debug - Show directory structure
  run: |
    echo "=== Current Directory ==="
    pwd
    
    echo ""
    echo "=== Root Contents ==="
    ls -la
    
    echo ""
    echo "=== Projects Directory ==="
    ls -la projects/ 2>/dev/null || echo "No projects/ directory"
    
    echo ""
    echo "=== PROJECT_DIR Contents ==="
    ls -la ${{ env.PROJECT_DIR }} 2>/dev/null || echo "PROJECT_DIR not found"
    
    echo ""
    echo "=== Data Directory Check ==="
    ls -la ${{ env.PROJECT_DIR }}/data/ 2>/dev/null || echo "data/ not found"
```

### Expected Output (Your Case):
```
=== Current Directory ===
/home/runner/work/gsoc-poc/gsoc-poc

=== Root Contents ===
drwxr-xr-x .github
drwxr-xr-x projects
-rw-r--r-- .gitignore

=== Projects Directory ===
drwxr-xr-x api-explorer-pipeline

=== PROJECT_DIR Contents ===
drwxr-xr-x data
drwxr-xr-x frontend
drwxr-xr-x backend
drwxr-xr-x pipeline
-rw-r--r-- requirements.txt

=== Data Directory Check ===
-rw-r--r-- minimal_openapi.json
-rw-r--r-- test_ai_api.json
...
```

---

## Recommendation

**DO NOT CHANGE PROJECT_DIR** ✅

Your current configuration is correct:
```yaml
env:
  PROJECT_DIR: projects/api-explorer-pipeline
```

If you're seeing errors, the issue is likely:
1. Missing `working-directory` in some steps
2. Missing `actions/checkout@v4` step
3. Incorrect paths in commands

Check the workflow file to ensure all steps that access project files have:
```yaml
working-directory: ${{ env.PROJECT_DIR }}
```

---

## Verification Checklist

Run this locally to confirm your structure:

```bash
cd /c/Users/dell/Documents/gsoc-poc

# 1. Verify PROJECT_DIR exists
[ -d "projects/api-explorer-pipeline" ] && echo "✅ PROJECT_DIR correct" || echo "❌ PROJECT_DIR wrong"

# 2. Verify all required directories
for dir in data frontend backend pipeline registry apis; do
  [ -d "projects/api-explorer-pipeline/$dir" ] && echo "✅ $dir/ exists" || echo "❌ $dir/ missing"
done

# 3. Verify required files
for file in requirements.txt; do
  [ -f "projects/api-explorer-pipeline/$file" ] && echo "✅ $file exists" || echo "❌ $file missing"
done

# 4. Count data files
echo "Data files: $(ls -1 projects/api-explorer-pipeline/data/*.{json,yaml,yml} 2>/dev/null | wc -l)"
```

**Expected Output:**
```
✅ PROJECT_DIR correct
✅ data/ exists
✅ frontend/ exists
✅ backend/ exists
✅ pipeline/ exists
✅ registry/ exists
✅ apis/ exists
✅ requirements.txt exists
Data files: 13
```

---

## Summary

| Aspect | Status | Value |
|--------|--------|-------|
| **Your File Location** | ✅ | `projects/api-explorer-pipeline/` |
| **Current PROJECT_DIR** | ✅ | `projects/api-explorer-pipeline` |
| **Configuration** | ✅ | **CORRECT - DO NOT CHANGE** |
| **Workflow Steps** | ⚠️ | Ensure all have `working-directory` |

**Action Required:** None for PROJECT_DIR. Check workflow steps have correct `working-directory`.

---

*Last updated: April 26, 2026*
