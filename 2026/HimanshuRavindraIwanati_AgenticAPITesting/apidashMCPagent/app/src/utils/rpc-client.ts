/**
 * utils/rpc-client.ts
 * Shared JSON-RPC client for all MCP App HTML resources.
 * Inlined into each HTML template via getRpcClientScript().
 *
 * Follows the pattern from:
 * https://dev.to/ashita/a-practical-guide-to-building-mcp-apps-1bfm
 */

export function getRpcClientScript(): string {
  return `
(function() {
  let _reqId = 0;
  const _pending = {};

  window.addEventListener('message', (e) => {
    const msg = e.data;
    if (!msg || typeof msg !== 'object') return;
    // Resolve pending RPC calls
    if (msg.id !== undefined && _pending[msg.id]) {
      const { resolve, reject } = _pending[msg.id];
      delete _pending[msg.id];
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
    }
  });

  /**
   * Send a JSON-RPC request to the host and await response.
   * @param {string} method  - e.g. 'ui/initialize'
   * @param {object} params  - request parameters
   * @returns {Promise<any>}
   */
  window.request = function(method, params) {
    return new Promise((resolve, reject) => {
      const id = ++_reqId;
      _pending[id] = { resolve, reject };
      window.parent.postMessage({ jsonrpc: '2.0', id, method, params: params || {} }, '*');
    });
  };

  /**
   * Send a one-way JSON-RPC notification to the host (no response expected).
   * @param {string} method  - e.g. 'ui/notifications/initialized'
   * @param {object} params  - notification parameters
   */
  window.notify = function(method, params) {
    window.parent.postMessage({ jsonrpc: '2.0', method, params: params || {} }, '*');
  };
})();
`.trim();
}
