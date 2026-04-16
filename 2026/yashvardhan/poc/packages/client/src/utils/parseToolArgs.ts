/**
 * Convert string form values to typed values based on the tool's inputSchema property types.
 */
export function parseToolArgs(
  toolArgs: Record<string, string>,
  properties: Record<string, { type?: string }>,
): Record<string, unknown> {
  const parsed: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(toolArgs)) {
    if (v === '') continue;
    const t = properties[k]?.type;
    if (t === 'number' || t === 'integer') parsed[k] = Number(v);
    else if (t === 'boolean') parsed[k] = v === 'true';
    else if (t === 'array' || t === 'object') {
      try { parsed[k] = JSON.parse(v); } catch { parsed[k] = v; }
    } else {
      parsed[k] = v;
    }
  }
  return parsed;
}
