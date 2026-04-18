/**
 * Utilities for building the iframe srcdoc content injected into widget iframes.
 */

/**
 * Safely serialize a value for embedding inside an inline `<script>` tag.
 * Escapes characters that would break script parsing: <, >, &, line/paragraph separators.
 */
export function serializeForInlineScript(value) {
  return JSON.stringify(value ?? null)
    .replace(/</g, '\\u003C')
    .replace(/>/g, '\\u003E')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/**
 * Build a CSP string from a cspObj returned by the tool's resource metadata.
 * Falls back to a strict default if no cspObj is provided.
 */
export function buildCspString(cspObj) {
  if (cspObj) {
    const connectDomains = (cspObj.connectDomains || []).filter(Boolean);
    const resourceDomains = (cspObj.resourceDomains || []).filter(Boolean);
    const frameDomains = (cspObj.frameDomains || []).filter(Boolean);
    const baseUriDomains = (cspObj.baseUriDomains || []).filter(Boolean);

    const allConnect = Array.from(new Set([...connectDomains, ...resourceDomains]));
    const connectSrc = allConnect.length > 0 ? allConnect.join(' ') : "'none'";
    const resourceSrc =
      resourceDomains.length > 0
        ? ["data:", "blob:", ...resourceDomains].join(' ')
        : 'data: blob:';
    const frameSrc = frameDomains.length > 0 ? frameDomains.join(' ') : "'none'";
    const baseUri = baseUriDomains.length > 0 ? baseUriDomains.join(' ') : "'none'";

    return [
      "default-src 'none'",
      "script-src 'unsafe-inline' " + resourceSrc,
      "style-src 'unsafe-inline' " + resourceSrc,
      'img-src ' + resourceSrc,
      'font-src ' + resourceSrc,
      'media-src ' + resourceSrc,
      'connect-src ' + connectSrc,
      'frame-src ' + frameSrc,
      "object-src 'none'",
      'base-uri ' + baseUri,
    ].join('; ');
  }

  // Default strict CSP
  return [
    "default-src 'none'",
    "script-src 'unsafe-inline'",
    "style-src 'unsafe-inline'",
    'img-src data: blob:',
    'font-src data: blob:',
    'media-src data: blob:',
    "connect-src 'none'",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
  ].join('; ');
}

/**
 * Generate the `<script>` injection that exposes `window.openai` to the iframe.
 * The configData blob fed in at build-time is non-authoritative bootstrap state.
 * Render-authoritative data must arrive through host notifications.
 */
export function buildOpenaiCompatScript(configData) {
  const serialized = serializeForInlineScript(configData);

  const contextScript = `<script type="application/json" id="openai-compat-config">${serialized}</script>`;

  const polyfillScript = `<script>
(function() {
  if (!window.openai) {
    const configEl = document.getElementById('openai-compat-config');
    let config = {};
    if (configEl) {
      try { config = JSON.parse(configEl.textContent); } catch (e) {}
    }

    let callId = 0;
    const dispatchGlobalsChanged = (reason) => {
      window.dispatchEvent(new CustomEvent('openai:set_globals', {
        detail: {
          reason,
          globals: {
            toolInput: window.openai?.toolInput,
            toolOutput: window.openai?.toolOutput,
            modelContext: window.openai?.modelContext,
            widgetState: window.openai?.widgetState,
          },
        },
      }));
    };

    window.openai = {
      toolInput:    config.toolInput ?? null,
      toolOutput:   null,
      modelContext: config.modelContext ?? null,
      theme:        config.theme        || 'light',
      displayMode:  config.displayMode  || 'inline',
      viewMode:     config.viewMode     || 'inline',
      viewParams:   config.viewParams   || {},
      widgetState:  config.widgetState  || null,

      callTool: (name, args) => {
        const id = ++callId;
        return new Promise((resolve, reject) => {
          const handleMessage = (e) => {
            const msg = e.data;
            if (msg.jsonrpc === '2.0' && msg.id === id) {
              window.removeEventListener('message', handleMessage);
              if (msg.error) reject(new Error(msg.error.message || 'Tool call failed'));
              else resolve(msg.result);
            }
          };
          window.addEventListener('message', handleMessage);
          window.parent.postMessage(
            { jsonrpc: '2.0', id, method: 'tools/call', params: { name, arguments: args || {} } },
            '*'
          );
        });
      },

      structuredContent: (content) => {
        window.parent.postMessage(
          { jsonrpc: '2.0', method: 'ui/update-model-context', params: { structuredContent: content } },
          '*'
        );
      },

      sendFollowUpMessage: (text) => {
        window.parent.postMessage(
          { jsonrpc: '2.0', method: 'ui/send-follow-up', params: { text } },
          '*'
        );
      },
    };

    dispatchGlobalsChanged('initial');

    // Live-update window.openai when the host pushes tool lifecycle notifications.
    window.addEventListener('message', (e) => {
      if (!e.data) return;

      if (e.data.method === 'ui/notifications/tool-input') {
        const p = e.data.params || {};
        if (p.arguments && Object.keys(p.arguments).length > 0) {
          window.openai.toolInput = p.arguments;
          dispatchGlobalsChanged('tool-input');
        }
      }

      if (e.data.method === 'ui/notifications/tool-result') {
        window.openai.toolOutput = e.data.params || null;
        dispatchGlobalsChanged('tool-result');
      }

      if (e.data.method === 'ui/notifications/widget-state') {
        window.openai.widgetState = e.data.params || null;
        dispatchGlobalsChanged('widget-state');
      }

      if (e.data.method === 'ui/notifications/model-context') {
        window.openai.modelContext = e.data.params ?? null;
        dispatchGlobalsChanged('model-context');
      }
    });
  }
})();
</script>`;

  return { contextScript, polyfillScript };
}

/**
 * Inject the CSP meta tag + openai compat scripts into the widget HTML,
 * inserting into the <head> if one exists, otherwise wrapping the body.
 */
export function buildIframeSrcdoc({ html, cspMetaTag, contextScript, polyfillScript }) {
  const headContent = cspMetaTag + contextScript + polyfillScript;

  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (match) => match + headContent);
  }
  if (/<html[^>]*>/i.test(html)) {
    return html.replace(/<html[^>]*>/i, (match) => match + '<head>' + headContent + '</head>');
  }
  return `<!DOCTYPE html><html><head>${headContent}<meta charset="UTF-8"></head><body>${html}</body></html>`;
}
