import type { HealingPatch } from "../types.js";
import { getRpcClientScript } from "../utils/rpc-client.js";
import { getApplyHostContextScript } from "../utils/apply-host-context.js";
import { getSharedStyles } from "../utils/shared-styles.js";

const SEVERITY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  cosmetic:      { bg: "#6c708620", text: "#6c7086", label: "COSMETIC" },
  compatible:    { bg: "#a6e3a120", text: "#a6e3a1", label: "COMPATIBLE" },
  breaking:      { bg: "#f38ba820", text: "#f38ba8", label: "BREAKING" },
  architectural: { bg: "#cba6f720", text: "#cba6f7", label: "ARCHITECTURAL" },
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function diffLines(lines: string[], other: string[]): string {
  return lines.map((line) => {
    const cls = other.includes(line) ? "diff-line" : "diff-line removed";
    const prefix = other.includes(line) ? "&nbsp; " : "- ";
    return `<div class="${cls}">${prefix}${escapeHtml(line)}</div>`;
  }).join("\n");
}

function addedLines(lines: string[], other: string[]): string {
  return lines.map((line) => {
    const cls = other.includes(line) ? "diff-line" : "diff-line added";
    const prefix = other.includes(line) ? "&nbsp; " : "+ ";
    return `<div class="${cls}">${prefix}${escapeHtml(line)}</div>`;
  }).join("\n");
}

