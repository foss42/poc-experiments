import { SHARED_STYLES, MCP_APP_SCRIPT } from "../styles.js";

export function testPlanUI(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    ${SHARED_STYLES}

    .test-case {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px;
      border-bottom: 1px solid var(--border);
    }

    .test-case:last-child { border-bottom: none; }

    .test-case input[type="checkbox"] {
      width: 16px;
      height: 16px;
      margin-top: 2px;
      accent-color: var(--accent);
    }

    .test-case-info { flex: 1; }
    .test-case-name { font-weight: 500; font-size: 13px; }
    .test-case-meta {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 2px;
      font-family: var(--mono);
    }
    .test-case-desc {
      font-size: 12px;
      color: var(--text-secondary);
      margin-top: 4px;
    }

    .method-badge {
      display: inline-block;
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
      font-family: var(--mono);
    }

    .method-GET { background: #1b5e2033; color: var(--success); }
    .method-POST { background: #0d47a133; color: var(--info); }
    .method-PUT { background: #e6510033; color: var(--warning); }
    .method-PATCH { background: #e6510033; color: var(--warning); }
    .method-DELETE { background: #b7160033; color: var(--error); }

    .plan-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .plan-actions {
      display: flex;
      gap: 8px;
      margin-top: 16px;
    }

    .category-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted);
      padding: 8px 12px 4px;
    }
  </style>
</head>
<body>
  <div id="waiting" class="status-bar info">
    <div class="spinner"></div>
    <span>Generating test plan...</span>
  </div>

  <div id="plan" class="hidden">
    <div class="plan-header">
      <h2 id="planTitle">Test Plan</h2>
      <div>
        <span id="testCount" class="badge badge-info"></span>
      </div>
    </div>

    <p id="planDesc" style="font-size: 13px; color: var(--text-secondary); margin-bottom: 16px;"></p>

    <div class="card" style="padding: 0; overflow: hidden;">
      <div id="testCases"></div>
    </div>

    <div class="plan-actions">
      <button onclick="approveSelected()">Run Selected Tests</button>
      <button class="btn-secondary" onclick="toggleAll()">Toggle All</button>
    </div>
  </div>

  <script>
    ${MCP_APP_SCRIPT}

    let testPlan = null;

    // Generate test cases client-side from tool input arguments.
    // The MCP Apps host sends the tool's INPUT args to the UI, not the
    // server-generated structuredContent. So we generate here.
    function generateTests(baseUrl, method, path) {
      const fullUrl = baseUrl.replace(/\\/$/, "") + path;
      const tests = [];

      tests.push({
        name: method + " " + path + " - Happy path",
        method: method,
        url: fullUrl,
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        expectedStatus: method === "POST" ? 201 : 200,
        maxResponseTime: 5000,
        category: "Functional",
        description: "Verify " + method + " " + path + " returns expected status with valid request",
      });

      tests.push({
        name: method + " " + path + " - Missing Accept header",
        method: method,
        url: fullUrl,
        headers: { "Content-Type": "application/json" },
        expectedStatus: 200,
        maxResponseTime: 5000,
        category: "Error Handling",
        description: "Test behavior when Accept header is missing",
      });

      if (method !== "GET" && method !== "HEAD") {
        tests.push({
          name: method + " " + path + " - Empty body",
          method: method,
          url: fullUrl,
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: "{}",
          expectedStatus: 400,
          maxResponseTime: 5000,
          category: "Error Handling",
          description: "Verify proper error response when request body is empty",
        });
        tests.push({
          name: method + " " + path + " - Invalid JSON body",
          method: method,
          url: fullUrl,
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: "{invalid json}",
          expectedStatus: 400,
          maxResponseTime: 5000,
          category: "Error Handling",
          description: "Verify proper error response for malformed JSON",
        });
      }

      tests.push({
        name: method + " " + path + " - No auth header",
        method: method,
        url: fullUrl,
        headers: { "Content-Type": "application/json" },
        expectedStatus: 401,
        maxResponseTime: 5000,
        category: "Security",
        description: "Verify endpoint requires authentication",
      });

      tests.push({
        name: method + " " + path + " - Invalid auth token",
        method: method,
        url: fullUrl,
        headers: { "Content-Type": "application/json", "Authorization": "Bearer invalid-token-12345" },
        expectedStatus: 401,
        maxResponseTime: 5000,
        category: "Security",
        description: "Verify endpoint rejects invalid auth tokens",
      });

      const wrongMethod = method === "GET" ? "DELETE" : "GET";
      tests.push({
        name: wrongMethod + " " + path + " - Wrong HTTP method",
        method: wrongMethod,
        url: fullUrl,
        headers: { "Content-Type": "application/json" },
        expectedStatus: 405,
        maxResponseTime: 5000,
        category: "Edge Cases",
        description: "Verify endpoint returns 405 for unsupported method " + wrongMethod,
      });

      tests.push({
        name: method + " " + path + " - Performance check",
        method: method,
        url: fullUrl,
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        expectedStatus: method === "POST" ? 201 : 200,
        maxResponseTime: 2000,
        category: "Performance",
        description: "Verify response time is within acceptable bounds (< 2s)",
      });

      return tests;
    }

    function renderPlan(data) {
      testPlan = data;
      document.getElementById("waiting").classList.add("hidden");
      document.getElementById("plan").classList.remove("hidden");

      document.getElementById("planTitle").textContent = data.planName || "Test Plan";
      document.getElementById("planDesc").textContent = data.description || "";
      document.getElementById("testCount").textContent = data.tests.length + " tests";

      const container = document.getElementById("testCases");
      container.innerHTML = "";

      let currentCategory = null;

      for (let i = 0; i < data.tests.length; i++) {
        const t = data.tests[i];

        if (t.category && t.category !== currentCategory) {
          currentCategory = t.category;
          const label = document.createElement("div");
          label.className = "category-label";
          label.textContent = currentCategory;
          container.appendChild(label);
        }

        const div = document.createElement("div");
        div.className = "test-case";
        div.innerHTML =
          '<input type="checkbox" checked data-index="' + i + '" />' +
          '<div class="test-case-info">' +
            '<div class="test-case-name">' +
              '<span class="method-badge method-' + t.method + '">' + t.method + '</span> ' +
              t.name +
            '</div>' +
            '<div class="test-case-meta">' + t.url + '</div>' +
            (t.description ? '<div class="test-case-desc">' + t.description + '</div>' : '') +
          '</div>';
        container.appendChild(div);
      }

      notifySize();
    }

    function toggleAll() {
      const boxes = document.querySelectorAll('input[type="checkbox"]');
      const allChecked = Array.from(boxes).every(b => b.checked);
      boxes.forEach(b => b.checked = !allChecked);
    }

    async function approveSelected() {
      const btn = document.querySelector('.plan-actions button');
      const boxes = document.querySelectorAll('input[type="checkbox"]');
      const selected = [];
      boxes.forEach(b => {
        if (b.checked) selected.push(testPlan.tests[parseInt(b.dataset.index)]);
      });

      if (selected.length === 0) return;

      btn.disabled = true;
      btn.textContent = "Submitting...";

      try {
        await sendRequest("ui/update-model-context", {
          structuredContent: {
            approvedTests: selected,
            planName: testPlan.planName,
          },
        });

        btn.textContent = "\\u2713 " + selected.length + " tests submitted";
        btn.classList.add("btn-success");

        // Show hint
        const hint = document.createElement("div");
        hint.className = "status-bar success";
        hint.style.marginTop = "12px";
        hint.textContent = "Tests sent to agent context. Ask the agent to \\"run the approved tests\\" to execute them.";
        document.querySelector(".plan-actions").after(hint);
        notifySize();
      } catch (e) {
        btn.textContent = "Run Selected Tests";
        btn.disabled = false;
      }
    }

    function onToolInput(data) {
      // Only render when we receive actual plan data with tests array
      if (data.tests && Array.isArray(data.tests)) {
        renderPlan(data);
        return;
      }
      // Otherwise ignore — the server is still processing via the agent pipeline.
      // The UI stays in "Generating test plan..." state until the real data arrives.
    }
  </script>
</body>
</html>`;
}
