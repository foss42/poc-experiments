/**
 * Collection Browser UI - MCP App 2
 *
 * Dashboard showing all saved requests as a filterable table
 * plus a Chart.js bar chart of mock response times.
 * Receives data via ui/notifications/tool-input.
 */

import { baseStyles, collectionBrowserStyles } from '../styles.js';
import { savedRequests } from '../data/requests-data.js';

export function COLLECTION_BROWSER_UI(): string {
  const requestsJSON = JSON.stringify(savedRequests);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API Dash – Collection Browser</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"><\/script>
  <style>
    ${baseStyles}
    ${collectionBrowserStyles}
  </style>
</head>
<body>

  <div class="header">
    <div class="header-left">
      <span class="app-icon">📚</span>
      <div>
        <div class="title">Collection Browser</div>
        <div class="subtitle" id="collectionSubtitle">Loading collection...</div>
      </div>
    </div>
    <div class="stats-row" id="statsRow">
      <div class="stat-chip" id="statTotal">— requests</div>
      <div class="stat-chip success" id="statAvgTime">— avg ms</div>
    </div>
  </div>

  <div class="toolbar">
    <div class="method-filters" id="methodFilters">
      <button class="method-filter active" data-method="ALL">All</button>
      <button class="method-filter get" data-method="GET">GET</button>
      <button class="method-filter post" data-method="POST">POST</button>
      <button class="method-filter put" data-method="PUT">PUT</button>
      <button class="method-filter delete" data-method="DELETE">DELETE</button>
    </div>
    <input type="text" id="searchInput" class="search-input" placeholder="🔍  Search..." />
  </div>

  <div class="content-grid">
    <!-- Requests Table -->
    <div class="table-panel">
      <div class="panel-title">Saved Requests</div>
      <div class="table-wrap">
        <table id="requestsTable">
          <thead>
            <tr>
              <th>Method</th>
              <th>Name</th>
              <th>URL</th>
              <th>Tags</th>
              <th>Status</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody id="tableBody"></tbody>
        </table>
      </div>
    </div>

    <!-- Chart Panel -->
    <div class="chart-panel">
      <div class="panel-title">Response Times (ms)</div>
      <div class="chart-wrap">
        <canvas id="responseTimeChart"></canvas>
      </div>
    </div>
  </div>

  <script>
    const ALL_REQUESTS = ${requestsJSON};
    let currentFilter = 'ALL';
    let searchTerm = '';
    let chartInstance = null;
    let displayedRequests = ALL_REQUESTS;

    // MCP communication
    let nextId = 1;
    const pending = new Map();

    function mcpRequest(method, params) {
      const id = nextId++;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        window.parent.postMessage({ jsonrpc: '2.0', id, method, params: params || {} }, '*');
      });
    }

    function mcpNotify(method, params) {
      window.parent.postMessage({ jsonrpc: '2.0', method, params: params || {} }, '*');
    }

    window.addEventListener('message', (e) => {
      const msg = e.data;
      if (!msg?.jsonrpc) return;

      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        msg.error ? reject(msg.error) : resolve(msg.result);
        return;
      }

      // Handle tool-input hydration (override requests data from tool)
      if (msg.method === 'ui/notifications/tool-input') {
        const sc = msg.params?.structuredContent || msg.params?.arguments;
        if (sc && sc.requests) {
          renderAll(sc.requests);
        }
      }
    });

    const METHOD_COLORS = {
      GET: { bg: '#3b82f620', text: '#3b82f6', border: '#3b82f640' },
      POST: { bg: '#22c55e20', text: '#22c55e', border: '#22c55e40' },
      PUT: { bg: '#f9731620', text: '#f97316', border: '#f9731640' },
      DELETE: { bg: '#ef444420', text: '#ef4444', border: '#ef444440' },
      PATCH: { bg: '#a855f720', text: '#a855f7', border: '#a855f740' },
    };

    function getMethodStyle(method) {
      return METHOD_COLORS[method] || { bg: '#6b728020', text: '#6b7280', border: '#6b728040' };
    }

    function getFilteredRequests(requests) {
      return requests.filter(r => {
        const matchMethod = currentFilter === 'ALL' || r.method === currentFilter;
        const matchSearch = !searchTerm ||
          r.name.toLowerCase().includes(searchTerm) ||
          r.url.toLowerCase().includes(searchTerm) ||
          r.tags.some(t => t.toLowerCase().includes(searchTerm));
        return matchMethod && matchSearch;
      });
    }

    function renderTable(requests) {
      const tbody = document.getElementById('tableBody');
      if (requests.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">No requests match filters</td></tr>';
        return;
      }

      tbody.innerHTML = requests.map(req => {
        const ms = getMethodStyle(req.method);
        const statusColor = req.mockResponse.status < 300 ? '#22c55e' : req.mockResponse.status < 400 ? '#f59e0b' : '#ef4444';
        const tags = req.tags.map(t => '<span class="tag">' + t + '</span>').join('');
        const shortUrl = req.url.length > 50 ? req.url.substring(0, 50) + '…' : req.url;

        return \`<tr>
          <td><span class="method-badge" style="background:\${ms.bg};color:\${ms.text};border-color:\${ms.border}">\${req.method}</span></td>
          <td class="name-cell">\${req.name}</td>
          <td class="url-cell" title="\${req.url}">\${shortUrl}</td>
          <td>\${tags}</td>
          <td><span style="color:\${statusColor};font-weight:600;font-size:10px">\${req.mockResponse.status}</span></td>
          <td class="time-cell">\${req.mockResponse.timeMs}ms</td>
        </tr>\`;
      }).join('');
    }

    function renderChart(requests) {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const textColor = isDark ? '#cccccc' : '#333333';
      const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

      const labels = requests.map(r => r.name.length > 20 ? r.name.substring(0, 18) + '…' : r.name);
      const times = requests.map(r => r.mockResponse.timeMs);
      const bgColors = requests.map(r => {
        const ms = getMethodStyle(r.method);
        return ms.bg.replace('20', 'cc');
      });
      const borderColors = requests.map(r => getMethodStyle(r.method).text);

      if (chartInstance) chartInstance.destroy();

      const ctx = document.getElementById('responseTimeChart').getContext('2d');
      chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Response Time (ms)',
            data: times,
            backgroundColor: bgColors,
            borderColor: borderColors,
            borderWidth: 1.5,
            borderRadius: 4,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(15,15,15,0.95)',
              titleColor: '#fff',
              bodyColor: '#ccc',
              padding: 8,
              cornerRadius: 6,
              callbacks: {
                label: (ctx) => \`\${ctx.parsed.y} ms\`,
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: textColor, font: { size: 9 }, maxRotation: 35 }
            },
            y: {
              beginAtZero: true,
              grid: { color: gridColor },
              ticks: { color: textColor, font: { size: 9 }, callback: v => v + 'ms' }
            }
          }
        }
      });
    }

    function updateStats(requests) {
      const total = requests.length;
      const avgTime = total > 0 ? Math.round(requests.reduce((s, r) => s + r.mockResponse.timeMs, 0) / total) : 0;

      document.getElementById('statTotal').textContent = total + ' requests';
      document.getElementById('statAvgTime').textContent = avgTime + ' avg ms';
      document.getElementById('collectionSubtitle').textContent =
        'Showing ' + total + ' of ' + ALL_REQUESTS.length + ' requests · Filtered by: ' + currentFilter;
    }

    function renderAll(requests) {
      displayedRequests = requests;
      const filtered = getFilteredRequests(requests);
      renderTable(filtered);
      renderChart(filtered);
      updateStats(filtered);
    }

    // Event listeners
    document.getElementById('methodFilters').addEventListener('click', (e) => {
      const btn = e.target.closest('.method-filter');
      if (!btn) return;
      currentFilter = btn.dataset.method;
      document.querySelectorAll('.method-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderAll(displayedRequests);
    });

    document.getElementById('searchInput').addEventListener('input', (e) => {
      searchTerm = e.target.value.toLowerCase();
      renderAll(displayedRequests);
    });

    // Initialize
    async function initialize() {
      try {
        await mcpRequest('ui/initialize', {
          protocolVersion: '2025-11-21',
          capabilities: {},
          clientInfo: { name: 'apidash-collection-browser', version: '1.0.0' }
        });
        mcpNotify('ui/notifications/initialized', {});
      } catch(e) {
        // standalone mode
      }

      renderAll(ALL_REQUESTS);

      mcpNotify('ui/notifications/size-changed', {
        width: document.body.scrollWidth,
        height: document.body.scrollHeight + 60,
      });
    }

    initialize();
  <\/script>
</body>
</html>`;
}
