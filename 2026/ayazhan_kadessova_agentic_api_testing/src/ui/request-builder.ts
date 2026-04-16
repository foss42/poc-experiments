import { SHARED_STYLES, MCP_APP_SCRIPT } from "../styles.js";

export function requestBuilderUI(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>${SHARED_STYLES}</style>
</head>
<body>
  <h2>Configure API Test</h2>

  <div class="card">
    <div class="row" style="margin-bottom: 12px;">
      <div style="width: 120px;">
        <label>Method</label>
        <select id="method">
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="PATCH">PATCH</option>
          <option value="DELETE">DELETE</option>
          <option value="HEAD">HEAD</option>
          <option value="OPTIONS">OPTIONS</option>
        </select>
      </div>
      <div class="col">
        <label>URL</label>
        <input type="text" id="url" placeholder="https://api.example.com/endpoint" />
      </div>
    </div>

    <div style="margin-bottom: 12px;">
      <label>Headers <span style="color: var(--text-muted);">(one per line: Key: Value)</span></label>
      <textarea id="headers" rows="3" placeholder="Content-Type: application/json&#10;Authorization: Bearer token"></textarea>
    </div>

    <div style="margin-bottom: 12px;">
      <label>Request Body <span style="color: var(--text-muted);">(JSON)</span></label>
      <textarea id="body" rows="5" placeholder='{"key": "value"}'></textarea>
    </div>

    <div class="row" style="margin-bottom: 16px;">
      <div style="width: 180px;">
        <label>Expected Status</label>
        <input type="number" id="expectedStatus" placeholder="200" value="200" />
      </div>
      <div style="width: 220px;">
        <label>Max Response Time (ms)</label>
        <input type="number" id="maxTime" placeholder="5000" value="5000" />
      </div>
      <div class="col">
        <label>Test Name <span style="color: var(--text-muted);">(optional)</span></label>
        <input type="text" id="testName" placeholder="e.g. Get users list" />
      </div>
    </div>

    <div id="error" class="status-bar error hidden"></div>

    <div style="display: flex; gap: 8px;">
      <button id="sendBtn" onclick="executeTest()">Send Request</button>
      <button class="btn-secondary" onclick="clearForm()">Clear</button>
    </div>
  </div>

  <div id="loading" class="status-bar info hidden">
    <div class="spinner"></div>
    <span>Executing request...</span>
  </div>

  <script>
    ${MCP_APP_SCRIPT}

    function parseHeaders(text) {
      const headers = {};
      for (const line of text.split("\\n")) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const idx = trimmed.indexOf(":");
        if (idx === -1) continue;
        headers[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
      }
      return headers;
    }

    function validateForm() {
      const url = document.getElementById("url").value.trim();
      if (!url) return "URL is required";
      try { new URL(url); } catch { return "Invalid URL format"; }
      const body = document.getElementById("body").value.trim();
      if (body) {
        try { JSON.parse(body); } catch { return "Invalid JSON body"; }
      }
      return null;
    }

    async function executeTest() {
      const err = validateForm();
      if (err) {
        const el = document.getElementById("error");
        el.textContent = err;
        el.classList.remove("hidden");
        return;
      }
      document.getElementById("error").classList.add("hidden");

      const config = {
        testName: document.getElementById("testName").value.trim() || "Untitled Test",
        method: document.getElementById("method").value,
        url: document.getElementById("url").value.trim(),
        headers: parseHeaders(document.getElementById("headers").value),
        body: document.getElementById("body").value.trim() || undefined,
        expectedStatus: parseInt(document.getElementById("expectedStatus").value) || 200,
        maxResponseTime: parseInt(document.getElementById("maxTime").value) || 5000,
      };

      document.getElementById("sendBtn").disabled = true;
      document.getElementById("loading").classList.remove("hidden");

      try {
        const result = await sendRequest("tools/call", {
          name: "execute-api-test",
          arguments: config,
        });

        const testResult = result?.content?.[0]?.text
          ? JSON.parse(result.content[0].text)
          : result?.structuredContent || result;

        await sendRequest("ui/update-model-context", {
          structuredContent: {
            testConfig: config,
            testResult: testResult,
          },
        });
      } catch (e) {
        const el = document.getElementById("error");
        el.textContent = "Execution failed: " + (e.message || JSON.stringify(e));
        el.classList.remove("hidden");
      } finally {
        document.getElementById("sendBtn").disabled = false;
        document.getElementById("loading").classList.add("hidden");
        notifySize();
      }
    }

    function clearForm() {
      document.getElementById("url").value = "";
      document.getElementById("headers").value = "";
      document.getElementById("body").value = "";
      document.getElementById("testName").value = "";
      document.getElementById("expectedStatus").value = "200";
      document.getElementById("maxTime").value = "5000";
      document.getElementById("method").value = "GET";
      document.getElementById("error").classList.add("hidden");
    }
  </script>
</body>
</html>`;
}
