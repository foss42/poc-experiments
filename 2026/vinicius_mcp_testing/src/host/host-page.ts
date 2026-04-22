/**
 * Host Page Template — Generates the wrapper HTML that a real MCP Apps host
 * would use to render an MCP App inside a sandboxed iframe.
 *
 * The generated page:
 * 1. Sets CSS custom properties from hostContext on :root (inherited by iframe)
 * 2. Creates a sandboxed <iframe> with the app HTML via srcdoc
 * 3. Relays postMessage traffic between the iframe and Node.js via __hostBridge
 */

export interface HostPageOptions {
  /** The raw HTML content from resources/read. */
  appHtml: string;
  /** CSS custom properties to inject (simulates host theme). */
  hostContext?: Record<string, string>;
  /** Transport mode: "playwright" uses exposeFunction, "http" uses fetch(). Default: "playwright". */
  transport?: "playwright" | "http";
  /** URL for the bridge endpoint (required when transport === "http"). */
  bridgeUrl?: string;
}

/**
 * Build the host wrapper page HTML.
 *
 * The page exposes a global `__hostBridge(msg)` function that Playwright
 * injects via page.exposeFunction(). The message relay works as follows:
 *
 *   iframe → postMessage → host page listener → __hostBridge(msg) →
 *   Node.js bridge.handleMessage() → response → host page → postMessage → iframe
 */
export function buildHostPage(options: HostPageOptions): string {
  const { appHtml, hostContext = {}, transport = "playwright", bridgeUrl = "/bridge" } = options;

  // Build CSS custom properties string
  const cssVars = Object.entries(hostContext)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join("\n");

  // Escape the app HTML for srcdoc attribute (escape quotes and ampersands)
  const escapedHtml = appHtml
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>MCP Apps Host Simulator</title>
  <style>
    :root {
${cssVars}
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { width: 100vw; height: 100vh; overflow: hidden; }
    #app-frame {
      width: 100%;
      height: 100%;
      border: none;
    }
  </style>
</head>
<body>
  <iframe
    id="app-frame"
    sandbox="allow-scripts allow-same-origin"
    srcdoc="${escapedHtml}"
  ></iframe>

  <script>
    const iframe = document.getElementById('app-frame');

    // Listen for messages from the iframe
    window.addEventListener('message', async (event) => {
      const msg = event.data;
      if (!msg || msg.jsonrpc !== '2.0') return;

      // Host→App notifications: forward directly to the inner iframe
      // These come from the parent chat UI, not from the inner app
      if (msg.method === 'ui/notifications/tool-input' ||
          msg.method === 'ui/notifications/tool-result') {
        iframe.contentWindow.postMessage(msg, '*');
        return;
      }

      try {
        // App→Host messages: route through the bridge
        ${transport === "http" ? `
        const res = await fetch('${bridgeUrl}', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(msg),
        });
        const responseStr = await res.text();
        ` : `
        const responseStr = await window.__hostBridge(JSON.stringify(msg));
        `}

        // If the bridge returns a response, send it back to the iframe
        if (responseStr && responseStr !== 'null') {
          iframe.contentWindow.postMessage(JSON.parse(responseStr), '*');
        }

        ${transport === "http" ? `
        // Forward context updates to the chat engine so it can trigger next pipeline steps
        if (msg.method === 'ui/update-model-context') {
          fetch('/context-update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(msg.params || {}),
          }).catch(function() {});
        }
        ` : ``}
      } catch (err) {
        // If the bridge call fails, send an error response for requests
        if (msg.id !== undefined) {
          iframe.contentWindow.postMessage({
            jsonrpc: '2.0',
            id: msg.id,
            error: { code: -32603, message: err.message || 'Bridge error' }
          }, '*');
        }
      }
    });

    // Expose a function for tests to send messages INTO the iframe
    // (e.g., ui/notifications/tool-input, ui/notifications/tool-result)
    window.__sendToIframe = (msgStr) => {
      iframe.contentWindow.postMessage(JSON.parse(msgStr), '*');
    };
  </script>
</body>
</html>`;
}
