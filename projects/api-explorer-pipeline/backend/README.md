# API Explorer Backend

Backend server for the API Explorer system with authentication filtering and AI agent integration.

## 🚀 Quick Start

### Prerequisites

Make sure you're in the backend directory:

```bash
cd /c/Users/YOUR_USERNAME/Documents/gsoc-poc/projects/api-explorer-pipeline/backend
```

### Install Dependencies

```bash
npm install
```

### Start Backend

**Option 1: Simple Server (Port 3002) - AI Agent**

```bash
node simple-server.js
```

**Option 2: Complete Server (Port 3001) - Auth Filtering**

```bash
node server.js
```

**Option 3: Development Mode (with auto-reload)**

```bash
npm run dev:watch
```

## 📡 Available Servers

### 1. simple-server.js (Port 3002)
**AI Agent Integration Server**

Endpoints:
- `GET /` - Server info
- `GET /apis` - List all APIs
- `GET /categories` - List categories
- `POST /agent/tools/search` - AI search
- `POST /agent/tools/list` - List APIs (MCP)
- `POST /agent/tools/execute` - Execute API (mock)

**Start:**
```bash
node simple-server.js
```

### 2. server.js (Port 3001)
**Complete Server with Authentication Filtering**

Endpoints:
- `GET /` - API documentation
- `GET /apis` - List all APIs (with filters)
  - `?auth=apiKey` - Filter by auth type
  - `?category=AI` - Filter by category
  - `?method=GET` - Filter by method
  - `?search=user` - Search APIs
- `GET /apis/:id` - Get specific API
- `GET /categories` - List categories
- `GET /auth-types` - List auth types
- `GET /stats` - API statistics
- `GET /health` - Health check

**Start:**
```bash
node server.js
```

## 🧪 Testing

### Test Simple Server (Port 3002)

**Terminal 1 - Start server:**

```bash
cd /c/Users/YOUR_USERNAME/Documents/gsoc-poc/projects/api-explorer-pipeline/backend
node simple-server.js
```

**Terminal 2 - Test it:**

```bash
# Test root endpoint
curl http://localhost:3002/

# Test AI search
curl -X POST http://localhost:3002/agent/tools/search \
  -H "Content-Type: application/json" \
  -d '{"query": "get users"}'
```

### Test Complete Server (Port 3001)

**Terminal 1 - Start server:**

```bash
cd /c/Users/YOUR_USERNAME/Documents/gsoc-poc/projects/api-explorer-pipeline/backend
node server.js
```

**Terminal 2 - Test it:**

```bash
# Test root endpoint
curl http://localhost:3001/

# Get all APIs
curl http://localhost:3001/apis

# Filter by auth type
curl http://localhost:3001/apis?auth=apiKey

# Filter by category
curl http://localhost:3001/apis?category=AI

# Search
curl http://localhost:3001/apis?search=user
```

## 📁 Files

- `server.js` - Complete server with authentication filtering (Port 3001)
- `simple-server.js` - AI agent integration server (Port 3002)
- `agent_tools.js` - AI logic and utilities
- `package.json` - Dependencies and scripts

## 🔧 Configuration

### Change Port
Edit the file and change:
```javascript
const PORT = process.env.PORT || 3002;
```

### Registry Path

The backend reads from:

```
../registry/global_index.json
```

Make sure to run the pipeline first:

```bash
cd /c/Users/YOUR_USERNAME/Documents/gsoc-poc/projects/api-explorer-pipeline
python pipeline/batch_processor.py data --clear
```

## 🐛 Troubleshooting

### "nodemon not found"
Install dependencies:
```bash
npm install
```

Or run without nodemon:
```bash
npm start
# or
node simple-server.js
```

### "Registry not found"

Run the pipeline to generate the registry:

```bash
cd /c/Users/YOUR_USERNAME/Documents/gsoc-poc/projects/api-explorer-pipeline
python pipeline/batch_processor.py data --clear
```

### "Port already in use"
Kill the process using the port:
```bash
# Windows
netstat -ano | findstr :3002
taskkill /PID <PID> /F

# Or change the port in the file
```

## 📊 Features

### Authentication Filtering
- Filter APIs by auth type (none, apiKey, bearer, oauth2)
- Tag APIs with auth metadata
- Return filtered API lists

### AI Agent Integration
- Natural language API search
- Intent extraction (GET, POST, PUT, DELETE)
- Entity extraction (users, pets, products)
- Template generation (curl, PowerShell)

### Category & Method Filtering
- Filter by category (AI, Finance, Weather, Social, General)
- Filter by HTTP method (GET, POST, PUT, DELETE)
- Search by name, description, tags

## 🚀 Production Deployment

For production, use:
```bash
npm start
```

Or with PM2:
```bash
npm install -g pm2
pm2 start simple-server.js --name api-explorer
pm2 start server.js --name api-explorer-auth
```

## 📝 License

MIT License - GSoC 2026 PoC
