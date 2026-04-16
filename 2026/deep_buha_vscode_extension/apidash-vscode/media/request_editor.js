// API Dash VS Code Extension - Webview JavaScript
// Handles UI interactions and communicates with Extension Host via postMessage

(function () {
    // @ts-ignore
    const vscode = acquireVsCodeApi();

    // DOM Elements
    const methodSelect = document.getElementById('method-select');
    const urlInput = document.getElementById('url-input');
    const sendBtn = document.getElementById('send-btn');
    const bodyTypeSelect = document.getElementById('body-type');
    const bodyEditor = document.getElementById('body-editor');
    const responseSection = document.getElementById('response-section');
    const loadingOverlay = document.getElementById('loading');
    const statusBadge = document.getElementById('status-badge');
    const responseTime = document.getElementById('response-time');
    const responseSize = document.getElementById('response-size');
    const responseBody = document.getElementById('response-body');
    const responseHeaders = document.getElementById('response-headers');
    const codegenOutput = document.getElementById('codegen-output');
    const codegenLanguage = document.getElementById('codegen-language');
    const codegenBtn = document.getElementById('codegen-btn');
    const copyBtn = document.getElementById('copy-btn');

    // ===== TAB SWITCHING =====
    document.querySelectorAll('.tabs .tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');
            document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(tabName + '-tab').classList.add('active');
        });
    });

    // Response tabs
    document.querySelectorAll('.response-tabs .tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-restab');
            document.querySelectorAll('.response-tabs .tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.response-tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById('res-' + tabName + '-tab').classList.add('active');
        });
    });

    // ===== BODY TYPE TOGGLE =====
    bodyTypeSelect.addEventListener('change', () => {
        bodyEditor.disabled = bodyTypeSelect.value === 'none';
        if (bodyTypeSelect.value === 'json') {
            bodyEditor.placeholder = '{\n  "key": "value"\n}';
        } else if (bodyTypeSelect.value === 'text') {
            bodyEditor.placeholder = 'Enter text body...';
        } else {
            bodyEditor.placeholder = '';
            bodyEditor.value = '';
        }
    });

    // ===== KEY-VALUE ROW MANAGEMENT =====
    function addKvRow(tableId, name, value, enabled) {
        name = name || '';
        value = value || '';
        enabled = enabled !== false;

        const table = document.getElementById(tableId);
        const row = document.createElement('div');
        row.className = 'kv-row';
        row.innerHTML = `
      <span class="kv-check"><input type="checkbox" ${enabled ? 'checked' : ''}></span>
      <span class="kv-name"><input type="text" placeholder="Name" value="${escapeHtml(name)}"></span>
      <span class="kv-value"><input type="text" placeholder="Value" value="${escapeHtml(value)}"></span>
      <span class="kv-action"><button title="Remove">×</button></span>
    `;

        // Remove button
        row.querySelector('.kv-action button').addEventListener('click', () => {
            row.remove();
        });

        table.appendChild(row);
    }

    // Add Row buttons
    document.querySelectorAll('.add-row-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            addKvRow(btn.getAttribute('data-table'), '', '', true);
        });
    });

    // Add initial empty rows
    addKvRow('params-table', '', '', true);
    addKvRow('headers-table', '', '', true);

    // ===== COLLECT REQUEST DATA =====
    function collectRequest() {
        return {
            url: urlInput.value.trim(),
            method: methodSelect.value,
            headers: collectKvData('headers-table'),
            params: collectKvData('params-table'),
            body: bodyEditor.value,
            bodyContentType: bodyTypeSelect.value,
        };
    }

    function collectKvData(tableId) {
        const rows = document.querySelectorAll('#' + tableId + ' .kv-row:not(.kv-header)');
        const data = [];
        rows.forEach(row => {
            const enabled = row.querySelector('.kv-check input').checked;
            const name = row.querySelector('.kv-name input').value;
            const value = row.querySelector('.kv-value input').value;
            if (name.trim()) {
                data.push({ name, value, enabled });
            }
        });
        return data;
    }

    // ===== SEND REQUEST =====
    sendBtn.addEventListener('click', () => {
        const url = urlInput.value.trim();
        if (!url) {
            urlInput.focus();
            urlInput.style.borderColor = 'var(--vscode-errorForeground)';
            setTimeout(() => { urlInput.style.borderColor = ''; }, 2000);
            return;
        }

        const request = collectRequest();
        vscode.postMessage({ command: 'sendRequest', request });
    });

    // Ctrl+Enter to send
    urlInput.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            sendBtn.click();
        }
    });

    // ===== CODE GENERATION =====
    codegenBtn.addEventListener('click', () => {
        const request = collectRequest();
        const language = codegenLanguage.value;
        vscode.postMessage({ command: 'generateCode', request, language });
    });

    copyBtn.addEventListener('click', () => {
        const text = codegenOutput.textContent;
        navigator.clipboard.writeText(text).then(() => {
            copyBtn.textContent = 'Copied!';
            setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1500);
        });
    });

    // ===== HANDLE MESSAGES FROM EXTENSION HOST =====
    window.addEventListener('message', (event) => {
        const message = event.data;

        switch (message.command) {
            case 'loading':
                loadingOverlay.style.display = 'flex';
                sendBtn.disabled = true;
                break;

            case 'response':
                loadingOverlay.style.display = 'none';
                sendBtn.disabled = false;
                showResponse(message.response);
                break;

            case 'generatedCode':
                codegenOutput.textContent = message.code;
                copyBtn.style.display = 'inline-block';
                break;

            case 'loadRequest':
                loadRequest(message.request);
                break;
        }
    });

    // ===== DISPLAY RESPONSE =====
    function showResponse(res) {
        responseSection.style.display = 'block';

        // Status badge
        statusBadge.textContent = res.statusCode || 'Error';
        statusBadge.className = 'status-badge ' + getStatusClass(res.statusCode);

        // Meta
        responseTime.textContent = res.time + ' ms';
        responseSize.textContent = formatBytes(res.size);

        // Body
        responseBody.textContent = res.body || '(empty response)';

        // Headers
        if (res.headers && Object.keys(res.headers).length > 0) {
            responseHeaders.textContent = Object.entries(res.headers)
                .map(([k, v]) => k + ': ' + v)
                .join('\n');
        } else {
            responseHeaders.textContent = '(no headers)';
        }

        // Scroll to response
        responseSection.scrollIntoView({ behavior: 'smooth' });
    }

    function getStatusClass(code) {
        if (!code || code === 0) { return 'error'; }
        if (code < 300) { return 'success'; }
        if (code < 400) { return 'redirect'; }
        if (code < 500) { return 'client-error'; }
        return 'server-error';
    }

    function formatBytes(bytes) {
        if (!bytes) { return '0 B'; }
        if (bytes < 1024) { return bytes + ' B'; }
        if (bytes < 1024 * 1024) { return (bytes / 1024).toFixed(1) + ' KB'; }
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    // ===== LOAD EXISTING REQUEST =====
    function loadRequest(req) {
        methodSelect.value = req.method || 'GET';
        urlInput.value = req.url || '';
        bodyTypeSelect.value = req.bodyContentType || 'none';
        bodyEditor.value = req.body || '';
        bodyEditor.disabled = (req.bodyContentType === 'none');

        // Clear and populate params
        clearKvRows('params-table');
        if (req.params && req.params.length > 0) {
            req.params.forEach(p => addKvRow('params-table', p.name, p.value, p.enabled));
        } else {
            addKvRow('params-table', '', '', true);
        }

        // Clear and populate headers
        clearKvRows('headers-table');
        if (req.headers && req.headers.length > 0) {
            req.headers.forEach(h => addKvRow('headers-table', h.name, h.value, h.enabled));
        } else {
            addKvRow('headers-table', '', '', true);
        }
    }

    function clearKvRows(tableId) {
        const rows = document.querySelectorAll('#' + tableId + ' .kv-row:not(.kv-header)');
        rows.forEach(row => row.remove());
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
})();
