# 🚀 API Explorer Automation (Proof of Concept)

## 📌 Overview

This project is a **Proof of Concept (PoC)** implementation of the proposed system:

> **API Explorer Automation: A Zero-Maintenance, Fault-Tolerant Pipeline with Community Curation**

It demonstrates a fully automated pipeline that:
- Fetches OpenAPI specifications
- Parses and validates them
- Converts them into structured API templates
- Integrates community feedback using GitHub Issues
- Serves data to a Flutter-based frontend

---

## 🎯 Objective

The goal of this project is to validate:

- Feasibility of a **zero-backend architecture**
- Reliability of automated OpenAPI ingestion
- Fault-tolerant pipeline design
- Use of GitHub as a **data + feedback layer**

---

## ⚠️ Important Note

> This is an **early-stage prototype** built to validate the idea and architecture.

There is **significant scope for improvement** in:
- Pipeline robustness
- Data accuracy
- Frontend UI/UX

Please evaluate this as a **proof of concept**, not a production-ready system.

---

## 🧠 Architecture Overview


```
┌───────────────┐      ┌───────────────┐
|  sources.json |      | GitHub Issues |
└───────┬───────┘      └───────┬───────┘
        |                      |
        |                      |
        |                      |
        |                      |
        v                      v
┌────────────────────┐  ┌────────────────────┐
| fetch_local_sources|  | fetch_github_issues|
└─────────┬──────────┘  └────────┬───────────┘
          |                      |
          +----------+-----------+
                     |
                     v
            ┌──────────────────┐
            |  main_pipeline.py|
            └─────────┬────────┘
                      |
                      v
            ┌──────────────────────┐
            | openapi_parser_logic |
            └─────────┬────────────┘
                      |
                      v
        ┌───────────────────────────────┐
        | templates.json + pipeline_    |
        | report.json                   |
        └──────────────┬────────────────┘
                       |
                       v
              ┌────────────────────┐
              | Flutter Frontend   |
              └────────────────────┘
```


---

## ⚙️ Pipeline Components

### 1. fetch_local_sources.py
- Reads API sources from `sources.json`
- Acts as the **static input registry**

---

### 2. fetch_github_issues.py
- Fetches API URLs submitted via GitHub Issues
- Enables **community-driven API addition**

---

### 3. openapi_parser_logic.py
- Core parsing engine
- Handles:
  - OpenAPI validation
  - Endpoint extraction
  - Tagging & categorization
  - Template formatting

---

### 4. main_pipeline.py
- Central orchestrator
- Combines:
  - Local sources
  - GitHub-submitted APIs
- Generates:
  - `templates.json` (valid APIs)
  - `pipeline_report.json` (failed APIs)
- **Intended to run automatically every 6 hours** (e.g., via cron job; not yet applied, but this is the intended schedule)

---

### 5. fetch_fast_sync.py
- Fetches GitHub Issue interactions:
  - 👍 Likes
  - 👎 Dislikes
  - 💬 Comments
- Updates:
  - Popularity scores
  - Community feedback
- **Intended to run automatically every 1 hour** (e.g., via cron job; not yet applied, but this is the intended schedule)

---

## 🔁 Pipeline Flow
> **Note:** The main pipeline is designed to run every 6 hours, and the fetch_fast_sync script (for likes, reactions, and comments) is designed to run every 1 hour. While cron jobs are not yet set up, this is the intended automation schedule for production.

1. Load API sources (local + GitHub)
2. Fetch OpenAPI specifications
3. Validate structure (`paths`, JSON/YAML)
4. Extract:
   - Base URLs
   - Endpoints
   - Methods
   - Metadata
5. Assign tags (rule-based)
6. Generate structured templates
7. Log failures separately
8. Sync community feedback

---

## 🚀 How to Run the Project

### 📦 Step 0: Setup Environment

#### Linux / macOS
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```
#### Windows
```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### 📂 Step 1: Navigate to Pipeline
```bash
cd pipeline
```

### ▶️ Step 2: Run Main Pipeline
#### Linux / macOS
```bash
python3 main_pipeline.py
```
#### Windows
```bash
python main_pipeline.py
```

### ▶️ Step 3: Run Fast Sync (GitHub Interactions)
#### Linux / macOS
```bash
python3 fetch_fast_sync.py
```
#### Windows
```bash
python fetch_fast_sync.py
```

### 📱 Step 4: Run Frontend (Flutter)
```bash
cd frontend
```
#### Linux
```bash
flutter run -d linux
```
#### Windows
```bash
flutter run -d windows
```
#### macOS
```bash
flutter run -d macos
```

---

## 🖥️ Frontend Features

The Flutter app displays:

- 📂 API Categories (AI, Finance, etc.)
- 📄 List of APIs
- 🔗 Endpoints per API
- 📥 Sample request data
- 📤 Sample response data
- ⭐ Community feedback (likes & comments)

