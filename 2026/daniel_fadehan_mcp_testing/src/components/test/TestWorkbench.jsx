import { useState } from 'react';
import { useTestStore } from '../../stores/testStore';
import { TestEmptyState } from './TestEmptyState';
import { ToolHeader } from './ToolHeader';
import { InputPanel } from './InputPanel';
import { OutputPanel } from './OutputPanel';
import { HistoryPanel } from './HistoryPanel';
import { ResourcesTestPanel } from './ResourcesTestPanel';
import { PromptsTestPanel } from './PromptsTestPanel';
import { ChatPanel } from './ChatPanel';
import { McpAppsPanel } from './McpAppsPanel';
import { LogBusPanel } from './LogBusPanel';
import { DebugPanel } from './DebugPanel';
import { EvaluationsPanel } from './evaluations/EvaluationsPanel.jsx';

// Icons
const ServerIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
    <rect width="20" height="8" x="2" y="2" rx="2" ry="2" />
    <rect width="20" height="8" x="2" y="14" rx="2" ry="2" />
    <line x1="6" x2="6.01" y1="6" y2="6" />
    <line x1="6" x2="6.01" y1="18" y2="18" />
  </svg>
);

const WarningIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </svg>
);

const WrenchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
);

const BookIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
  </svg>
);

const MessageIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

export function TestWorkbench() {
  const {
    connectionStatus,
    selectedToolName,
    selectedResourceUri,
    selectedPromptName,
    selectedPrimitiveType,
    getSelectedTool,
    resources,
    prompts,
  } = useTestStore();
  
  const [isLogsCollapsed, setIsLogsCollapsed] = useState(false);
  const [isDebugCollapsed, setIsDebugCollapsed] = useState(false);

  // State 1: Disconnected
  if (connectionStatus === 'disconnected') {
    return (
      <div className="flex-1 bg-white">
        <TestEmptyState
          icon={<ServerIcon />}
          heading="Connect to an MCP Server"
          subtitle="Enter a server URL in the sidebar to discover and test available tools."
        />
      </div>
    );
  }

  // State 2: Connecting
  if (connectionStatus === 'connecting') {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <span className="relative flex h-4 w-4">
              <span className="connection-pulse absolute inline-flex h-full w-full rounded-full bg-neutral-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-neutral-500" />
            </span>
          </div>
          <p className="text-sm text-muted-foreground">Establishing connection...</p>
        </div>
      </div>
    );
  }

  // State 3: Connection Error
  if (connectionStatus === 'error') {
    return (
      <div className="flex-1 bg-white">
        <TestEmptyState
          icon={<WarningIcon />}
          heading="Connection failed"
          subtitle="Check the URL and try again."
        />
      </div>
    );
  }

  // Helper to render the main content area based on selected tab
  const renderMainContent = () => {
    if (selectedPrimitiveType === 'chat') {
      return <ChatPanel />;
    }
    if (selectedPrimitiveType === 'apps') {
      return <McpAppsPanel />;
    }
    if (selectedPrimitiveType === 'evaluations') {
      return <EvaluationsPanel />;
    }
    if (selectedPrimitiveType === 'tools') {
      const selectedTool = getSelectedTool();
      if (!selectedToolName || !selectedTool) {
        return (
          <div className="flex-1 bg-white">
            <TestEmptyState
              icon={<WrenchIcon />}
              heading="Select a tool"
              subtitle="Choose a tool from the sidebar to inspect and test it."
            />
          </div>
        );
      }
      return (
        <div className="flex-1 flex flex-col overflow-hidden">
          <ToolHeader tool={selectedTool} />
          <div className="flex-1 flex min-h-0">
            <InputPanel tool={selectedTool} />
            <OutputPanel />
          </div>
          <DebugPanel isCollapsed={isDebugCollapsed} onToggle={() => setIsDebugCollapsed(v => !v)} />
          <HistoryPanel />
        </div>
      );
    }
    if (selectedPrimitiveType === 'resources') {
      if (resources.length === 0) {
        return (
          <div className="flex-1 bg-white">
            <TestEmptyState
              icon={<BookIcon />}
              heading="No resources available"
              subtitle="This server has no resources defined. Create resources in the Builder to test them here."
            />
          </div>
        );
      }
      if (!selectedResourceUri) {
        return (
          <div className="flex-1 bg-white">
            <TestEmptyState
              icon={<BookIcon />}
              heading="Select a resource"
              subtitle="Choose a resource from the sidebar to test it."
            />
          </div>
        );
      }
      return <ResourcesTestPanel />;
    }
    if (selectedPrimitiveType === 'prompts') {
      if (prompts.length === 0) {
        return (
          <div className="flex-1 bg-white">
            <TestEmptyState
              icon={<MessageIcon />}
              heading="No prompts available"
              subtitle="This server has no prompts defined. Create prompts in the Builder to test them here."
            />
          </div>
        );
      }
      if (!selectedPromptName) {
        return (
          <div className="flex-1 bg-white">
            <TestEmptyState
              icon={<MessageIcon />}
              heading="Select a prompt"
              subtitle="Choose a prompt from the sidebar to test it."
            />
          </div>
        );
      }
      return <PromptsTestPanel />;
    }
    return null;
  };

  return (
    <div className="flex-1 flex bg-white overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0">
        {/* Render main content based on selection */}
        {renderMainContent()}
      </div>
      
      {/* Tools/resources/prompts still use the generic side panel. Chat and Apps own their runtime-specific logs. */}
      {selectedPrimitiveType !== 'apps' && selectedPrimitiveType !== 'chat' && selectedPrimitiveType !== 'evaluations' && (
        <LogBusPanel
          logs={[]}
          isCollapsed={isLogsCollapsed}
          onToggle={() => setIsLogsCollapsed(!isLogsCollapsed)}
        />
      )}
    </div>
  );
}
