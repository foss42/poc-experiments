import { useCallback, useEffect, useState, type MouseEvent } from "react"
import { mcpConnection } from "./lib/connection.ts"
import type { MCPTool } from "./lib/connection.ts"
import ToolForm from "./components/toolForm.tsx"
import LoadTestGraph from "./components/loadTestGraph.tsx"
import { getRequests, deleteRequest } from "./lib/collection.ts"
import type { SavedRequest } from "./lib/collection.ts"
import { Activity, FileCode, FolderOpen, SquareChevronRight, Unplug } from "lucide-react"

const LS_KEY = "mcp-session-tester:prefs"

function loadPrefs(): { serverUrl: string; mode: "stdio" | "http" } {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { serverUrl: "http://localhost:3000/mcp", mode: "http" }
    const p = JSON.parse(raw) as { serverUrl?: string; mode?: string }
    return {
      serverUrl: typeof p.serverUrl === "string" ? p.serverUrl : "http://localhost:3000/mcp",
      mode: p.mode === "stdio" ? "stdio" : "http",
    }
  } catch {
    return { serverUrl: "http://localhost:3000/mcp", mode: "http" }
  }
}

function savePrefs(serverUrl: string, mode: "stdio" | "http") {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ serverUrl, mode }))
  } catch {
    /* ignore */
  }
}

