# API Dash Marketplace Pipeline

Automated Python pipeline for fetching, parsing, enriching, and publishing 2,500+ API specifications to the [API Dash](https://github.com/foss42/apidash) Marketplace.

---

## Table of Contents

- [How it works](#how-it-works)
- [Project Structure](#project-structure)
- [Running Locally](#running-locally)
- [GitHub Actions](#github-actions)
- [License](#license)

---

## How it works

The backend is a fully automated Python pipeline that runs nightly on GitHub Actions. It follows a multi-phase architecture where each phase processes and hands off data to the next.

### Phase 1: Fetcher
- Calls the [apis.guru](https://apis.guru/) official REST API to get the full catalog.
- Compares updated timestamps against a local snapshot file to only download new or changed specs.
- Supports OpenAPI 3.x and Swagger 2.x formats.

### Phase 2: Parser
- Uses `prance` to resolve all $ref pointers (inlining shared schema definitions).
- Extracts per-endpoint metadata: method, path, parameters, request body schema, and security requirements.
- Standardizes diverse spec formats into a unified internal model.

### Phase 3: Enricher
- **Category Management**: Maps apis.guru tags to a curated set of categories (e.g., "financial" -> "Finance").
- **Auth Detection**: Identifies authentication methods (API Key, OAuth2, Basic) from security schemes.
- **Variable Generation**: Generates placeholder variables matching API Dash's environment variable system.
- **Branding**: Fetches high-res provider logos via Clearbit with favicon fallbacks.

### Phase 4: Template Generator
- Produces the actual importable request templates.
- Constructs full URLs with path parameters as placeholder variables (`{{var}}`).
- Pre-fills headers (including auth headers) and builds JSON/Form body skeletons from schemas.
- High-quality "Notes" field generation explaining how to use the specific endpoint.

### Phase 5: Validator
- Checks every template for required fields and valid HTTP formats.
- **Security Scanner**: Scans all string values for patterns matching real leaked credentials.
- Drops individual templates that fail validation rather than rejecting the entire API.

### Phase 6: Publisher + Orchestrator
- Merges new updates into the existing marketplace catalog while preserving community ratings.
- Writes two files: a master `index.json` (metadata) and per-API `templates.json` files.
- `run.py` handles concurrent processing of up to 5 APIs for high-performance updates.

---

## Project Structure

- **`pipeline/`**: Python source code for all phases.
- **`marketplace/`**: Final generated JSON files (Git-tracked and served via GitHub Pages).
- **`raw/`**: Temporary storage for downloaded raw specifications (Git-ignored).
- **`config/`**: Category maps and enhancement rules.
- **`sources.yaml`**: Configuration for manual API sources not found in apis.guru.

---

## Running Locally

### 1. Prerequisites
- Python 3.11+
- Virtual environment (recommended)

### 2. Setup (Windows PowerShell)
```powershell
# Create and activate virtual environment
python -m venv venv
.\venv\Scripts\activate

# Install dependencies
pip install -r pipeline/requirements.txt
```

### 3. Execution
All commands should be run from the `apidash-explorer` root directory. Use the $env:PYTHONPATH variable to ensure module resolution.

```powershell
# Run the full pipeline
$env:PYTHONPATH="."; python pipeline/run.py

# Process/Update a specific API (e.g. Stripe)
$env:PYTHONPATH="."; python pipeline/run.py --api-id stripe.com

# Force reprocess everything (ignoring timestamps)
$env:PYTHONPATH="."; python pipeline/run.py --force-all
```

### 4. Local Testing
Serve the generated marketplace data to test with the frontend:
```powershell
python -m http.server 8000 --directory "marketplace"
```
The local marketplace index will be available at `http://localhost:8000/index.json`.

---

## GitHub Actions

The pipeline includes an automated workflow (`.github/workflows/marketplace_sync.yml`):
- **Schedule**: Triggers nightly at **2:00 AM UTC**.
- **Automation**: Runs the pipeline, commits changed marketplace files back to the repo, and pushes updates to GitHub Pages.

