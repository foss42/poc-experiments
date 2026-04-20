import { BASE_STYLES, MCP_COMMS_SCRIPT } from "../styles.js";

export function codeGeneratorUI(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API Dash - Code Generator</title>
  <style>
    ${BASE_STYLES}

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 200px;
      color: var(--text-muted);
      gap: 8px;
    }

    .lang-tabs {
      display: flex;
      gap: 0;
      border-bottom: 1px solid var(--border);
      margin-bottom: 0;
      overflow-x: auto;
    }

    .lang-tab {
      padding: 8px 16px;
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 13px;
      white-space: nowrap;
      border-bottom: 2px solid transparent;
      transition: color 0.15s, border-color 0.15s;
    }

    .lang-tab:hover { color: var(--text); }
    .lang-tab.active {
      color: var(--text);
      border-bottom-color: var(--accent);
    }

    .code-container {
      position: relative;
    }

    .copy-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      background: var(--surface);
      border: 1px solid var(--border);
      color: var(--text-muted);
      padding: 4px 10px;
      border-radius: var(--radius);
      cursor: pointer;
      font-size: 11px;
      z-index: 1;
    }

    .copy-btn:hover { color: var(--text); border-color: var(--accent); }

    .code-display {
      background: #1a1a1a;
      border: 1px solid var(--border);
      border-top: none;
      border-radius: 0 0 var(--radius) var(--radius);
      padding: 16px;
      font-family: var(--font-mono);
      font-size: 12px;
      line-height: 1.6;
      overflow-x: auto;
      white-space: pre;
      max-height: 500px;
      overflow-y: auto;
    }

    .request-summary {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 10px 14px;
      margin-bottom: 16px;
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
  </style>
</head>
<body>
  <h1>Code Generator</h1>

  <div id="emptyState" class="empty-state">
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="48" height="48" style="opacity:0.3">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
        d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
    </svg>
    <span>No code snippets yet</span>
    <span style="font-size:11px">Call generate-code-snippet to generate code for an API request</span>
  </div>

  <div id="codeContent" style="display:none">
    <div id="requestSummary" class="request-summary"></div>
    <div class="lang-tabs" id="langTabs"></div>
    <div class="code-container">
      <button class="copy-btn" onclick="copyCode()">Copy</button>
      <div id="codeDisplay" class="code-display"></div>
    </div>
  </div>

  <script>
    ${MCP_COMMS_SCRIPT}

    let snippets = [];
    let activeLanguage = '';

    function escapeHtml(s) {
      return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    function highlightCode(code, language) {
      // Simple line-by-line highlighting
      return escapeHtml(code).split('\\n').map(function(line) {
        // Comments (# or //)
        if (line.trimStart().startsWith('#') || line.trimStart().startsWith('//')) {
          return '<span class="tok-comment">' + line + '</span>';
        }
        // Highlight strings in quotes
        line = line.replace(/"([^"]*)"/g, '<span class="tok-str">"$1"</span>');
        line = line.replace(/'([^']*)'/g, "<span class='tok-str'>'$1'</span>");
        // Highlight numbers
        line = line.replace(/\\b(\\d+\\.?\\d*)\\b/g, '<span class="tok-num">$1</span>');
        return line;
      }).join('\\n');
    }

    function renderSnippets(data) {
      document.getElementById('emptyState').style.display = 'none';
      document.getElementById('codeContent').style.display = 'block';

      snippets = data.snippets || [];

      // Show request summary
      if (data.request) {
        const r = data.request;
        document.getElementById('requestSummary').innerHTML =
          '<span class="method-badge method-' + (r.method || 'GET') + '">' + (r.method || 'GET') + '</span>' +
          '<span style="font-family:var(--font-mono); color:var(--text)">' + escapeHtml(r.url || '') + '</span>';
      }

      // Render language tabs
      const tabsEl = document.getElementById('langTabs');
      tabsEl.innerHTML = '';
      snippets.forEach((s, i) => {
        const btn = document.createElement('button');
        btn.className = 'lang-tab' + (i === 0 ? ' active' : '');
        btn.textContent = s.label;
        btn.onclick = () => selectLanguage(s.language, btn);
        tabsEl.appendChild(btn);
      });

      // Show first language
      if (snippets.length > 0) {
        activeLanguage = snippets[0].language;
        showCode(snippets[0]);
      }
    }

    function selectLanguage(language, btnEl) {
      document.querySelectorAll('.lang-tab').forEach(t => t.classList.remove('active'));
      btnEl.classList.add('active');
      activeLanguage = language;
      const snippet = snippets.find(s => s.language === language);
      if (snippet) showCode(snippet);
    }

    function showCode(snippet) {
      document.getElementById('codeDisplay').innerHTML = highlightCode(snippet.code, snippet.language);
    }

    function copyCode() {
      const snippet = snippets.find(s => s.language === activeLanguage);
      if (!snippet) return;
      navigator.clipboard.writeText(snippet.code).then(() => {
        const btn = document.querySelector('.copy-btn');
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
      });
    }

    // Tool result: receives structuredContent with code snippets
    function onToolResult(params) {
      const data = params?.structuredContent;
      if (data) renderSnippets(data);
    }
  </script>
</body>
</html>`;
}
