import { useTestStore } from '../../stores/testStore';
import { ConnectionForm } from './ConnectionForm';
import { ConnectionStatus } from './ConnectionStatus';
import { ToolList } from './ToolList';
import { ResourceList } from './ResourceList';
import { PromptList } from './PromptList';
import { EvaluationScenarioList } from './evaluations/EvaluationScenarioList.jsx';
import { useEvaluationStore } from '../../stores/evaluationStore';

export function TestSidebar() {
  const {
    connectionStatus,
    selectedPrimitiveType,
    lastNonEvaluationPrimitiveType,
    setSelectedPrimitiveType,
  } = useTestStore();
  const { currentScopeKey, generationByScope, markCurrentScopeSeen } = useEvaluationStore();
  const isConnected = connectionStatus === 'connected';
  const generationState = currentScopeKey ? generationByScope[currentScopeKey] : null;
  const newCount = generationState?.newCount || 0;

  const renderList = () => {
    switch (selectedPrimitiveType) {
      case 'evaluations':
        return <EvaluationScenarioList />;
      case 'resources':
        return <ResourceList />;
      case 'prompts':
        return <PromptList />;
      case 'tools':
      case 'chat':
      case 'apps':
      default:
        return <ToolList />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {isConnected ? (
        <>
          <ConnectionStatus />
          
          <div className="py-2 border-b border-border">
            <button
              onClick={() => setSelectedPrimitiveType('chat')}
              className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors ${
                selectedPrimitiveType === 'chat'
                  ? 'bg-neutral-100 text-neutral-900'
                  : 'text-muted-foreground hover:bg-neutral-50 hover:text-neutral-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                Chat
              </div>
            </button>
            <button
              onClick={() => setSelectedPrimitiveType('apps')}
              className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors ${
                selectedPrimitiveType === 'apps'
                  ? 'bg-neutral-100 text-neutral-900'
                  : 'text-muted-foreground hover:bg-neutral-50 hover:text-neutral-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2" />
                  <path d="M3 9h18" />
                  <path d="M9 21V9" />
                </svg>
                MCP Apps
              </div>
            </button>
            <button
              onClick={() => {
                if (selectedPrimitiveType === 'evaluations') {
                  setSelectedPrimitiveType(lastNonEvaluationPrimitiveType || 'tools');
                  return;
                }
                setSelectedPrimitiveType('evaluations');
                markCurrentScopeSeen();
              }}
              data-testid="evaluations-tab-button"
              className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors ${
                selectedPrimitiveType === 'evaluations'
                  ? 'bg-neutral-100 text-neutral-900'
                  : 'text-muted-foreground hover:bg-neutral-50 hover:text-neutral-900'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 3" />
                  </svg>
                  Evaluations
                </div>
                {newCount > 0 ? (
                  <span
                    data-testid="evaluations-generation-badge"
                    className="rounded-full bg-neutral-900 px-2 py-0.5 text-[10px] font-semibold text-white"
                  >
                    {newCount} new
                  </span>
                ) : null}
              </div>
            </button>
          </div>

          {selectedPrimitiveType !== 'evaluations' ? (
            <>
              <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Explore primitives
              </div>

              <div className="px-2 pb-2">
                <div className="flex gap-1 bg-neutral-100 p-1 rounded-md">
                  <button
                    onClick={() => setSelectedPrimitiveType('tools')}
                    className={`flex-1 text-xs font-medium px-2 py-1.5 rounded transition-colors ${
                      selectedPrimitiveType === 'tools' || selectedPrimitiveType === 'chat' || selectedPrimitiveType === 'apps'
                        ? 'bg-white text-neutral-900 shadow-sm'
                        : 'text-muted-foreground hover:text-neutral-900'
                    }`}
                  >
                    Tools
                  </button>
                  <button
                    onClick={() => setSelectedPrimitiveType('resources')}
                    className={`flex-1 text-xs font-medium px-2 py-1.5 rounded transition-colors ${
                      selectedPrimitiveType === 'resources'
                        ? 'bg-white text-neutral-900 shadow-sm'
                        : 'text-muted-foreground hover:text-neutral-900'
                    }`}
                  >
                    Resources
                  </button>
                  <button
                    onClick={() => setSelectedPrimitiveType('prompts')}
                    className={`flex-1 text-xs font-medium px-2 py-1.5 rounded transition-colors ${
                      selectedPrimitiveType === 'prompts'
                        ? 'bg-white text-neutral-900 shadow-sm'
                        : 'text-muted-foreground hover:text-neutral-900'
                    }`}
                  >
                    Prompts
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Scenario library
            </div>
          )}

          {renderList()}
        </>
      ) : (
        <ConnectionForm />
      )}
    </div>
  );
}
