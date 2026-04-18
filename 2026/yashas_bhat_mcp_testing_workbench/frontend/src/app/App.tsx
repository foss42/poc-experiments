import { useEffect, useState } from "react"
import { Activity, Circle, Loader2, Play, PlugZap } from "lucide-react"

import {
  callTool,
  fetchDiscovery,
  fetchLatestReport,
  fetchLatestTraces,
  fetchResource,
  fetchScenarioManifests,
  runScenarios,
} from "@/app/api"
import {
  AppPreviewPanel,
  AppRow,
  ContentSection,
  Empty,
  ItemList,
  ResourceRow,
  RunDetail,
  RunSummaryList,
  ScenarioRow,
  StatusBadge,
  ToolRow,
  TracePanel,
} from "@/app/workbench-components"
import type { TabKey } from "@/app/workbench-types"
import {
  buildAppEntries,
  getSelectedScenarioResult,
  parseSchemaArguments,
} from "@/app/workbench-utils"
import { Button } from "@/components/ui/button"
import type {
  DiscoveryPayload,
  LatestTracesPayload,
  McpResourceContents,
  RunReport,
  ScenarioManifest,
  ToolCallPayload,
} from "@/types/mcp"

const DEFAULT_SERVER_URL = "http://localhost:3000/mcp"
const TABS: TabKey[] = ["resources", "tools", "apps", "scenarios", "runs", "traces"]