---

## 🛡️ Fault Tolerance Strategy

The pipeline is designed to handle failures gracefully:

- ✅ templates.json
  - Contains only valid and parsed APIs
- ❌ pipeline_report.json
  - Contains failed APIs with error details:
    - Network errors (404, timeout)
    - Invalid schema
    - Missing fields

---

## 🔍 Edge Cases Handled

- Missing servers field
- Multiple server URLs
- Invalid JSON/YAML
- Non-OpenAPI APIs
- Large API schemas (1000+ endpoints)
- Broken or unreachable URLs

---

## 📊 Output Files


### templates.json
```json
[
  {
    "name": "Swagger Petstore (Animals)",
    "tags": ["Animals"],
    "base_url": "/api/v3",
    "_original_url": "https://petstore3.swagger.io/api/v3/openapi.json",
    "community_score": {
      "upvotes": 0,
      "comments": 0,
      "interactions": [
        {
          "user": "username",
          "body": "Great API!",
          "upvotes": 2,
          "created_at": "2026-03-29T13:53:48Z"
        }
        // ...more comments
      ]
    },
    "global_auth_methods": {
      "petstore_auth": {
        "type": "oauth2",
        "flows": {
          "implicit": {
            "authorizationUrl": "https://petstore3.swagger.io/oauth/authorize",
            "scopes": {
              "write:pets": "modify pets in your account",
              "read:pets": "read your pets"
            }
          }
        }
      },
      "api_key": {
        "type": "apiKey",
        "name": "api_key",
        "in": "header"
      }
    },
    "endpoints_count": 19,
    "endpoints": [
      {
        "method": "PUT",
        "path": "/pet",
        "summary": "Update an existing pet.",
        "auth_required": ["petstore_auth"],
        "parameters": {
          "headers": [],
          "path_variables": [],
          "query_parameters": []
        },
        "request_body_sample": { ... },
        "response_body_sample": { ... }
      },
      // ...more endpoints
    ]
  },
  // ...more APIs
]
```

- **name**: Human-readable API name (shown in sidebar and details pane)
- **tags**: List of categories (used for sidebar grouping)
- **base_url**: Root URL for the API (shown in details)
- **_original_url**: Source OpenAPI spec URL (not shown in UI, for traceability)
- **community_score**: Community engagement data
  - **upvotes**: Number of upvotes (likes) for the API (shown as "Likes")
  - **comments**: Number of comments (shown as "Comments")
  - **interactions**: Array of comment objects:
    - **user**: Comment author's username (shown in comment list)
    - **body**: Comment text (shown in comment list)
    - **upvotes**: Upvotes on the comment (shown next to comment)
    - **created_at**: Timestamp (shown in comment list)
- **global_auth_methods**: Map of authentication schemes (shown in API details)
  - Each key is an auth method name, value is an object with fields like `type`, `name`, `in`, `flows`, etc.
- **endpoints_count**: Number of endpoints (shown in overview)
- **endpoints**: Array of endpoint objects:
  - **method**: HTTP method (GET, POST, etc.; shown in endpoint list)
  - **path**: Endpoint path (shown in endpoint list and details)
  - **summary**: Short description (shown in endpoint list and details)
  - **auth_required**: List of required auth methods (shown in endpoint details)
  - **parameters**: Object with arrays for:
    - **headers**: Array of header parameter objects `{ name, required }`
    - **path_variables**: Array of path variable parameter objects `{ name, required }`
    - **query_parameters**: Array of query parameter objects `{ name, required }`
  - **request_body_sample**: Example request body (object, array, or null; shown in endpoint details)
  - **response_body_sample**: Example response (object, array, or null; shown in endpoint details)

### pipeline_report.json
```json
{
  "name": "API Name",
  "error": "Validation Failed: Missing 'paths'"
}
```

---

## 💡 Scope for Improvement

### 🔧 Pipeline
- Add fallback sources (APIs.guru + GitHub auto-detection)
- Improve tagging using NLP
- Add parallel processing (async execution)
- Better handling of authentication-heavy APIs

### 🎨 Frontend
- Improved UI/UX
- Advanced filtering & search
- Better schema visualization
- Lazy loading for large APIs

---

## 🚀 Future Enhancements

- Database integration (PostgreSQL / Supabase)
- Real-time updates
- Advanced API discovery
- Smart ranking using community signals
- AI-based tagging & categorization

---

## 🎯 Positioning

This project demonstrates a working prototype of a scalable, fault-tolerant API ingestion system.

The focus during further development will be on:

- Improving reliability
- Enhancing user experience
- Scaling the system for real-world usage

---

## 🏁 Conclusion

This PoC validates that:

- A zero-maintenance pipeline is feasible
- OpenAPI specs can be reliably processed
- GitHub can act as a data + feedback backend
- API Explorer can be built without traditional infrastructure