export function buildHealingDiffHTML(patch: HealingPatch, sessionId: string): string {
  const sev = SEVERITY_COLORS[patch.severity] ?? SEVERITY_COLORS["breaking"];
  const confidencePct = Math.round(patch.confidence * 100);
  const originalLines = JSON.stringify(patch.originalAssertion, null, 2).split("\n");
  const proposedLines = JSON.stringify(patch.proposedAssertion, null, 2).split("\n");

  return (
    `<!DOCTYPE html><html lang="en"><head>` +
    `<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">` +
    `<title>Healing Diff</title>` +
    getSharedStyles() +
    `<style>` +
    `.diff-grid{display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);margin-bottom:var(--space-4)}` +
    `.diff-panel-header.before{color:var(--color-danger)}` +
    `.diff-panel-header.after{color:var(--color-success)}` +
    `.diff-body{padding:var(--space-3);font-family:var(--font-family-mono);font-size:var(--font-size-sm);line-height:var(--line-height-code)}` +
    `.diff-line{white-space:pre-wrap;border-radius:var(--radius-sm);padding:1px var(--space-1)}` +
    `.diff-line.removed{background:#f38ba812;color:var(--color-danger)}` +
    `.diff-line.added{background:#a6e3a112;color:var(--color-success)}` +
    `.meta-row{display:flex;gap:var(--space-3);margin-bottom:var(--space-4);flex-wrap:wrap}` +
    `.meta-chip{background:var(--color-background-card);border:1px solid var(--color-border);border-radius:var(--radius-md);padding:var(--space-1) 10px;font-size:var(--font-size-sm)}` +
    `.meta-chip strong{color:var(--color-accent-primary)}` +
    `.action-bar{display:flex;gap:10px;align-items:center;background:var(--color-background-secondary);border:1px solid var(--color-border);border-radius:var(--radius-lg);padding:var(--space-3) var(--space-4)}` +
    `.action-note{color:var(--color-text-muted);font-size:var(--font-size-xs);margin-left:auto}` +
    `.severity-badge{padding:3px 10px;border-radius:var(--radius-full);font-size:var(--font-size-xs);font-weight:var(--font-weight-bold);background:${sev.bg};color:${sev.text};border:1px solid ${sev.text}40}` +
    `.confidence{font-size:var(--font-size-xs);color:var(--color-text-muted)}` +
    `.reasoning-header{background:var(--color-background-card);padding:var(--space-2) var(--space-3);font-size:var(--font-size-xs);font-weight:var(--font-weight-semibold);color:var(--color-text-muted);cursor:pointer;display:flex;justify-content:space-between;border-bottom:1px solid var(--color-border)}` +
    `.reasoning-body{padding:var(--space-3);color:var(--color-text-secondary);font-size:var(--font-size-sm);line-height:var(--line-height-base)}` +
    `@media(max-width:600px){.diff-grid{grid-template-columns:1fr}}` +
    `</style></head><body>` +

    `<div class="page-header"><div>` +
    `<h2 style="color:var(--color-danger)">&#x1F527; Self-Healing Patch Review</h2>` +
    `<p>API Dash Agent &mdash; Session <code>${sessionId}</code></p>` +
    `</div><div style="display:flex;flex-direction:column;align-items:flex-end;gap:var(--space-2)">` +
    `<div class="severity-badge">${sev.label} DRIFT</div>` +
    `<div class="confidence">Confidence: <span style="color:${confidencePct >= 80 ? "var(--color-success)" : "var(--color-warning)"};font-weight:600">${confidencePct}%</span></div>` +
    `</div></div>` +

    `<div class="meta-row">` +
    `<div class="meta-chip">Test: <strong>${patch.testId}</strong></div>` +
    `<div class="meta-chip">Field: <strong>${patch.field}</strong></div>` +
    `<div class="meta-chip">Change: <strong>${patch.originalAssertion.expected}</strong> &rarr; <strong>${patch.proposedAssertion.expected}</strong></div>` +
    `</div>` +

    `<div class="diff-grid">` +
    `<div class="card"><div class="card-header diff-panel-header before">&#x2B1B; Before (Original)</div>` +
    `<div class="diff-body">${diffLines(originalLines, proposedLines)}</div></div>` +
    `<div class="card"><div class="card-header diff-panel-header after">&#x2705; After (Proposed)</div>` +
    `<div class="diff-body">${addedLines(proposedLines, originalLines)}</div></div>` +
    `</div>` +

    `<div class="card" style="margin-bottom:var(--space-4)">` +
    `<div class="reasoning-header" onclick="toggleReasoning()">` +
    `&#x1F4A1; Why did this change? (LLM Analysis) <span id="rtoggle">&#x25BC;</span></div>` +
    `<div class="reasoning-body" id="rbody">${escapeHtml(patch.reasoning)}</div>` +
    `</div>` +

    `<div class="action-bar">` +
    `<button class="btn btn-success" onclick="sendDecision('approve')">&#x2705; Approve Patch</button>` +
    `<button class="btn btn-danger"  onclick="sendDecision('reject')">&#x274C; Reject</button>` +
    `<button class="btn btn-ghost"   onclick="copyDiff()">&#x1F4CB; Copy Diff</button>` +
    `<div class="action-note">Human review required &mdash; ${sev.label} severity</div>` +
    `</div>` +
    `<div class="status-bar" id="status-bar"></div>` +

    `<script>` +
    getRpcClientScript() + "\n" +
    getApplyHostContextScript() + "\n" +
    `var SESSION_ID=${JSON.stringify(sessionId)};` +
    `var PATCH=${JSON.stringify(patch)};` +

    `request('ui/initialize',{protocolVersion:'2025-11-21'}).then(function(res){` +
    `applyHostContext(res&&res.hostContext);notify('ui/notifications/initialized');notifySize();` +
    `}).catch(function(){notifySize();});` +

    `function sendDecision(d){` +
    `document.querySelectorAll('.btn').forEach(function(b){b.disabled=true;});` +
    `request('ui/message',{role:'user',content:[{type:'text',` +
    `text:'PATCH_DECISION: '+d+' | testId: '+PATCH.testId+' | field: '+PATCH.field+' | sessionId: '+SESSION_ID}]})` +
    `.then(function(){showStatus(d==='approve'?'Patch approved - resuming execution':'Patch rejected - escalating',d==='approve'?'success':'error');})` +
    `.catch(function(e){showStatus('Error: '+e,'error');});}` +

    `function copyDiff(){` +
    `var text=['HEALING DIFF: '+PATCH.testId,'Field: '+PATCH.field,'Severity: '+PATCH.severity.toUpperCase(),'',` +
    `'BEFORE:',JSON.stringify(PATCH.originalAssertion,null,2),'','AFTER:',JSON.stringify(PATCH.proposedAssertion,null,2),'',` +
    `'Confidence: '+Math.round(PATCH.confidence*100)+'%','Reasoning: '+PATCH.reasoning].join('\\n');` +
    `request('ui/clipboard-write',{text:text})` +
    `.then(function(){showStatus('Diff copied to clipboard','success');})` +
    `.catch(function(){showStatus('Clipboard unavailable','error');});}` +

    `function toggleReasoning(){` +
    `var b=document.getElementById('rbody');var t=document.getElementById('rtoggle');` +
    `var h=b.style.display==='none';b.style.display=h?'block':'none';t.innerHTML=h?'&#x25BC;':'&#x25B6;';notifySize();}` +

    `function showStatus(msg,type){var b=document.getElementById('status-bar');b.textContent=msg;b.className='status-bar '+type;notifySize();}` +
    `function notifySize(){notify('ui/notifications/size-changed',{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight});}` +
    `new ResizeObserver(notifySize).observe(document.body);` +
    `</script></body></html>`
  );
}
