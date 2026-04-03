function createLogId() {
  return `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function getLogSourceLabel(url, fallback = 'mcp-server') {
  if (!url) return fallback;

  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'localhost') {
      return parsed.port ? `localhost:${parsed.port}` : 'localhost';
    }
    return parsed.host || fallback;
  } catch {
    return fallback;
  }
}

export function createChatLogEntry({
  dir,
  type,
  source = 'mcp-server',
  status = 'info',
  at,
}) {
  return {
    id: createLogId(),
    dir,
    type,
    source,
    status,
    at: at || new Date().toISOString(),
  };
}
