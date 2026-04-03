import { useMcpStore } from '../../stores/mcpStore';
import { useTestStore } from '../../stores/testStore';

export function Header() {
  const { getSelectedServer, getSelectedTool, activeTab, previousTab, setActiveTab } = useMcpStore();
  const { 
    connectionStatus, 
    serverInfo, 
    getSelectedTool: getTestTool,
    getSelectedResource: getTestResource,
    getSelectedPrompt: getTestPrompt,
    selectedPrimitiveType
  } = useTestStore();

  const server = getSelectedServer();
  const tool = getSelectedTool();
  const isTestMode = activeTab === 'test';
  const isSettingsMode = activeTab === 'settings';
  
  const testTool = getTestTool();
  const testResource = getTestResource();
  const testPrompt = getTestPrompt();

  const getTestActiveItemName = () => {
    switch (selectedPrimitiveType) {
      case 'chat': return 'Chat';
      case 'apps': return 'MCP Apps';
      case 'tools': return testTool?.name;
      case 'resources': return testResource?.name;
      case 'prompts': return testPrompt?.name;
      default: return null;
    }
  };

  const testActiveItemName = getTestActiveItemName();

  return (
    <header className="h-14 flex items-center justify-between px-4 border-b border-border bg-white">
      <div className="flex items-center gap-2 text-sm">
        <button 
          onClick={() => setActiveTab(isSettingsMode ? (previousTab || 'create') : 'create')}
          className="font-semibold text-neutral-900 hover:text-neutral-700 transition-colors"
        >
          Forge
        </button>

        {isTestMode ? (
          <>
            <span className="text-neutral-300">/</span>
            <span className="text-muted-foreground">Test Mode</span>
            {connectionStatus === 'connected' && serverInfo && (
              <>
                <span className="text-neutral-300">/</span>
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="connection-pulse absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                  </span>
                  <span className="text-muted-foreground">{serverInfo.name}</span>
                </div>
              </>
            )}
            {testActiveItemName && (
              <>
                <span className="text-neutral-300">/</span>
                <span className="text-muted-foreground">{testActiveItemName}</span>
              </>
            )}
          </>
        ) : isSettingsMode ? (
          <>
            <span className="text-neutral-300">/</span>
            <span className="text-muted-foreground">Settings</span>
          </>
        ) : (
          <>
            {server && (
              <>
                <span className="text-neutral-300">/</span>
                <span className="text-muted-foreground">{server.name}</span>
              </>
            )}

            {tool && (
              <>
                <span className="text-neutral-300">/</span>
                <span className="text-muted-foreground">{tool.name}</span>
              </>
            )}
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button 
          onClick={() => setActiveTab('settings')}
          className={`p-2 rounded-md transition-colors ${isSettingsMode ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'}`}
          title="Settings"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        </button>
      </div>
    </header>
  );
}