function App() {
  const prefs = loadPrefs()
  const [tools, setTools] = useState<MCPTool[]>([])
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "error">("idle")
  const [statusDetail, setStatusDetail] = useState("")
  const [toolDescription, setToolDescription] = useState("")
  const [selectedTool, setSelectedTool] = useState<string | null>(null)
  const [requests, setRequests] = useState<SavedRequest[]>([])
  const [initialValues, setInitialValues] = useState<Record<string, unknown> | undefined>()
  const [selectedConcurrency, setSelectedConcurrency] = useState(5)
  const [serverUrl, setServerUrl] = useState(prefs.serverUrl)
  const [connectionMode, setConnectionMode] = useState<"stdio" | "http">(prefs.mode)

  const activeTool = selectedTool ? tools.find((t) => t.name === selectedTool) : undefined
  const isConnected = status === "connected"

  const refreshRequests = useCallback(() => {
    void getRequests().then(setRequests)
  }, [])

  useEffect(() => {
    refreshRequests()
  }, [refreshRequests])

  useEffect(() => {
    savePrefs(serverUrl, connectionMode)
  }, [serverUrl, connectionMode])

  async function handleConnect() {
    setStatus("connecting")
    setStatusDetail("Connecting…")
    mcpConnection.disconnect()
    setTools([])
    setSelectedTool(null)
    try {
      const discovered = await mcpConnection.connect(serverUrl, connectionMode)
      setTools(discovered)
      setStatus("connected")
      setStatusDetail(
        discovered.length === 0 ? "Connected (no tools)" : `Connected · ${discovered.length} tools`
      )
    } catch (e) {
      setStatus("error")
      setStatusDetail(e instanceof Error ? e.message : String(e))
    }
  }

  function handleDisconnect() {
    mcpConnection.disconnect()
    setTools([])
    setSelectedTool(null)
    setToolDescription("")
    setInitialValues(undefined)
    setStatus("idle")
    setStatusDetail("Disconnected")
  }

  function selectTool(tool: MCPTool) {
    setSelectedTool(tool.name)
    setToolDescription(tool.description ?? "")
    setInitialValues(undefined)
  }

  async function removeSavedRequest(e: MouseEvent<HTMLButtonElement>, id: number | undefined) {
    e.stopPropagation()
    if (id === undefined) return
    await deleteRequest(id)
    refreshRequests()
  }

  return (
    <div className="min-h-screen bg-[#F9F8F6] text-[#1F2E26]">
      <header className="border-b border-[#DDDAD6] bg-[#F3F1EC] px-6 py-4">
        <h1 className="text-lg font-bold text-[#1F2E26]">MCP session tester</h1>
        <p className="text-sm text-[#1F2E26]/60">Developer testing platform</p>
      </header>

      <div className="flex min-h-[calc(100vh-5.5rem)] flex-col lg:flex-row">
        {/* Sidebar */}
        <aside className="flex w-full shrink-0 flex-col border-[#DDDAD6] bg-[#F3F1EC] lg:w-56 lg:border-r">
          <div className="px-4 pt-3">
            <div className="flex items-center py-2">
              <FolderOpen className="h-4 w-4 text-[#1F2E26]/60" aria-hidden />
              <h2 className="px-2 text-xs font-bold tracking-wide text-[#1F2E26]/60">
                Tools available
              </h2>
            </div>
            <hr className="h-px border-0 bg-[#DDDAD6]" />
            {!isConnected && (
              <p className="py-3 text-xs text-[#1F2E26]/45">Connect to a server to list tools.</p>
            )}
            {isConnected && tools.length === 0 && (
              <p className="py-3 text-xs text-[#1F2E26]/45">No tools reported by this server.</p>
            )}
            <ul className="max-h-[30vh] overflow-y-auto lg:max-h-none">
              {tools.map((tool) => (
                <li key={tool.name}>
                  <button
                    type="button"
                    onClick={() => selectTool(tool)}
                    className={`flex w-full items-center rounded-lg p-3 text-left text-sm transition ${
                      selectedTool === tool.name
                        ? "bg-[#2C9768]/15 text-[#1F2E26]"
                        : "text-[#1F2E26]/70 hover:bg-black/5"
                    }`}
                  >
                    <SquareChevronRight className="h-4 w-4 shrink-0 text-[#2C9768]" aria-hidden />
                    <span className="px-2 font-mono text-xs">{tool.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <hr className="h-px border-0 bg-[#DDDAD6]" />
          <div className="flex-1 overflow-hidden px-4 pb-4">
            <div className="flex items-center py-2">
              <FolderOpen className="h-4 w-4 text-[#1F2E26]/60" aria-hidden />
              <h2 className="px-2 text-xs font-bold tracking-wide text-[#1F2E26]/60">
                Collections
              </h2>
            </div>
            <ul className="max-h-[28vh] space-y-1 overflow-y-auto lg:max-h-[40vh]">
              {requests.map((req) => {
                const summary = Object.entries(req.parameters || {})
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(", ")
                return (
                  <li key={req.id ?? `${req.toolName}-${req.savedAt}`}>
                    <div className="group relative rounded-lg hover:bg-black/5">
                      <button
                        type="button"
                        className="flex w-full items-start gap-2 p-3 pr-10 text-left"
                        onClick={() => {
                          const tool = tools.find((t) => t.name === req.toolName)
                          if (!tool) {
                            setStatusDetail(`Tool "${req.toolName}" not in current session — connect first.`)
                            return
                          }
                          setSelectedTool(tool.name)
                          setToolDescription(tool.description ?? "")
                          setInitialValues(req.parameters)
                        }}
                      >
                        <FileCode className="mt-0.5 h-4 w-4 shrink-0 text-[#2C9768]" aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="block font-mono text-sm font-medium text-[#1F2E26]">
                            {req.toolName}
                          </span>
                          <span className="mt-1 block text-xs text-[#1F2E26]/50">{summary || "{}"}</span>
                          <span className="mt-0.5 block text-[10px] text-[#1F2E26]/40">
                            {req.savedAt instanceof Date
                              ? req.savedAt.toLocaleString()
                              : new Date(req.savedAt).toLocaleString()}
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        title="Remove from collection"
                        className="absolute right-1 top-1 rounded p-1 text-[#1F2E26]/35 opacity-0 transition hover:bg-red-100 hover:text-red-700 group-hover:opacity-100"
                        onClick={(e) => removeSavedRequest(e, req.id)}
                      >
                        ×
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1 border-[#DDDAD6] bg-[#F9F8F6] lg:border-r">
          <div className="flex flex-col gap-2 border-b border-[#DDDAD6] p-4 sm:flex-row sm:flex-wrap sm:items-center">
            <span className="text-sm text-[#1F2E26]/60">Server</span>
            <select
              className="h-9 rounded-xl border border-[#DDDAD6] bg-[#F3F1EC] px-2 text-sm text-[#1F2E26]"
              value={connectionMode}
              onChange={(e) => setConnectionMode(e.target.value as "stdio" | "http")}
            >
              <option value="http">HTTP</option>
              <option value="stdio">stdio</option>
            </select>
            <input
              type="text"
              className="h-9 min-w-0 flex-1 rounded-xl border border-[#DDDAD6] bg-[#F3F1EC] px-3 text-sm sm:min-w-[12rem]"
              placeholder={
                connectionMode === "http" ? "http://localhost:3000/mcp" : "npx tsx src/index.ts"
              }
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleConnect()
              }}
            />
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void handleConnect()}
                className="h-9 rounded-xl bg-[#2C9768]/90 px-4 text-sm text-white"
              >
                Connect
              </button>
              <button
                type="button"
                onClick={handleDisconnect}
                className="inline-flex h-9 items-center gap-1 rounded-xl border border-[#DDDAD6] bg-white px-3 text-sm text-[#1F2E26]/80"
              >
                <Unplug className="h-3.5 w-3.5" aria-hidden />
                Disconnect
              </button>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  status === "connected"
                    ? "bg-[#2C9768]/15 text-[#1F5C40]"
                    : status === "connecting"
                      ? "bg-amber-100 text-amber-900"
                      : status === "error"
                        ? "bg-red-100 text-red-800"
                        : "bg-[#E8E5E1] text-[#1F2E26]/70"
                }`}
                title={statusDetail}
              >
                {status === "idle" && "Disconnected"}
                {status === "connecting" && "Connecting…"}
                {status === "connected" && "Connected"}
                {status === "error" && "Error"}
              </span>
            </div>
            {statusDetail && (
              <p className="w-full truncate text-xs text-[#1F2E26]/50" title={statusDetail}>
                {statusDetail}
              </p>
            )}
          </div>

          <div className="p-4">
            <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center">
              <span className="text-xs font-bold uppercase tracking-wide text-[#1F2E26]/50">
                Tool
              </span>
              <p className="rounded-xl border border-[#DDDAD6] bg-white px-3 py-2 text-sm text-[#1F2E26]/80">
                {selectedTool ?? "—"}
              </p>
              <span className="text-xs font-bold uppercase tracking-wide text-[#1F2E26]/50">
                Description
              </span>
              <p className="rounded-xl border border-[#DDDAD6] bg-white px-3 py-2 text-sm leading-relaxed text-[#1F2E26]/75">
                {toolDescription || "—"}
              </p>
            </div>
          </div>

          <hr className="h-px border-0 bg-[#DDDAD6]" />

          {!activeTool && (
            <div className="flex flex-1 items-center justify-center px-6 py-16">
              <p className="max-w-md text-center text-[#1F2E26]/55">
                Select a tool from the left to edit inputs and run it, or open a saved request from
                collections.
              </p>
            </div>
          )}
          {activeTool && (
            <ToolForm
              key={`${activeTool.name}-${JSON.stringify(initialValues ?? {})}`}
              tool={activeTool}
              initialValue={initialValues}
              onSaved={refreshRequests}
            />
          )}
        </main>

        {/* Load test */}
        <aside className="w-full shrink-0 border-t border-[#DDDAD6] bg-[#F3F1EC] p-4 lg:w-[min(22rem,100%)] lg:border-l lg:border-t-0">
          <div className="flex items-center">
            <Activity className="h-4 w-4 text-[#2C9768]" aria-hidden />
            <h2 className="px-2 text-xs font-bold tracking-wide text-[#1F2E26]/60">Load testing</h2>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-sm text-[#1F2E26]/60">Concurrency</span>
            <div className="flex flex-wrap gap-1.5">
              {[1, 5, 10, 20, 30].map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`rounded-xl px-2.5 py-1 text-sm font-medium transition ${
                    selectedConcurrency === c
                      ? "bg-[#2C9768] text-white"
                      : "bg-[#E8E5E1] text-[#1F2E26] hover:bg-[#dedad6]"
                  }`}
                  onClick={() => setSelectedConcurrency(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          {activeTool ? (
            <LoadTestGraph tool={activeTool} concurrencyNumber={selectedConcurrency} />
          ) : (
            <p className="mt-4 text-xs text-[#1F2E26]/45">Select a tool to run load tests.</p>
          )}
        </aside>
      </div>
    </div>
  )
}

export default App