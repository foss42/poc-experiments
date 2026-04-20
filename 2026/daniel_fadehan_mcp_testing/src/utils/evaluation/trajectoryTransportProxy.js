export function createTrajectoryTransportProxy(transport, {
  onToolCallStart,
  onToolCallResult,
} = {}) {
  return {
    supportsWidgets: transport?.supportsWidgets ?? false,
    async callTool(name, args) {
      const callStartedAt = new Date().toISOString();
      onToolCallStart?.({
        toolName: name,
        args,
        startedAt: callStartedAt,
      });

      const startedAt = performance.now();
      const result = await transport.callTool(name, args);
      const durationMs = Math.round(performance.now() - startedAt);

      onToolCallResult?.({
        toolName: name,
        args,
        result,
        startedAt: callStartedAt,
        endedAt: new Date().toISOString(),
        durationMs,
        widgetResourceUri: result?._meta?.ui?.resourceUri || null,
      });

      return result;
    },
    readResource: (...args) => transport.readResource?.(...args),
  };
}
