# APIDash CLI

A standalone command-line companion to [APIDash](https://github.com/foss42/apidash) — fire API requests, manage collections, switch environments, and replay history, all without leaving your terminal.

![Help screen](screenshots/ss1.png)

---

## Why APIDash CLI over curl?

`curl` fires a request and forgets it. APIDash CLI **remembers**.

| | curl | APIDash CLI |
|---|---|---|
| Fire a request | ✓ | ✓ |
| Save request by name | ✗ | ✓ |
| Organise into collections | ✗ | ✓ |
| Environment variables (`{{token}}`) | ✗ | ✓ |
| Request history + search | ✗ | ✓ |
| Replay past requests | ✗ | ✓ |
| Run a full collection in one command | ✗ | ✓ |
| MCP server for AI tool-use | ✗ | ✓ |
| Pretty-printed, coloured output | ✗ | ✓ |

---

## Installation

```bash
# from the project directory
dart pub get
dart pub global activate --source path .
```

Both `apidash` and `ad` (shorthand) are registered as executables.

---

## Core Features

### Fire a request instantly

No setup needed. Works just like curl but with colour and formatting out of the box.

```bash
ad run --url https://api.example.com/users
ad run --url https://api.example.com/users --method POST \
       --header "Content-Type: application/json" \
       --body '{"name":"Ada"}'
```

Every response prints a clean status line:
```
← 200 OK │ application/json │ 3.2 KB │ 142ms
```

![Firing a request and saving it](screenshots/ss3.png)

---

### Save and reuse requests

Give any request a name. Run it again later without remembering the URL, headers, or body.

```bash
# save it
ad run --url https://api.example.com/users/1 --save-as "Get User" --collection "Users API"

# run it by name — no URL needed
ad r "Get User"
```

![Saved confirmation](screenshots/ss4.png)

---

### Collections

Group related requests together. List them, run them all at once.

```bash
ad c                   # list all collections
ad rc "Demo"           # run every request in the collection
```

Running a collection fires each request in sequence and prints a summary — how many passed (2xx) and how many failed.

![Collections list](screenshots/ss5.png)

![Run collection with summary](screenshots/ss6.png)

---

### Environment Variables

Define variables once, use them across all requests with `{{variable}}` syntax.

```bash
ad eset BASE_URL https://api.example.com
ad eset token abc123
ad eu Production            # switch to a named environment
ad es                       # show active environment variables
```

In your saved requests, write `{{BASE_URL}}/users` or `Bearer {{token}}` — they get resolved automatically at runtime.

![Setting an environment variable](screenshots/ss7.png)

![Viewing environment variables](screenshots/ss8.png)

---

### History

Every request you fire is recorded automatically — no setup needed.

```bash
ad h                        # show last 20 requests
ad hs POST                  # search by method, URL, or status code
ad hr a1b2c3d4              # replay a past request by its short id
ad hsv a1b2c3d4 "Get User"  # save a history entry as a named request
```

![History table](screenshots/ss9.png)

---

### Manage Saved Requests

```bash
ad s "Get User"                                          # show full details
ad e "Get User" --url https://api.example.com/v2/users  # edit a field
ad rn "Get User" "Fetch User"                           # rename
ad dup "Get User"                                        # duplicate
ad del "Get User"                                        # delete
```

---

### MCP Server (AI Tool-Use)

Start an MCP-compatible server over stdio. Lets AI assistants like Claude use your saved requests as tools — no copy-pasting URLs, no manual setup.

```bash
ad mcp serve
```

Exposed tools: `run_request`, `list_collections`, `list_requests`, `get_request`, `list_environments`, `get_active_env`, `set_env_variable`, `create_request`.

---

## Command Reference

| Command | Alias | What it does |
|---|---|---|
| `run` | `r` | Fire a named or inline request |
| `collections` | `c` | List all collections |
| `run-collection` | `rc` | Run every request in a collection |
| `show` | `s` | Show full request details |
| `edit` | `e` | Edit a saved request |
| `env list` | `el` | List all environments |
| `env use` | `eu` | Set the active environment |
| `env show` | `es` | Show active environment variables |
| `env set` | `eset` | Set a variable in the active environment |
| `history` | `h` | Show recent request history |
| `history replay` | `hr` | Replay a history entry |
| `history search` | `hs` | Search history |
| `history save` | `hsv` | Save a history entry as a named request |
| `rename` | `rn` | Rename a request |
| `duplicate` | `dup` | Duplicate a request |
| `delete` | `del` | Delete a request or collection |
| `mcp serve` | `mcp` | Start MCP server on stdio |
| `help` | `?` | Show help |

![Full command reference](screenshots/ss2.png)

---

## Storage

All data is stored as plain JSON in `~/.apidash_cli/`:

```
~/.apidash_cli/
  collections.json    ← saved requests organised into collections
  environments.json   ← named variable sets
  history.json        ← last 500 requests (auto-trimmed)
  active_env.json     ← currently active environment id
  responses/          ← auto-saved media files (PDF, audio, video)
```

### Shared tracking with APIDash UI

The CLI and the APIDash desktop UI track requests independently but follow the **same data model** — collections, requests, environments, and history entries share identical JSON structure. This means:

- Requests saved in the CLI can be imported into the APIDash UI and vice versa.
- Whether you fire a request from the UI or from the terminal, the history entry looks the same.
- Environment variable files are portable between both — copy `environments.json` across and it works in either context.

This design makes the CLI a true companion to the UI, not a separate tool. Your workflow moves between terminal and GUI freely, with the same request definitions and the same history available in both places.

---

## Media Responses

For responses with `Content-Type` of PDF, audio, or video, the CLI automatically saves the file to `~/.apidash_cli/responses/` with a timestamp and prints the metadata:

```
Type    application/pdf
Size    84.3 KB
Saved   ~/.apidash_cli/responses/response_2026-04-15T10-30-00.pdf
```

---

## Built with

- [`args`](https://pub.dev/packages/args) — command parsing  
- [`http`](https://pub.dev/packages/http) — HTTP requests  
- [`path`](https://pub.dev/packages/path) — file path handling  

No Flutter. No Hive. No dependencies on the APIDash repo.
