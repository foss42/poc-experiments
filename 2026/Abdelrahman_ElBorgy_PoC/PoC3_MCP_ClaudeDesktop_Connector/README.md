### Run the External Connector (Claude Desktop Integration)

This prototype includes `native_mcpServer_prototype.dart`, a headless MCP server that exposes API testing capabilities directly to Claude Desktop.

**Prerequisites:**
* Dart SDK installed globally on your machine.
* Claude Desktop App installed.

**Step 1: Locate the Dart file**
Find the absolute path to the `native_mcpServer_prototype.dart` file on your machine (e.g., `C:\Users\Name\apidash-agentic-prototype\native_mcpServer_prototype.dart` or `/Users/Name/apidash-agentic-prototype/native_mcpServer_prototype.dart`).

**Step 2: Update Claude Desktop Configuration**
You can easily open the configuration file directly from the Claude Desktop app:
1. Open Claude Desktop.
2. Go to **Settings** (click your profile name in the bottom left).
3. Click on the **Developer** tab in the left sidebar.
4. Click the **Edit Config** button. This will automatically open the `claude_desktop_config.json` file in your default text editor.
   
<img width="2127" height="1514" alt="image" src="https://github.com/user-attachments/assets/5cbc7bea-5a92-4e3f-8c8f-33c481f995bd" />

Add the Dart MCP server to the configuration (replace the path with your absolute path):

```json
{
  "mcpServers": {
    "apidash-agentic-engine": {
      "command": "dart",
      "args": [
        "run",
        "YOUR_ABSOLUTE_PATH_HERE/native_mcpServer_prototype.dart"
      ]
    }
  }
}
```

**Step 3: Restart Claude Desktop**
Completely quit and restart Claude Desktop. 

**Step 4: Run the Agentic Workflow**
1. Click the **+** (plus) icon next to the chat input bar in Claude Desktop.
2. Navigate to **Connectors** > **Add from [your_server_name]** (e.g., `apidash-agentic-engine` or `api_dash_native`).
3. Select the **Run agentic tests** prompt.
4. Paste a public OpenAPI specification URL into the argument box (e.g., the Swagger Petstore: `https://raw.githubusercontent.com/OAI/OpenAPI-Specification/main/examples/v3.0/petstore.json`) and press Enter.
<img width="2124" height="1525" alt="image" src="https://github.com/user-attachments/assets/cde22339-a495-460c-ac4a-1c82792a1d15" />


Watch as Claude autonomously reads the spec, generates accurate mock data, and executes native HTTP tests bypassing all CORS restrictions!


## GSoC 2026 Proposal
This prototype is part of a comprehensive proposal for API Dash.
