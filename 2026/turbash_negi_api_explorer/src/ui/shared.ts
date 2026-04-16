/**
 * Shared UI styles and utilities for all MCP tool interfaces
 */

export const SHARED_STYLES = `
:root {
  --bg: #0d1117;
  --panel: #151b23;
  --ink: #e6edf3;
  --muted: #93a1b1;
  --accent: #2f81f7;
  --warn: #d29922;
  --line: #2d3748;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  font-family: "Segoe UI", "Inter", system-ui, -apple-system, sans-serif;
  color: var(--ink);
  background: var(--bg);
  padding: 1rem;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

h1, h2, h3 {
  margin: 0;
}

h1 {
  font-size: 1.8rem;
  margin-bottom: 0.5rem;
}

h2 {
  font-size: 1.4rem;
  margin-bottom: 1rem;
}

h3 {
  font-size: 1.05rem;
  margin-bottom: 0.8rem;
}

.panel {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.28);
}

.section-title {
  font-size: 1.2rem;
  margin: 0 0 1rem 0;
  font-weight: 600;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-group.full {
  grid-column: 1 / -1;
}

label {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--ink);
}

input, select, textarea {
  padding: 0.7rem;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #0f141c;
  font-family: inherit;
  font-size: 0.95rem;
  color: var(--ink);
}

input:focus, select:focus, textarea:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 2px rgba(47, 129, 247, 0.2);
}

input::placeholder {
  color: #6b7785;
}

.button-group {
  display: flex;
  gap: 0.8rem;
  flex-wrap: wrap;
  align-items: center;
}

button {
  padding: 0.7rem 1.4rem;
  border: 1px solid transparent;
  border-radius: 8px;
  font-family: inherit;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  font-size: 0.95rem;
}

.btn-primary {
  background: var(--accent);
  color: #ffffff;
}

.btn-primary:hover:not(:disabled) {
  filter: brightness(1.08);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: transparent;
  border-color: var(--line);
  color: var(--ink);
}

.btn-secondary:hover:not(:disabled) {
  background: #1a2330;
}

.btn-small {
  padding: 0.5rem 0.9rem;
  font-size: 0.85rem;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.4rem 1rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  gap: 0.5rem;
}

.status-idle {
  background: #1a2330;
  color: var(--muted);
}

.status-working {
  background: rgba(210, 153, 34, 0.15);
  color: var(--warn);
}

.status-done {
  background: rgba(47, 129, 247, 0.16);
  color: #9cc2ff;
}

.status-error {
  background: rgba(248, 81, 73, 0.16);
  color: #ffaba8;
}

.spinner {
  display: inline-block;
  width: 1em;
  height: 1em;
  border: 2px solid rgba(47, 129, 247, 0.28);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  vertical-align: -0.2em;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.log-list {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 300px;
  overflow-y: auto;
  font-family: "Monaco", "Menlo", monospace;
  font-size: 0.85rem;
  background: #0f141c;
  border: 1px solid var(--line);
  border-radius: 8px;
}

.log-list li {
  padding: 0.5rem 0.8rem;
  border-bottom: 1px solid var(--line);
  color: var(--muted);
}

.log-list li:last-child {
  border-bottom: none;
}

.log-list li.success {
  color: #9cc2ff;
}

.log-list li.warning {
  color: var(--warn);
}

.log-list li.error {
  color: #ffaba8;
}

.json-block {
  background: #0f141c;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 1rem;
  font-family: "Monaco", "Menlo", monospace;
  font-size: 0.8rem;
  overflow: auto;
  max-height: 400px;
  white-space: pre-wrap;
  word-break: break-all;
}

.grid {
  display: grid;
  gap: 1.2rem;
}

.grid-2 {
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

.grid-3 {
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
}

.card {
  background: #111823;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 1.2rem;
  transition: all 0.2s;
}

.card:hover {
  border-color: #3a4659;
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.24);
}

.card-title {
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.card-meta {
  font-size: 0.85rem;
  color: var(--muted);
}

.badge {
  display: inline-block;
  padding: 0.3rem 0.7rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
  background: rgba(47, 129, 247, 0.16);
  color: #b6d2ff;
}

.badge.secondary {
  background: #1a2330;
  color: var(--muted);
}

.badge.warning {
  background: rgba(210, 153, 34, 0.16);
  color: var(--warn);
}

.empty-state {
  padding: 1rem;
  border: 1px dashed var(--line);
  border-radius: 10px;
  color: var(--muted);
  background: #0f141c;
}

.hidden {
  display: none !important;
}

@media (max-width: 768px) {
  .container {
    padding: 0.5rem;
  }

  .panel {
    padding: 1rem;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .button-group {
    flex-direction: column;
    width: 100%;
  }

  button {
    width: 100%;
  }

  .grid-2,
  .grid-3 {
    grid-template-columns: 1fr;
  }
}
`;
