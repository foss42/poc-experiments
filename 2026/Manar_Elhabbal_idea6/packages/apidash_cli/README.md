## CLI Commands
 
The `apidash` CLI gives you full access to your ApiDash workspace from the terminal. Three commands are available: `init`, `request`, and `history`.
 
 ## Demo

  >this is a demo for extend the apidash as mcp server without adding mcp apps for simplisity

   https://drive.google.com/drive/folders/1mQqgthrAlCvShntTuauJrW-fmJqgvs1V


---
 
### `apidash init`
 
Initialize an ApiDash config in the current directory.
 
```bash
apidash init [options]
```
 
| Flag / Option | Short | Description |
|---|---|---|
| `--force` | `-f` | Overwrite existing config if present |
| `--name <name>` | `-n` | Project name to save in the config file |
 
**Examples:**
 
```bash
# Basic init
apidash init
 
# Init with a project name
apidash init --name my-api-project
 
# Overwrite an existing config
apidash init --force
 
# Both together
apidash init --name my-api-project --force
```
 
**Output:**
 
```
✔ API Dash initialized successfully!
  Config written to: .apidash/config.json
```
 
```
ℹ Configuration already exists.
  Use --force (-f) to overwrite.
```
 
---
 
### `apidash request`
 
Execute an HTTP request and save it to history.
 
```bash
apidash request <METHOD> <URL> [options]
```
 
| Option | Short | Default | Description |
|---|---|---|---|
| `--workspace <path>` | `-w` | `.apidash` | Path to the ApiDash workspace |
| `--output <format>` | `-o` | `human` | Output format: `human` or `json` |
| `--name <name>` | | URL | Custom name for the request in history |
| `--body <body>` | | | Request body for POST / PUT / PATCH |
| `--header <key:value>` | `-H` | | Add a header (repeatable) |
 
**Examples:**
 
```bash
# Simple GET
apidash request GET https://api.example.com/users
 
# POST with body and headers
apidash request POST https://api.example.com/users \
  --body '{"name":"Alice","email":"alice@example.com"}' \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mytoken"
 
# GET with JSON output format
apidash request GET https://api.example.com/users --output json
 
# Named request saved to a custom workspace
apidash request GET https://api.example.com/products \
  --name "list-products" \
  --workspace ./my-workspace
 
# DELETE request
apidash request DELETE https://api.example.com/users/1
```
 
**Human output (`--output human`):**
 
```
ℹ Response: 200 in 142ms
{"users":[{"id":1,"name":"Alice"},{"id":2,"name":"Bob"}],"total":2}
✔ Saved to history
```
 
**JSON output (`--output json`):**
 
```json
{
  "status": 200,
  "headers": [
    { "name": "content-type", "value": "application/json" }
  ],
  "body": "{\"users\":[...]}",
  "duration_ms": 142
}
```
 
> **Media responses** (images, PDFs, audio, video) are automatically saved to a temp file and opened in your system's default viewer.
 
---
 
### `apidash history`
 
View and manage your saved request history.
 
```bash
apidash history [options]
```
 
| Option | Short | Description |
|---|---|---|
| `--workspace <path>` | `-w` | Specify a workspace (defaults to `.apidash`) |
| `--limit <n>` | `-l` | Show only the last `n` requests |
| `--clear` | | Clear all history |
| `--delete <id>` | | Delete a specific request by ID |
 
**Examples:**
 
```bash
# List all history
apidash history
 
# Show only the last 5 requests
apidash history --limit 5
 
# List history from a custom workspace
apidash history --workspace ./my-workspace
 
# Delete a specific request by ID
apidash history --delete 3f2a1b4c-...
 
# Clear all history
apidash history --clear
```
 
**Output:**
 
```
ℹ Recent Requests:
[3f2a1b4c-...] GET https://api.example.com/users
[7e9d2a1f-...] POST https://api.example.com/users
[1c4b8e2d-...] PUT https://api.example.com/users/1
```
 
```
✔ History cleared
```
 
```
✔ Request 3f2a1b4c-... deleted
```
 
```
✗ Request 3f2a1b4c-... not found
```
