import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useSettingsStore } from './settingsStore';
import { generateEvalScenarios } from '../utils/evaluation/generateEvalScenarios.js';
import {
  buildEvaluationScopeKey,
  buildToolSnapshotHash,
  getToolWidgetResourceUri,
  inferToolPurpose,
} from '../utils/evaluation/helpers.js';

const generateId = () => Math.random().toString(36).slice(2, 11);

function nowIso() {
  return new Date().toISOString();
}

function createExpectedToolCall(
  toolName = '',
  expectedArgs = {},
  argMatchMode = 'subset',
  extras = {}
) {
  return {
    id: generateId(),
    toolName,
    expectedArgs,
    argMatchMode,
    importance: extras.importance || 'required',
    purpose: extras.purpose || inferToolPurpose(toolName),
  };
}

function createDefaultScenario(context = {}) {
  const firstTool = context.tools?.[0];
  const widgetResourceUri = getToolWidgetResourceUri(firstTool);

  return {
    id: generateId(),
    scopeKey: context.scopeKey || '',
    title: 'New evaluation scenario',
    description: '',
    source: 'user',
    generationBatchId: null,
    toolSnapshotHash: context.toolSnapshotHash || '',
    difficulty: 'easy',
    mode: 'positive',
    tags: [],
    scenarioText: 'Describe the use case to test.',
    userPrompt: '',
    expectedToolCalls: [],
    allowedToolNames: [],
    generationMetadata: {
      sourceKind: 'ai',
      workflowSummary: '',
    },
    expectedOutput: '',
    expectedWidgetResourceUri: widgetResourceUri,
    passCriteria: {
      minTrajectoryScore: 0.75,
      minOutputScore: 0.7,
      failOnUnexpectedTools: true,
    },
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

function toScenarioRecord(rawScenario, context, batchId = null) {
  const expectedToolCalls = rawScenario.expectedToolCalls?.map((call) => ({
    id: generateId(),
    toolName: call.toolName,
    expectedArgs: call.expectedArgs || {},
    argMatchMode: call.argMatchMode || 'subset',
    importance: call.importance || 'required',
    purpose: call.purpose || inferToolPurpose(call.toolName),
  })) || [];

  const expectedWidgetResourceUri = expectedToolCalls
    .map((call) => context.tools?.find((tool) => tool.name === call.toolName))
    .map((tool) => getToolWidgetResourceUri(tool))
    .find(Boolean) || null;

  return {
    id: generateId(),
    scopeKey: context.scopeKey,
    title: rawScenario.title,
    description: rawScenario.description || '',
    source: 'generated',
    generationBatchId: batchId,
    toolSnapshotHash: context.toolSnapshotHash,
    difficulty: rawScenario.difficulty || 'easy',
    mode: rawScenario.mode || 'positive',
    tags: rawScenario.tags || [],
    scenarioText: rawScenario.scenarioText || '',
    userPrompt: rawScenario.userPrompt || '',
    expectedToolCalls,
    allowedToolNames: rawScenario.allowedToolNames || [],
    generationMetadata: rawScenario.generationMetadata || {
      sourceKind: 'ai',
      workflowSummary: '',
    },
    expectedOutput: rawScenario.expectedOutput || '',
    expectedWidgetResourceUri,
    passCriteria: {
      minTrajectoryScore: 0.75,
      minOutputScore: 0.7,
      failOnUnexpectedTools: true,
    },
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

function sortScenarios(a, b) {
  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
}

function updateScenarioSource(scenario, updates = {}) {
  if (scenario.source === 'generated') {
    return 'generated-edited';
  }

  return updates.source || scenario.source;
}

export const useEvaluationStore = create(
  persist(
    (set, get) => ({
      scenariosByScope: {},
      runsByScenario: {},
      generationByScope: {},
      selectedScenarioIdByScope: {},
      currentScopeKey: null,
      currentToolSnapshotHash: '',
      currentContext: null,

      setCurrentContext: (context) => set({
        currentScopeKey: context?.scopeKey || null,
        currentToolSnapshotHash: context?.toolSnapshotHash || '',
        currentContext: context || null,
      }),

      markCurrentScopeSeen: () => set((state) => {
        const scopeKey = state.currentScopeKey;
        if (!scopeKey || !state.generationByScope[scopeKey]) return state;

        return {
          generationByScope: {
            ...state.generationByScope,
            [scopeKey]: {
              ...state.generationByScope[scopeKey],
              newCount: 0,
            },
          },
        };
      }),

      createScenario: (partial = {}) => {
        const context = get().currentContext || {};
        const nextScenario = {
          ...createDefaultScenario(context),
          ...partial,
          id: generateId(),
          scopeKey: context.scopeKey || partial.scopeKey || '',
          toolSnapshotHash: context.toolSnapshotHash || partial.toolSnapshotHash || '',
          updatedAt: nowIso(),
          createdAt: nowIso(),
        };

        set((state) => {
          const scopeKey = nextScenario.scopeKey;
          const nextScopeScenarios = [...(state.scenariosByScope[scopeKey] || []), nextScenario].sort(sortScenarios);

          return {
            scenariosByScope: {
              ...state.scenariosByScope,
              [scopeKey]: nextScopeScenarios,
            },
            selectedScenarioIdByScope: {
              ...state.selectedScenarioIdByScope,
              [scopeKey]: nextScenario.id,
            },
          };
        });

        return nextScenario;
      },

      selectScenario: (scenarioId) => set((state) => {
        const scopeKey = state.currentScopeKey;
        if (!scopeKey) return state;

        return {
          selectedScenarioIdByScope: {
            ...state.selectedScenarioIdByScope,
            [scopeKey]: scenarioId,
          },
        };
      }),

      updateScenario: (scenarioId, updates) => set((state) => {
        const scopeKey = state.currentScopeKey;
        if (!scopeKey) return state;

        const nextScenarios = (state.scenariosByScope[scopeKey] || []).map((scenario) => {
          if (scenario.id !== scenarioId) return scenario;

          const nextExpectedToolCalls = updates.expectedToolCalls
            ? updates.expectedToolCalls.map((call) => ({
                id: call.id || generateId(),
                toolName: call.toolName,
                expectedArgs: call.expectedArgs || {},
                argMatchMode: call.argMatchMode || 'subset',
                importance: call.importance || 'required',
                purpose: call.purpose || inferToolPurpose(call.toolName),
              }))
            : scenario.expectedToolCalls;

          const nextScenario = {
            ...scenario,
            ...updates,
            source: updateScenarioSource(scenario, updates),
            expectedToolCalls: nextExpectedToolCalls,
            updatedAt: nowIso(),
          };

          return nextScenario;
        }).sort(sortScenarios);

        return {
          scenariosByScope: {
            ...state.scenariosByScope,
            [scopeKey]: nextScenarios,
          },
        };
      }),

      deleteScenario: (scenarioId) => set((state) => {
        const scopeKey = state.currentScopeKey;
        if (!scopeKey) return state;

        const remaining = (state.scenariosByScope[scopeKey] || []).filter((scenario) => scenario.id !== scenarioId);
        const selectedScenarioId = state.selectedScenarioIdByScope[scopeKey] === scenarioId
          ? remaining[0]?.id || null
          : state.selectedScenarioIdByScope[scopeKey];

        const nextRuns = { ...state.runsByScenario };
        delete nextRuns[scenarioId];

        return {
          scenariosByScope: {
            ...state.scenariosByScope,
            [scopeKey]: remaining,
          },
          runsByScenario: nextRuns,
          selectedScenarioIdByScope: {
            ...state.selectedScenarioIdByScope,
            [scopeKey]: selectedScenarioId,
          },
        };
      }),

      duplicateScenario: (scenarioId) => {
        const state = get();
        const scopeKey = state.currentScopeKey;
        if (!scopeKey) return null;

        const original = (state.scenariosByScope[scopeKey] || []).find((scenario) => scenario.id === scenarioId);
        if (!original) return null;

        return get().createScenario({
          ...original,
          id: undefined,
          title: `${original.title} Copy`,
          source: 'user',
          generationBatchId: null,
          expectedToolCalls: original.expectedToolCalls.map((call) => ({
            ...call,
            id: generateId(),
          })),
        });
      },

      replaceScenarioWithActualPath: (scenarioId, runId) => set((state) => {
        const scopeKey = state.currentScopeKey;
        if (!scopeKey) return state;

        const runs = state.runsByScenario[scenarioId] || [];
        const run = runs.find((entry) => entry.id === runId);
        if (!run) return state;

        const nextScenarios = (state.scenariosByScope[scopeKey] || []).map((scenario) => {
          if (scenario.id !== scenarioId) return scenario;

          const expectedToolCalls = run.actualToolCalls.map((call) => ({
            id: generateId(),
            toolName: call.toolName,
            expectedArgs: call.args || {},
            argMatchMode: 'subset',
            importance: 'required',
            purpose: inferToolPurpose(call.toolName),
          }));

          const expectedWidgetResourceUri = run.actualToolCalls.find((call) => call.widgetResourceUri)?.widgetResourceUri || null;

          return {
            ...scenario,
            source: 'user',
            expectedToolCalls,
            expectedWidgetResourceUri,
            updatedAt: nowIso(),
          };
        }).sort(sortScenarios);

        return {
          scenariosByScope: {
            ...state.scenariosByScope,
            [scopeKey]: nextScenarios,
          },
        };
      }),

      addExpectedToolCall: (scenarioId, toolName = '', expectedArgs = {}, extras = {}) => set((state) => {
        const scopeKey = state.currentScopeKey;
        if (!scopeKey) return state;

        return {
          scenariosByScope: {
            ...state.scenariosByScope,
            [scopeKey]: (state.scenariosByScope[scopeKey] || []).map((scenario) => (
              scenario.id === scenarioId
                ? {
                    ...scenario,
                    source: updateScenarioSource(scenario),
                    expectedToolCalls: [
                      ...scenario.expectedToolCalls,
                      createExpectedToolCall(toolName, expectedArgs, 'keys-only', extras),
                    ],
                    updatedAt: nowIso(),
                  }
                : scenario
            )).sort(sortScenarios),
          },
        };
      }),

      removeExpectedToolCall: (scenarioId, callId) => set((state) => {
        const scopeKey = state.currentScopeKey;
        if (!scopeKey) return state;

        return {
          scenariosByScope: {
            ...state.scenariosByScope,
            [scopeKey]: (state.scenariosByScope[scopeKey] || []).map((scenario) => (
              scenario.id === scenarioId
                ? {
                    ...scenario,
                    source: updateScenarioSource(scenario),
                    expectedToolCalls: scenario.expectedToolCalls.filter((call) => call.id !== callId),
                    updatedAt: nowIso(),
                  }
                : scenario
            )).sort(sortScenarios),
          },
        };
      }),

      startRun: (scenarioId, model) => {
        const state = get();
        const scopeKey = state.currentScopeKey;
        if (!scopeKey) return null;

        const scenario = (state.scenariosByScope[scopeKey] || []).find((entry) => entry.id === scenarioId);
        if (!scenario) return null;

        const run = {
          id: generateId(),
          scenarioId,
          scopeKey,
          scenarioSnapshot: JSON.parse(JSON.stringify(scenario)),
          model,
          status: 'running',
          result: 'failed',
          startedAt: nowIso(),
          usage: {
            inputTokens: undefined,
            outputTokens: undefined,
            totalTokens: undefined,
          },
          transcript: [],
          actualToolCalls: [],
          trace: [],
          trajectory: {
            matched: [],
            partial: [],
            missing: [],
            support: [],
            unexpected: [],
            reordered: [],
            usedDistractorTools: [],
            score: 0,
            coverageScore: 0,
            argumentScore: 0,
            orderScore: 0,
            supportScore: 1,
            outputScore: 0,
            explanation: '',
          },
          outputEvaluation: {
            score: 0,
            passed: false,
            rationale: '',
          },
        };

        set((currentState) => ({
          runsByScenario: {
            ...currentState.runsByScenario,
            [scenarioId]: [run, ...(currentState.runsByScenario[scenarioId] || [])],
          },
        }));

        return run;
      },

      finishRun: (scenarioId, runId, updates) => set((state) => {
        const currentRuns = state.runsByScenario[scenarioId] || [];
        const nextRuns = currentRuns.map((run) => (
          run.id === runId
            ? {
                ...run,
                ...updates,
              }
            : run
        ));

        return {
          runsByScenario: {
            ...state.runsByScenario,
            [scenarioId]: nextRuns,
          },
        };
      }),

      clearScenarioRuns: (scenarioId) => set((state) => ({
        runsByScenario: {
          ...state.runsByScenario,
          [scenarioId]: [],
        },
      })),

      syncConnectionContext: async ({
        testMode,
        serverUrl,
        selectedBuilderServerId,
        serverInfo,
        tools,
        resources,
        prompts,
      }) => {
        const scopeKey = buildEvaluationScopeKey({
          testMode,
          serverUrl,
          selectedBuilderServerId,
        });

        const toolSnapshotHash = buildToolSnapshotHash({
          serverInfo,
          tools,
          resources,
          prompts,
        });

        const context = {
          scopeKey,
          toolSnapshotHash,
          testMode,
          serverUrl,
          selectedBuilderServerId,
          serverInfo,
          tools: tools || [],
          resources: resources || [],
          prompts: prompts || [],
        };

        get().setCurrentContext(context);

        const existingGeneration = get().generationByScope[scopeKey];
        const hasGeneratedScenariosForSnapshot = (get().scenariosByScope[scopeKey] || []).some((scenario) => (
          scenario.source !== 'user' &&
          scenario.toolSnapshotHash === toolSnapshotHash
        ));

        if (existingGeneration?.status === 'generating' || hasGeneratedScenariosForSnapshot) {
          return;
        }

        const apiKey = useSettingsStore.getState().geminiApiKey;

        const batchId = generateId();

        set((state) => ({
          generationByScope: {
            ...state.generationByScope,
            [scopeKey]: {
              toolSnapshotHash,
              status: 'generating',
              batchId,
              newCount: 0,
              error: null,
            },
          },
        }));

        try {
          const generatedScenarios = await generateEvalScenarios({
            serverInfo,
            tools,
            resources,
            prompts,
            apiKey,
            count: 6,
            distribution: {
              easy: 2,
              medium: 2,
              hard: 1,
              negative: 1,
            },
          });

          set((state) => {
            const existingScenarios = state.scenariosByScope[scopeKey] || [];
            const retainedScenarios = existingScenarios.filter((scenario) => !(
              scenario.source === 'generated' &&
              scenario.toolSnapshotHash !== toolSnapshotHash
            ));

            const nextGeneratedScenarios = generatedScenarios.map((scenario) => (
              toScenarioRecord(scenario, context, batchId)
            ));
            const usedFallback = nextGeneratedScenarios.some(
              (scenario) => scenario.generationMetadata?.sourceKind === 'heuristic-fallback'
            );

            const nextScenarios = [...retainedScenarios, ...nextGeneratedScenarios].sort(sortScenarios);
            const currentSelectedId = state.selectedScenarioIdByScope[scopeKey];

            return {
              scenariosByScope: {
                ...state.scenariosByScope,
                [scopeKey]: nextScenarios,
              },
              generationByScope: {
                ...state.generationByScope,
                [scopeKey]: {
                  toolSnapshotHash,
                  status: 'ready',
                  batchId,
                  newCount: nextGeneratedScenarios.length,
                  error: null,
                  usedFallback,
                  lastGeneratedAt: nowIso(),
                },
              },
              selectedScenarioIdByScope: {
                ...state.selectedScenarioIdByScope,
                [scopeKey]: currentSelectedId || nextScenarios[0]?.id || null,
              },
            };
          });
        } catch (error) {
          set((state) => ({
            generationByScope: {
              ...state.generationByScope,
              [scopeKey]: {
                toolSnapshotHash,
                status: 'error',
                batchId,
                newCount: 0,
                error: error.message || 'Failed to generate evaluation scenarios.',
              },
            },
          }));
        }
      },
    }),
    {
      name: 'forge-evaluations',
      partialize: (state) => ({
        scenariosByScope: state.scenariosByScope,
        runsByScenario: state.runsByScenario,
        generationByScope: state.generationByScope,
        selectedScenarioIdByScope: state.selectedScenarioIdByScope,
      }),
    }
  )
);
