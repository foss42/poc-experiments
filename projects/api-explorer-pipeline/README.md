# API Explorer - AI-Powered API Discovery & Execution

> GSoC 2025 Project - Interactive API documentation with AI agent integration

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ installed
- Python 3.8+ (for pipeline processing)
- npm or yarn package manager

### Installation

```bash
# Install backend dependencies
cd backend
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### Running the Application

```bash
# Linux/Mac
./start.sh

# Windows
start.bat
```

This starts:
- ✅ Backend API (port 3002)
- ✅ Frontend UI (port 3001)

## 🌐 Access Points

| Component | URL | Description |
|-----------|-----|-------------|
| **Main App** | http://localhost:3001 | Full UI with AI agent |
| **Backend API** | http://localhost:3002 | REST API endpoints |
| **PoC Demo** | http://localhost:3003 | Minimal standalone demo |

## ✨ Features

### 🤖 AI Agent (MCP-Style)
- Natural language API discovery
- Intent detection (GET/POST/PUT/DELETE)
- Confidence scoring with breakdown
- Real API execution
- Image preview support
- Multi-language code generation

### 📚 API Explorer
- Browse 19+ APIs
- Filter by category, auth type
- View endpoints and documentation
- Generate curl & PowerShell templates
- Interactive API testing

### 🎯 Semantic Search
- Keyword-based matching
- Confidence scoring
- Alternative suggestions
- Context-aware results

## ⚙️ Pipeline & Registry

### What is the Pipeline?

The **pipeline** is an **OFFLINE preprocessing system** that converts OpenAPI specifications into an optimized registry format for fast runtime queries.

```
┌─────────────────────────────────────────────────────────┐
│                    OFFLINE PROCESS                       │
│  (Run once when adding new APIs)                        │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
    ┌──────────────────────────────────────┐
    │  OpenAPI Specs (YAML/JSON)           │
    │  - apis/*/openapi.json               │
    │  - pipeline/source_data/*.json       │
    └──────────────────────────────────────┘
                           │
                           ▼
    ┌──────────────────────────────────────┐
    │  Pipeline Processing                  │
    │  - parser.py: Parse OpenAPI           │
    │  - batch_processor.py: Batch process  │
    │  - registry_manager.py: Build index   │
    │  - template_generator.py: Gen code    │
    └──────────────────────────────────────┘
                           │
                           ▼
    ┌──────────────────────────────────────┐
    │  Registry (Optimized Index)           │
    │  - registry/global_index.json         │
    │  - registry/embeddings.json           │
    │  - api_templates/*/templates.json     │
    └──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    RUNTIME PROCESS                       │
│  (Used by backend server)                               │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
    ┌──────────────────────────────────────┐
    │  Backend + AI Agent                   │
    │  - Reads registry/global_index.json   │
    │  - Semantic search on embeddings      │
    │  - Serves API data to frontend        │
    └──────────────────────────────────────┘
```

### Why Pipeline Exists

**Problem**: OpenAPI specs are verbose and slow to parse at runtime.

**Solution**: Pre-process them once into an optimized format:
- Extract only essential data (endpoints, auth, descriptions)
- Generate semantic embeddings for AI search
- Create code templates (curl, PowerShell, etc.)
- Build fast lookup index

### Pipeline Components

| File | Purpose |
|------|---------|
| `parser.py` | Parses OpenAPI YAML/JSON specs |
| `batch_processor.py` | Processes multiple APIs in batch |
| `registry_manager.py` | Builds and updates global_index.json |
| `template_generator.py` | Generates curl/PowerShell templates |

### How to Run Pipeline

**When to run**: Only when adding new APIs or updating existing ones.

```bash
# Install Python dependencies
pip install -r requirements.txt

# Process all APIs in apis/ folder
python pipeline/batch_processor.py apis --clear

