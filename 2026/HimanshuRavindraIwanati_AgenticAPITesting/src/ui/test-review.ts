import type { ApiTestCase } from "../types.js";
import { getRpcClientScript } from "../utils/rpc-client.js";
import { getApplyHostContextScript } from "../utils/apply-host-context.js";
import { getSharedStyles } from "../utils/shared-styles.js";

const TYPE_COLORS: Record<string, string> = {
  happy_path:      "#22c55e",
  boundary_value:  "#f59e0b",
  error_injection: "#ef4444",
  security_probe:  "#8b5cf6",
};

export function buildTestReviewHTML(tests: ApiTestCase[], sessionId: string): string {
  const enabledCount = tests.filter((t) => t.enabled).length;

  const rows = tests.map((tc) =>
    `<tr id="row-${tc.id}" class="test-row ${tc.enabled ? "enabled" : "disabled"}">` +
    `<td class="td-toggle"><label class="toggle-switch">` +
    `<input type="checkbox" id="toggle-${tc.id}" ${tc.enabled ? "checked" : ""} onchange="handleToggle('${tc.id}', this.checked)" />` +
    `<span class="toggle-slider"></span></label></td>` +
    `<td><span class="test-name">${tc.name}</span><span class="test-desc">${tc.description}</span></td>` +
    `<td><span class="badge" style="background:${TYPE_COLORS[tc.type] ?? "#6b7280"}20;color:${TYPE_COLORS[tc.type] ?? "#6b7280"};border:1px solid ${TYPE_COLORS[tc.type] ?? "#6b7280"}40">${tc.type.replace("_"," ")}</span></td>` +
    `<td>${tc.priority}</td>` +
    `<td><code class="code-tag">${tc.method} ${tc.path}</code></td>` +
    `</tr>`
  ).join("\n");

  return (
    `<!DOCTYPE html><html lang="en"><head>` +
    `<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">` +
    `<title>Test Review</title>` +
    getSharedStyles() +
    `<style>` +
    `.test-row.disabled{opacity:.45}` +
    `.test-name{display:block;font-weight:var(--font-weight-medium)}` +
    `.test-desc{display:block;font-size:var(--font-size-xs);color:var(--color-text-muted);margin-top:2px}` +
    `.bulk-actions{display:flex;gap:var(--space-2);margin-bottom:var(--space-3);align-items:center}` +
    `.counter{color:var(--color-text-muted);font-size:var(--font-size-sm);margin-left:auto}` +
    `.confirm-bar{margin-top:var(--space-4);padding:var(--space-3) var(--space-4);background:var(--color-background-secondary);border:1px solid var(--color-border);border-radius:var(--radius-lg);display:flex;align-items:center;justify-content:space-between}` +
    `.confirm-summary{color:var(--color-text-secondary);font-size:var(--font-size-sm)}` +
    `.confirm-summary strong{color:var(--color-text-primary)}` +
    `.td-toggle{width:56px}` +
    `.state-badge{background:var(--color-background-card);border:1px solid var(--color-border);border-radius:var(--radius-full);padding:var(--space-1) var(--space-3);font-size:var(--font-size-xs);color:var(--color-warning);font-weight:var(--font-weight-semibold)}` +
    `</style></head><body>` +

    `<div class="page-header"><div>` +
    `<h2 style="color:var(--color-accent-primary)">&#x1F9EA; Test Review &amp; Approval</h2>` +
    `<p>API Dash Agent &mdash; Session <code>${sessionId}</code></p>` +
    `</div><div class="state-badge">&#x23F3; AWAITING APPROVAL</div></div>` +

    `<div class="bulk-actions">` +
    `<button class="btn btn-ghost" onclick="selectAll()">Select All</button>` +
    `<button class="btn btn-ghost" onclick="selectNone()">Select None</button>` +
    `<button class="btn btn-ghost" onclick="selectByType('happy_path')">Happy Path Only</button>` +
    `<button class="btn btn-ghost" onclick="copyTests()">&#x1F4CB; Copy JSON</button>` +
    `<span class="counter" id="counter">Loading&hellip;</span>` +
    `</div>` +

    `<table class="mcp-table"><thead><tr>` +
    `<th>Run</th><th>Test Name</th><th>Type</th><th>Priority</th><th>Endpoint</th>` +
    `</tr></thead><tbody id="test-table">${rows}</tbody></table>` +

    `<div class="confirm-bar">` +
    `<div class="confirm-summary"><strong id="approved-count">${enabledCount}</strong> of <strong>${tests.length}</strong> tests selected</div>` +
    `<button class="btn btn-primary" id="confirm-btn" onclick="confirmSelection()">&#x2705; Confirm &amp; Begin Execution</button>` +
    `</div>` +
    `<div class="status-bar" id="status-bar"></div>` +

    `<script>` +
    getRpcClientScript() + "\n" +
    getApplyHostContextScript() + "\n" +
    `var SESSION_ID=${JSON.stringify(sessionId)};` +
    `var ALL_TESTS=${JSON.stringify(tests)};` +
    `var toggleState={};ALL_TESTS.forEach(function(t){toggleState[t.id]=t.enabled;});` +

    `request('ui/initialize',{protocolVersion:'2025-11-21'}).then(function(res){` +
    `applyHostContext(res&&res.hostContext);notify('ui/notifications/initialized');updateCounter();notifySize();` +
    `}).catch(function(){updateCounter();});` +

    `function handleToggle(id,checked){toggleState[id]=checked;` +
    `var r=document.getElementById('row-'+id);if(r)r.className='test-row '+(checked?'enabled':'disabled');updateCounter();}` +

    `function updateCounter(){` +
    `var n=Object.values(toggleState).filter(Boolean).length;` +
    `document.getElementById('counter').textContent=n+' selected';` +
    `document.getElementById('approved-count').textContent=n;` +
    `document.getElementById('confirm-btn').disabled=n===0;}` +

    `function selectAll(){Object.keys(toggleState).forEach(function(id){toggleState[id]=true;` +
    `var e=document.getElementById('toggle-'+id);if(e)e.checked=true;` +
    `var r=document.getElementById('row-'+id);if(r)r.className='test-row enabled';});updateCounter();}` +

    `function selectNone(){Object.keys(toggleState).forEach(function(id){toggleState[id]=false;` +
    `var e=document.getElementById('toggle-'+id);if(e)e.checked=false;` +
    `var r=document.getElementById('row-'+id);if(r)r.className='test-row disabled';});updateCounter();}` +

    `function selectByType(type){ALL_TESTS.forEach(function(t){` +
    `var c=t.type===type;toggleState[t.id]=c;` +
    `var e=document.getElementById('toggle-'+t.id);if(e)e.checked=c;` +
    `var r=document.getElementById('row-'+t.id);if(r)r.className='test-row '+(c?'enabled':'disabled');` +
    `});updateCounter();}` +

    `function copyTests(){` +
    `var ids=ALL_TESTS.filter(function(t){return toggleState[t.id];}).map(function(t){return t.id;});` +
    `request('ui/clipboard-write',{text:JSON.stringify(ids,null,2)})` +
    `.then(function(){showStatus('Copied '+ids.length+' test IDs','success');})` +
    `.catch(function(){showStatus('Clipboard unavailable','error');});}` +

    `function confirmSelection(){` +
    `var approved=Object.keys(toggleState).filter(function(k){return toggleState[k];});` +
    `var skipped=Object.keys(toggleState).filter(function(k){return !toggleState[k];});` +
    `var btn=document.getElementById('confirm-btn');btn.disabled=true;btn.textContent='Sending...';` +
    `request('ui/update-model-context',{content:[{type:'structuredContent',structuredContent:{` +
    `approvedTests:approved,skippedTests:skipped,sessionId:SESSION_ID,userDecisionTimestamp:new Date().toISOString()}}]})` +
    `.then(function(){showStatus(approved.length+' tests approved - execution starting','success');btn.textContent='Confirmed';})` +
    `.catch(function(){` +
    `request('ui/message',{role:'user',content:[{type:'text',` +
    `text:'AGENT_ACTION: execute_tests | approvedTests: '+JSON.stringify(approved)+' | sessionId: '+SESSION_ID}]})` +
    `.then(function(){showStatus(approved.length+' tests confirmed via chat','success');btn.textContent='Confirmed';})` +
    `.catch(function(e){showStatus('Error: '+e,'error');btn.disabled=false;btn.textContent='Confirm & Begin Execution';});` +
    `});notifySize();}` +

    `function showStatus(msg,type){var b=document.getElementById('status-bar');b.textContent=msg;b.className='status-bar '+type;notifySize();}` +
    `function notifySize(){notify('ui/notifications/size-changed',{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight});}` +
    `new ResizeObserver(notifySize).observe(document.body);` +
    `</script></body></html>`
  );
}
