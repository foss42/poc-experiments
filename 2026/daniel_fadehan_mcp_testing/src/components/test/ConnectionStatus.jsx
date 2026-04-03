import { useTestStore } from '../../stores/testStore';
import { Button } from '../ui/Button';

export function ConnectionStatus() {
  const { serverUrl, serverInfo, disconnect, testMode } = useTestStore();

  const displayUrl = (() => {
    if (testMode === 'builder') {
      return 'Local Builder Mode';
    }
    try {
      const url = new URL(serverUrl);
      const path = url.pathname === '/' ? '' : url.pathname;
      return `${url.host}${path}`;
    } catch {
      return serverUrl;
    }
  })();

  return (
    <div className="px-4 py-3 flex items-center gap-2 border-b border-border bg-white">
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="connection-pulse absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
      </span>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-neutral-900 truncate">
          {serverInfo?.name || 'MCP Server'}
        </p>
        <p className="text-[11px] text-muted-foreground truncate">{displayUrl}</p>
      </div>

      <Button variant="ghost" size="sm" onClick={disconnect} className="shrink-0 text-xs">
        Disconnect
      </Button>
    </div>
  );
}
