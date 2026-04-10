/**
 * utils/apply-host-context.ts
 * Applies host-provided CSS variables to the document root so each
 * MCP App automatically adopts the host's current theme (light/dark,
 * brand colours, typography tokens).
 *
 * Follows the pattern from:
 * https://dev.to/ashita/a-practical-guide-to-building-mcp-apps-1bfm
 */

export function getApplyHostContextScript(): string {
  return `
window.applyHostContext = function(hostContext) {
  if (!hostContext || typeof hostContext !== 'object') return;
  const root = document.documentElement;
  Object.entries(hostContext).forEach(([key, value]) => {
    if (typeof value === 'string') {
      root.style.setProperty(key, value);
    }
  });
};
`.trim();
}
