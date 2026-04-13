import { Button } from '../../ui/Button';
import { useEvaluationStore } from '../../../stores/evaluationStore';
import { formatDuration, getEvaluationDisplayTags } from '../../../utils/evaluation/helpers.js';

function badgeClasses(kind = 'default') {
  switch (kind) {
    case 'negative':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'success':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'error':
      return 'border-red-200 bg-red-50 text-red-700';
    default:
      return 'border-neutral-200 bg-neutral-50 text-neutral-600';
  }
}

function SpinnerIcon() {
  return (
    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" className="stroke-current opacity-20" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" className="stroke-current" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function EvaluationScenarioList() {
  const {
    currentScopeKey,
    scenariosByScope,
    runsByScenario,
    generationByScope,
    selectedScenarioIdByScope,
    createScenario,
    deleteScenario,
    selectScenario,
    generateScenariosForCurrentScope,
  } = useEvaluationStore();

  const scenarios = currentScopeKey ? (scenariosByScope[currentScopeKey] || []) : [];
  const selectedScenarioId = currentScopeKey ? selectedScenarioIdByScope[currentScopeKey] : null;
  const generationState = currentScopeKey ? generationByScope[currentScopeKey] : null;
  const isGenerating = generationState?.status === 'generating';

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Scenarios
          </span>
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
            {scenarios.length}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            disabled={isGenerating}
            onClick={() => generateScenariosForCurrentScope()}
            className="h-7 px-2 text-[11px]"
          >
            <span className="flex items-center gap-1.5">
              {isGenerating ? <SpinnerIcon /> : null}
              <span>{isGenerating ? 'Generating...' : 'Generate'}</span>
            </span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => createScenario()}
            className="h-7 px-2 text-[11px]"
          >
            New
          </Button>
        </div>
      </div>

      {generationState?.status === 'generating' ? (
        <div className="mx-4 mb-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-[11px] text-neutral-600">
          <div className="flex items-center gap-2">
            <SpinnerIcon />
            <span>Generating evaluation scenarios...</span>
          </div>
        </div>
      ) : null}

      {generationState?.usedFallback ? (
        <div className="mx-4 mb-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
          Using demo fallback scenarios because Gemini was unavailable.
        </div>
      ) : null}

      {generationState?.status === 'missing_key' ? (
        <div className="mx-4 mb-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
          Configure a Gemini API key in Settings to auto-generate evaluations, or use the demo fallback scenarios.
        </div>
      ) : null}

      <div
        data-testid="evaluation-scenario-list"
        className="flex-1 overflow-y-auto scrollbar-thin"
      >
        {scenarios.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-muted-foreground">
            {generationState?.status === 'generating'
              ? 'Your scenarios will appear here when generation finishes.'
              : 'No scenarios yet for this server snapshot.'}
          </div>
        ) : (
          scenarios.map((scenario) => {
            const latestRun = runsByScenario[scenario.id]?.[0];
            const isSelected = selectedScenarioId === scenario.id;
            const displayTags = getEvaluationDisplayTags(scenario);

            return (
              <div
                key={scenario.id}
                data-testid={`evaluation-scenario-item-${scenario.id}`}
                className={`border-b border-neutral-100 px-4 py-3 transition-colors ${
                  isSelected ? 'bg-neutral-100' : 'hover:bg-neutral-50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => selectScenario(scenario.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="truncate text-sm font-medium text-neutral-900">
                      {scenario.title}
                    </div>
                    <div className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-neutral-500">
                      {scenario.scenarioText}
                    </div>
                  </button>

                  <div className="flex items-center gap-2">
                    {latestRun ? (
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                          latestRun.result === 'passed'
                            ? badgeClasses('success')
                            : badgeClasses('error')
                        }`}
                      >
                        {latestRun.result === 'passed' ? 'Pass' : 'Fail'}
                      </span>
                    ) : null}
                    <button
                      type="button"
                      aria-label={`Delete ${scenario.title}`}
                      onClick={() => deleteScenario(scenario.id)}
                      className="text-xs text-neutral-400 transition-colors hover:text-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {displayTags.map((tag) => (
                    <span
                      key={`${scenario.id}-${tag}`}
                      data-testid={tag === 'NEG' ? 'evaluation-negative-badge' : tag === 'Generated' ? 'evaluation-generated-badge' : undefined}
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                        tag === 'NEG'
                          ? badgeClasses('negative')
                          : 'border-neutral-200 bg-white text-neutral-500'
                      }`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {latestRun ? (
                  <div className="mt-2 flex items-center gap-3 text-[11px] text-neutral-500">
                    <span>Path {Math.round((latestRun.trajectory?.score || 0) * 100)}%</span>
                    <span>{latestRun.actualToolCalls?.length || 0} calls</span>
                    <span>{formatDuration(latestRun.durationMs)}</span>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