function App() {
  const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER_URL)
  const [connectedServerUrl, setConnectedServerUrl] = useState(DEFAULT_SERVER_URL)
  const [activeTab, setActiveTab] = useState<TabKey>("scenarios")
  const [scenarios, setScenarios] = useState<ScenarioManifest[]>([])
  const [selectedScenarioIds, setSelectedScenarioIds] = useState<string[]>([])
  const [discovery, setDiscovery] = useState<DiscoveryPayload | null>(null)
  const [report, setReport] = useState<RunReport | null>(null)
  const [latestTraces, setLatestTraces] = useState<LatestTracesPayload | null>(null)
  const [selectedScenarioResultId, setSelectedScenarioResultId] = useState<string | null>(null)
  const [selectedAppIndex, setSelectedAppIndex] = useState(0)
  const [selectedAppResource, setSelectedAppResource] = useState<McpResourceContents | null>(null)
  const [appDrafts, setAppDrafts] = useState<Record<string, Record<string, string>>>({})
  const [appToolResult, setAppToolResult] = useState<ToolCallPayload | null>(null)
  const [isRunningAppTool, setIsRunningAppTool] = useState(false)
  const [isLoadingAppResource, setIsLoadingAppResource] = useState(false)
  const [appResourceError, setAppResourceError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRunning, setIsRunning] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedMcpTraceIndex, setSelectedMcpTraceIndex] = useState(0)
  const [selectedAppTraceIndex, setSelectedAppTraceIndex] = useState(0)

  const selectedResult = getSelectedScenarioResult(report, selectedScenarioResultId)
  const appEntries = buildAppEntries(discovery)
  const selectedAppEntry =
    appEntries[Math.min(selectedAppIndex, Math.max(appEntries.length - 1, 0))] ?? null
  const selectedAppDraft = selectedAppEntry ? appDrafts[selectedAppEntry.key] ?? {} : {}
  const hasPendingServerChange = serverUrl !== connectedServerUrl

  useEffect(() => {
    void refreshAll(DEFAULT_SERVER_URL, true)
  }, [])

  useEffect(() => {
    if (!selectedAppEntry?.uri) {
      setSelectedAppResource(null)
      setAppResourceError(null)
      return
    }

    let cancelled = false
    const resourceUri = selectedAppEntry.uri

    async function loadSelectedAppResource(): Promise<void> {
      setIsLoadingAppResource(true)
      setAppResourceError(null)

      try {
        const payload = await fetchResource(connectedServerUrl, resourceUri)
        if (!cancelled) {
          setSelectedAppResource(payload.resource)
        }
      } catch (err) {
        if (!cancelled) {
          setSelectedAppResource(null)
          setAppResourceError(err instanceof Error ? err.message : String(err))
        }
      } finally {
        if (!cancelled) {
          setIsLoadingAppResource(false)
        }
      }
    }

    void loadSelectedAppResource()

    return () => {
      cancelled = true
    }
  }, [connectedServerUrl, selectedAppEntry?.uri])

  async function refreshAll(nextServerUrl: string, initialLoad = false): Promise<void> {
    if (initialLoad) {
      setIsLoading(true)
    } else {
      setIsRefreshing(true)
    }

    try {
      const [manifests, nextDiscovery, latestReport] = await Promise.all([
        fetchScenarioManifests(),
        fetchDiscovery(nextServerUrl),
        fetchLatestReport(),
      ])
      const reportForServer = latestReport?.serverUrl === nextServerUrl ? latestReport : null
      const traces = reportForServer ? await fetchLatestTraces() : null

      setScenarios(manifests)
      setSelectedScenarioIds((current) =>
        current.filter((id) => manifests.some((scenario) => scenario.id === id)),
      )
      setDiscovery(nextDiscovery)
      setConnectedServerUrl(nextServerUrl)
      setReport(reportForServer)
      setLatestTraces(traces)
      setSelectedMcpTraceIndex(0)
      setSelectedAppTraceIndex(0)
      setSelectedAppIndex(0)
      setSelectedScenarioResultId(reportForServer?.scenarioResults[0]?.id ?? null)
      setAppToolResult(null)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  async function handleConnect(): Promise<void> {
    await refreshAll(serverUrl)
  }

  async function handleRun(): Promise<void> {
    setIsRunning(true)
    setError(null)

    try {
      const nextReport = await runScenarios({
        serverUrl: connectedServerUrl,
        scenarioIds: selectedScenarioIds,
      })

      setReport(nextReport)
      setSelectedScenarioResultId(nextReport.scenarioResults[0]?.id ?? null)
      setLatestTraces(await fetchLatestTraces())
      setSelectedMcpTraceIndex(0)
      setSelectedAppTraceIndex(0)
      setActiveTab("runs")
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsRunning(false)
    }
  }

  async function handleRunAppTool(): Promise<void> {
    if (!selectedAppEntry?.toolName) {
      return
    }

    setIsRunningAppTool(true)
    setAppToolResult(null)
    setError(null)

    try {
      const payload = await callTool({
        serverUrl: connectedServerUrl,
        toolName: selectedAppEntry.toolName,
        arguments: parseSchemaArguments(selectedAppEntry.inputSchema, selectedAppDraft),
      })
      setAppToolResult(payload)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsRunningAppTool(false)
    }
  }

  function handleAppFieldChange(field: string, value: string): void {
    if (!selectedAppEntry) {
      return
    }

    setAppDrafts((current) => ({
      ...current,
      [selectedAppEntry.key]: {
        ...(current[selectedAppEntry.key] ?? {}),
        [field]: value,
      },
    }))
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Activity className="size-4 text-muted-foreground" />
            <span className="text-[13px] font-medium tracking-tight">MCP Testing Workbench</span>
            <span className="hidden text-[11px] text-muted-foreground sm:inline">
              / Sales Analytics Suite
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRun}
              disabled={isRunning || selectedScenarioIds.length === 0}
              className="gap-1.5"
            >
              {isRunning ? <Loader2 className="size-3 animate-spin" /> : <Play data-icon="inline-start" />}
              {isRunning ? "Running" : "Run"}
            </Button>
          </div>
        </div>
      </header>

      <div className="border-b border-border bg-card/50">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="flex size-5 shrink-0 items-center justify-center rounded-full border border-border">
              <Circle
                className={`size-2 ${
                  discovery
                    ? "fill-emerald-400 text-emerald-400"
                    : "fill-muted-foreground text-muted-foreground"
                }`}
              />
            </div>
            <input
              value={serverUrl}
              onChange={(event) => setServerUrl(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void handleConnect()
                }
              }}
              className="min-w-0 flex-1 bg-transparent font-mono text-xs text-foreground outline-none placeholder:text-muted-foreground"
              placeholder="Server URL"
            />
          </div>

          <div className="flex items-center gap-2">
            {hasPendingServerChange ? (
              <span className="text-[11px] text-amber-500">URL changed</span>
            ) : null}
            <Button
              variant="ghost"
              size="xs"
              onClick={handleConnect}
              disabled={isRefreshing}
              className="gap-1.5 text-xs"
            >
              <PlugZap data-icon="inline-start" />
              {isRefreshing ? "Connecting..." : "Connect"}
            </Button>
          </div>
        </div>
      </div>

      <nav className="border-b border-border">
        <div className="mx-auto flex max-w-[1400px] gap-0 overflow-x-auto px-4 sm:px-6">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`relative px-3 py-2.5 text-[13px] capitalize transition-colors ${
                activeTab === tab ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
              {activeTab === tab ? <span className="absolute inset-x-0 bottom-0 h-px bg-foreground" /> : null}
            </button>
          ))}
        </div>
      </nav>

      {error ? (
        <div className="border-b border-red-500/20 bg-red-500/5">
          <div className="mx-auto max-w-[1400px] px-4 py-2 sm:px-6">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        </div>
      ) : null}

      <main className="mx-auto max-w-[1400px] overflow-hidden px-4 py-6 sm:px-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {activeTab === "resources" ? (
              <ContentSection title="Resources" count={discovery?.resources.length ?? 0}>
                <ItemList
                  items={discovery?.resources ?? []}
                  renderItem={(resource) => <ResourceRow key={resource.uri} resource={resource} />}
                  empty="No resources discovered"
                />
              </ContentSection>
            ) : null}

            {activeTab === "tools" ? (
              <ContentSection title="Tools" count={discovery?.tools.length ?? 0}>
                <ItemList
                  items={discovery?.tools ?? []}
                  renderItem={(tool) => <ToolRow key={tool.name} tool={tool} />}
                  empty="No tools discovered"
                />
              </ContentSection>
            ) : null}

            {activeTab === "apps" ? (
              <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
                <ContentSection title="App Surfaces" count={appEntries.length}>
                  {appEntries.length > 0 ? (
                    <div className="divide-y divide-border overflow-hidden rounded-md border border-border">
                      {appEntries.map((entry, index) => (
                        <button
                          key={entry.key}
                          type="button"
                          onClick={() => setSelectedAppIndex(index)}
                          className={`w-full text-left transition-colors ${
                            index === selectedAppIndex ? "bg-card" : "hover:bg-card/50"
                          }`}
                        >
                          <AppRow entry={entry} />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <Empty text="No MCP Apps surfaces detected" />
                  )}
                </ContentSection>

                <ContentSection
                  title={selectedAppEntry?.title ?? "App Preview"}
                  count={selectedAppResource?.text ? selectedAppResource.text.length : 0}
                  trailing={
                    selectedAppEntry?.uri ? (
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {selectedAppEntry.uri}
                      </span>
                    ) : undefined
                  }
                >
                  <AppPreviewPanel
                    entry={selectedAppEntry}
                    resource={selectedAppResource}
                    serverUrl={connectedServerUrl}
                    draft={selectedAppDraft}
                    toolResult={appToolResult}
                    isLoading={isLoadingAppResource}
                    isRunningTool={isRunningAppTool}
                    error={appResourceError}
                    onFieldChange={handleAppFieldChange}
                    onRunTool={handleRunAppTool}
                  />
                </ContentSection>
              </div>
            ) : null}

            {activeTab === "scenarios" ? (
              <ContentSection
                title="Scenarios"
                count={scenarios.length}
                trailing={<span className="text-xs text-muted-foreground">{selectedScenarioIds.length} selected</span>}
              >
                <ItemList
                  items={scenarios}
                  renderItem={(scenario) => (
                    <ScenarioRow
                      key={scenario.id}
                      scenario={scenario}
                      selected={selectedScenarioIds.includes(scenario.id)}
                      onToggle={() =>
                        setSelectedScenarioIds((current) =>
                          current.includes(scenario.id)
                            ? current.filter((id) => id !== scenario.id)
                            : [...current, scenario.id],
                        )
                      }
                    />
                  )}
                  empty="No scenarios loaded"
                />
              </ContentSection>
            ) : null}

            {activeTab === "runs" ? (
              <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
                <ContentSection
                  title="Run Summary"
                  count={report?.totals.scenarios ?? 0}
                  trailing={
                    report ? (
                      <span className="font-mono text-xs text-muted-foreground">{report.durationMs}ms</span>
                    ) : undefined
                  }
                >
                  {report ? (
                    <RunSummaryList
                      report={report}
                      selectedResultId={selectedResult?.id ?? null}
                      onSelect={setSelectedScenarioResultId}
                    />
                  ) : (
                    <Empty text="Run scenarios to see results" />
                  )}
                </ContentSection>

                <ContentSection
                  title="Detail"
                  count={selectedResult?.assertions.length ?? 0}
                  trailing={selectedResult ? <StatusBadge status={selectedResult.status} /> : undefined}
                >
                  {selectedResult ? <RunDetail result={selectedResult} /> : <Empty text="Select a result" />}
                </ContentSection>
              </div>
            ) : null}

            {activeTab === "traces" ? (
              <div className="grid gap-6 lg:grid-cols-2">
                <ContentSection title="MCP Trace" count={latestTraces?.mcpTrace.length ?? 0}>
                  <TracePanel
                    entries={latestTraces?.mcpTrace ?? []}
                    selectedIndex={selectedMcpTraceIndex}
                    onSelect={setSelectedMcpTraceIndex}
                  />
                </ContentSection>

                <ContentSection title="App Trace" count={latestTraces?.appTrace.length ?? 0}>
                  <TracePanel
                    entries={latestTraces?.appTrace ?? []}
                    selectedIndex={selectedAppTraceIndex}
                    onSelect={setSelectedAppTraceIndex}
                  />
                </ContentSection>
              </div>
            ) : null}
          </>
        )}
      </main>
    </div>
  )
}

export default App