# Process sample data
python pipeline/batch_processor.py pipeline/source_data
```

**Output**:
- `registry/global_index.json` - Main API index
- `registry/embeddings.json` - Semantic search cache
- `api_templates/*/templates.json` - Code templates

### How Backend Uses Registry

The backend (`simple-server.js`) loads the registry at startup:

```javascript
// Load pre-processed registry (FAST)
const registryPath = path.join(__dirname, '..', 'registry', 'global_index.json');
const registryData = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

// Serve to frontend
app.get('/apis', (req, res) => {
    res.json({ apis: registryData.apis });
});

// AI agent uses embeddings for semantic search
const embeddings = require('../registry/embeddings.json');
```

**Key Point**: The backend NEVER parses OpenAPI specs at runtime. It only reads the pre-built registry.

## 📁 Project Structure

```
api-explorer-pipeline/
├── backend/              # Express.js backend (port 3002)
│   ├── simple-server.js  # Main server
│   ├── agent_tools.js    # Agent tools
│   ├── ai-agent-orchestrator.js  # AI orchestration
│   ├── semantic-matcher.js       # Semantic search
│   └── ...
├── frontend/             # Web UI (port 3001)
│   ├── index.html        # Main page
│   ├── script.js         # Frontend logic
│   ├── style.css         # Clean white theme
│   └── serve.js          # Static file server
├── poc/                  # Minimal demo (port 3003)
│   ├── agent.js          # Standalone agent
│   ├── collections.json  # Sample collections
│   └── server.js         # Demo server
├── pipeline/             # OFFLINE processing
│   ├── parser.py         # OpenAPI parser
│   ├── batch_processor.py # Batch processor
│   ├── registry_manager.py # Registry builder
│   ├── template_generator.py # Template generator
│   └── source_data/      # Sample OpenAPI specs
├── apis/                 # Processed API data (19 APIs)
│   └── */openapi.json    # Individual API specs
├── registry/             # RUNTIME data (used by backend)
│   ├── global_index.json # Main API index
│   └── embeddings.json   # Semantic search cache
├── api_templates/        # Generated code templates
│   └── */templates.json  # curl, PowerShell, etc.
├── start.sh / start.bat  # Main startup scripts
├── dev.sh / dev.bat      # Component launchers
└── README.md             # This file
```

## 🧪 Testing the AI Agent

Try these queries in the AI Agent panel:

1. **"get random dog image"** - Tests image preview
2. **"create pet"** - Tests POST with body
3. **"get users"** - Tests GET request
4. **"update user"** - Tests PUT request

## 🛠️ Development

### Backend Development
```bash
./dev.sh backend
# or
cd backend && npm start
```

### Frontend Development
```bash
./dev.sh frontend
# or
cd frontend && npm start
```

### PoC Demo
```bash
./dev.sh poc
# or
cd poc && npm start
```

### Adding New APIs

1. Place OpenAPI spec in `apis/` or `pipeline/source_data/`
2. Run pipeline:
   ```bash
   python pipeline/batch_processor.py apis --clear
   ```
3. Restart backend to load new registry
4. New API appears in frontend automatically

## 📦 API Registry

The system includes 19+ pre-indexed APIs:
- Dog CEO API
- JSONPlaceholder
- OpenWeather
- GitHub API
- Pet Store API
- And more...

## 🎨 UI Theme

Clean white theme with:
- Gradient accents
- Smooth animations
- Responsive design
- Accessibility-friendly
- Image preview with tabs
- Confidence breakdown
- Structured explanations

## 🔧 Configuration

### Backend (port 3002)
Edit `backend/simple-server.js`:
```javascript
const PORT = 3002;
```

### Frontend (port 3001)
Edit `frontend/serve.js`:
```javascript
const PORT = 3001;
```

## 📝 License

MIT License - See LICENSE file for details

## 🤝 Contributing

This is a GSoC 2025 project. Contributions welcome!

## 📧 Support

For issues or questions, please open a GitHub issue.

---

**Built with ❤️ for GSoC 2025**
