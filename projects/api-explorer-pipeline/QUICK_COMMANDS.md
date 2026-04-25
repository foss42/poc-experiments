# 🚀 Quick Commands Reference

## Backend Commands

### Start Backend (Simple - No nodemon needed)

**Option 1: AI Agent Server (Port 3002)**
```bash
cd backend
node simple-server.js
```

**Option 2: Complete Server with Auth Filtering (Port 3001)**
```bash
cd backend
node server.js
```

**Option 3: Using npm scripts**
```bash
cd backend
npm start              # Starts simple-server.js on port 3002
npm run start:server   # Starts server.js on port 3001
```

### If you want auto-reload (optional)
```bash
cd backend
npm install            # Make sure nodemon is installed
npm run dev:watch      # Starts with nodemon
```

---

## Frontend Commands

```bash
cd frontend
python -m http.server 3001
```

Or if you have Python 3:
```bash
cd frontend
python3 -m http.server 3001
```

---

## Pipeline Commands

### Process APIs
```bash
cd pipeline
python batch_processor.py ../data --clear
```

### Process without clearing
```bash
cd pipeline
python batch_processor.py ../data
```

---

## Complete System Startup

### Option A: PowerShell Script (All at once)
```powershell
.\start-complete-system.ps1
```

### Option B: Manual (3 terminals)

**Terminal 1 - Backend:**
```bash
cd backend
node simple-server.js
```

**Terminal 2 - Frontend:**
```bash
cd frontend
python -m http.server 3001
```

**Terminal 3 - MCP Server (optional):**
```bash
cd mcp-server
npm start
```

---

## Testing Commands

### Test Backend
```bash
# Test simple-server (port 3002)
curl http://localhost:3002/

# Test server.js (port 3001)
curl http://localhost:3001/

# Get all APIs
curl http://localhost:3002/apis

# Filter by auth
curl http://localhost:3001/apis?auth=apiKey

# AI search
curl -X POST http://localhost:3002/agent/tools/search -H "Content-Type: application/json" -d "{\"query\":\"get users\"}"
```

### Test Frontend
Open browser: http://localhost:3001

---

## Troubleshooting

### "nodemon not found"
**Solution:** Don't use `npm run dev`, use:
```bash
node simple-server.js
```

### "Port already in use"
**Solution:** Kill the process or change port:
```bash
# Windows - Find process
netstat -ano | findstr :3002

# Kill process
taskkill /PID <PID> /F
```

### "Registry not found"
**Solution:** Run pipeline first:
```bash
cd pipeline
python batch_processor.py ../data --clear
```

---

## Access URLs

- **Frontend:** http://localhost:3001
- **Backend (AI Agent):** http://localhost:3002
- **Backend (Auth Filter):** http://localhost:3001 (if using server.js)

---

## Quick Fix for Your Error

Instead of:
```bash
npm run dev
```

Use:
```bash
npm start
```

Or directly:
```bash
node simple-server.js
```

Both will work without nodemon! 🚀
