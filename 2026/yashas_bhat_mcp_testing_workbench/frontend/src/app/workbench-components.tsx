import { useMemo, type ReactNode } from "react"
import { CheckCircle2, ChevronRight, Circle, Loader2, Play, XCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import type {
  HostTraceEntry,
  McpResourceContents,
  McpResourceDefinition,
  McpToolDefinition,
  ScenarioManifest,
  ScenarioResult,
  ToolCallPayload,
  TraceEntry,
} from "@/types/mcp"
import type { AppEntry, SchemaField } from "@/app/workbench-types"
import {
  buildHostedAppDocument,
  countSchemaKeys,
  formatTime,
  getSchemaFields,
  getToolNotificationPayload,
  getUiResourceUri,
} from "@/app/workbench-utils"

export function ContentSection({
  title,
  count,
  trailing,
  children,
}: {
  title: string
  count: number
  trailing?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-2">
          <h2 className="text-sm font-medium">{title}</h2>
          <span className="font-mono text-xs text-muted-foreground">{count}</span>
        </div>
        {trailing}
      </div>
      {children}
    </section>
  )
}

export function ItemList<T>({
  items,
  renderItem,
  empty,
}: {
  items: T[]
  renderItem: (item: T) => ReactNode
  empty: string
}) {
  if (items.length === 0) {
    return <Empty text={empty} />
  }

  return (
    <div className="divide-y divide-border overflow-hidden rounded-md border border-border">
      {items.map(renderItem)}
    </div>
  )
}

export function Empty({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center rounded-md border border-dashed border-border py-12">
      <p className="text-xs text-muted-foreground">{text}</p>
    </div>
  )
}

export function ResourceRow({ resource }: { resource: McpResourceDefinition }) {
  return (
    <div className="flex flex-col gap-1 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="truncate text-[13px]">{resource.name ?? resource.uri}</div>
        {resource.description ? (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{resource.description}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {resource.mimeType ? (
          <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            {resource.mimeType}
          </span>
        ) : null}
        <span className="break-all font-mono text-[10px] text-muted-foreground">{resource.uri}</span>
      </div>
    </div>
  )
}

export function ToolRow({ tool }: { tool: McpToolDefinition }) {
  const uiUri = getUiResourceUri(tool._meta)

  return (
    <div className="flex flex-col gap-1.5 px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate font-mono text-[13px]">{tool.name}</span>
            {uiUri ? (
              <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                app
              </span>
            ) : null}
          </div>
          {tool.description ? (
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{tool.description}</p>
          ) : null}
        </div>
        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
          {countSchemaKeys(tool.inputSchema)} params
        </span>
      </div>
      {uiUri ? <div className="font-mono text-[10px] text-muted-foreground">{uiUri}</div> : null}
    </div>
  )
}

export function AppRow({ entry }: { entry: AppEntry }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-3">
      <div className="min-w-0">
        <div className="truncate text-[13px]">{entry.title}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{entry.kind}</div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {entry.mimeType ? (
          <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            {entry.mimeType}
          </span>
        ) : null}
      </div>
    </div>
  )
}

export function AppPreviewPanel({
  entry,
  resource,
  serverUrl,
  draft,
  toolResult,
  isLoading,
  isRunningTool,
  error,
  onFieldChange,
  onRunTool,
}: {
  entry: AppEntry | null
  resource: McpResourceContents | null
  serverUrl: string
  draft: Record<string, string>
  toolResult: ToolCallPayload | null
  isLoading: boolean
  isRunningTool: boolean
  error: string | null
  onFieldChange: (field: string, value: string) => void
  onRunTool: () => void
}) {
  if (!entry) {
    return <Empty text="Select an MCP App surface" />
  }

  if (isLoading) {
    return <Empty text="Loading app resource..." />
  }

  if (error) {
    return <Empty text={error} />
  }

  if (!resource) {
    return <Empty text="No resource content loaded" />
  }

  const canRender = resource.mimeType?.includes("mcp-app") && typeof resource.text === "string"
  const schemaFields = getSchemaFields(entry.inputSchema)
  const toolPayload = getToolNotificationPayload(toolResult?.result)

  return (
    <div className="flex min-w-0 flex-col gap-4 overflow-hidden">
      <div className="rounded-md border border-border px-3 py-2">
        <div className="text-[13px]">{entry.title}</div>
        <div className="mt-1 text-xs text-muted-foreground">{entry.kind}</div>
        <div className="mt-2 break-all font-mono text-[10px] text-muted-foreground">{resource.uri}</div>
      </div>

      {entry.toolName ? (
        <div className="overflow-hidden rounded-md border border-border">
          <div className="border-b border-border px-3 py-2 text-xs text-muted-foreground">
            Tool Input
          </div>
          <div className="flex flex-col gap-3 p-3">
            {schemaFields.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {schemaFields.map((field) => (
                  <SchemaFieldInput
                    key={field.name}
                    field={field}
                    value={draft[field.name] ?? ""}
                    onChange={onFieldChange}
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">This tool does not require input.</p>
            )}

            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] text-muted-foreground">
                Run the tool, then hydrate the MCP App with the returned payload.
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={onRunTool}
                disabled={isRunningTool}
                className="gap-1.5"
              >
                {isRunningTool ? <Loader2 className="size-3 animate-spin" /> : <Play className="size-3" />}
                {isRunningTool ? "Running" : "Run Tool"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {canRender ? (
        <div className="overflow-hidden rounded-md border border-border">
          <div className="border-b border-border px-3 py-2 text-xs text-muted-foreground">
            Rendered Preview
          </div>
          <div className="overflow-hidden bg-card p-4">
            <HostAwareAppFrame
              title={entry.title}
              appHtml={resource.text ?? ""}
              serverUrl={serverUrl}
              toolPayload={toolPayload}
            />
          </div>
        </div>
      ) : null}

      {toolResult ? (
        <div className="overflow-hidden rounded-md border border-border">
          <div className="border-b border-border px-3 py-2 text-xs text-muted-foreground">
            Tool Response
          </div>
          <pre className="max-h-[22rem] overflow-auto p-3 font-mono text-[11px] leading-5 text-muted-foreground">
            {JSON.stringify(toolResult.result, null, 2)}
          </pre>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-md border border-border">
        <div className="border-b border-border px-3 py-2 text-xs text-muted-foreground">
          Source
        </div>
        <pre className="max-h-[28rem] overflow-auto p-3 font-mono text-[11px] leading-5 text-muted-foreground">
          {resource.text ?? resource.blob ?? ""}
        </pre>
      </div>
    </div>
  )
}

function HostAwareAppFrame({
  title,
  appHtml,
  serverUrl,
  toolPayload,
}: {
  title: string
  appHtml: string
  serverUrl: string
  toolPayload: unknown
}) {
  const srcDoc = useMemo(
    () => buildHostedAppDocument(appHtml, serverUrl, toolPayload),
    [appHtml, serverUrl, toolPayload],
  )

  return (
    <iframe
      title={title}
      sandbox="allow-scripts allow-same-origin"
      srcDoc={srcDoc}
      className="block h-[32rem] w-full rounded-md border border-border bg-card"
    />
  )
}

function SchemaFieldInput({
  field,
  value,
  onChange,
}: {
  field: SchemaField
  value: string
  onChange: (field: string, value: string) => void
}) {
  const isJsonField = field.type === "array" || field.type === "object"

  return (
    <label className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span className="text-xs">{field.label}</span>
        <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          {field.type}
        </span>
        {field.required ? <span className="text-[10px] text-muted-foreground">required</span> : null}
      </div>
      {isJsonField ? (
        <textarea
          value={value}
          onChange={(event) => onChange(field.name, event.target.value)}
          className="min-h-24 rounded-md border border-border bg-background px-3 py-2 font-mono text-xs outline-none"
          placeholder={field.type === "array" ? "[]" : "{}"}
        />
      ) : (
        <input
          type={field.type === "number" || field.type === "integer" ? "number" : "text"}
          value={value}
          onChange={(event) => onChange(field.name, event.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-xs outline-none"
          placeholder={field.label}
        />
      )}
      {field.description ? (
        <span className="text-[11px] text-muted-foreground">{field.description}</span>
      ) : null}
    </label>
  )
}

export function ScenarioRow({
  scenario,
  selected,
  onToggle,
}: {
  scenario: ScenarioManifest
  selected: boolean
  onToggle: () => void
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 px-3 py-3 transition-colors ${
        selected ? "bg-card" : "hover:bg-card/50"
      }`}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        className="mt-0.5 size-3.5 accent-foreground"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px]">{scenario.title}</span>
          <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            {scenario.suite}
          </span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{scenario.description}</p>
        {scenario.tags.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {scenario.tags.map((tag) => (
              <span
                key={tag}
                className="rounded bg-card px-1.5 py-0.5 text-[10px] text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </label>
  )
}

export function RunDetail({ result }: { result: ScenarioResult }) {
  const steps = result.steps ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="divide-y divide-border overflow-hidden rounded-md border border-border">
        {result.assertions.map((assertion) => (
          <div key={assertion.id} className="flex items-start gap-3 px-3 py-2.5">
            <StatusDot status={assertion.status} />
            <div className="min-w-0 flex-1">
              <div className="text-[13px]">{assertion.title}</div>
              <p className="mt-0.5 text-xs text-muted-foreground">{assertion.message}</p>
            </div>
          </div>
        ))}
      </div>

      {steps.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <div className="text-xs text-muted-foreground">Steps</div>
          <div className="divide-y divide-border overflow-hidden rounded-md border border-border">
            {steps.map((step, index) => (
              <div key={`${step.title}-${index}`} className="flex items-start justify-between gap-3 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="text-[13px]">{step.title}</div>
                  {step.status === "failed" && step.error ? (
                    <p className="mt-0.5 text-xs text-red-400/90">{step.error}</p>
                  ) : null}
                </div>
                <div className="shrink-0 text-right">
                  <span
                    className={
                      step.status === "failed"
                        ? "text-[10px] text-red-400"
                        : "text-[10px] text-muted-foreground"
                    }
                  >
                    {step.status}
                  </span>
                  <div className="font-mono text-[10px] text-muted-foreground">{step.durationMs}ms</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {result.notes.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <div className="text-xs text-muted-foreground">Notes</div>
          <ul className="list-inside list-disc space-y-1 rounded-md border border-border px-3 py-2 text-[12px] text-muted-foreground">
            {result.notes.map((line, index) => (
              <li key={index} className="font-mono text-[11px] leading-relaxed">
                {line}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {result.artifacts.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <div className="text-xs text-muted-foreground">Artifacts</div>
          {result.artifacts.map((artifact) => (
            <div key={artifact.path} className="rounded-md border border-border px-3 py-2">
              <div className="text-[13px]">{artifact.label}</div>
              <div className="font-mono text-[10px] text-muted-foreground">{artifact.path}</div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function TracePanel({
  entries,
  selectedIndex,
  onSelect,
}: {
  entries: Array<TraceEntry | HostTraceEntry>
  selectedIndex: number
  onSelect: (i: number) => void
}) {
  if (entries.length === 0) {
    return <Empty text="No trace captured" />
  }

  const selected = entries[Math.min(selectedIndex, entries.length - 1)] ?? entries[0]

  return (
    <div className="flex flex-col gap-3">
      <div className="max-h-48 divide-y divide-border overflow-y-auto rounded-md border border-border">
        {entries.map((entry, index) => (
          <button
            key={`${entry.timestamp}-${index}`}
            type="button"
            onClick={() => onSelect(index)}
            className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-[12px] transition-colors ${
              index === selectedIndex ? "bg-card" : "hover:bg-card/50"
            }`}
          >
            <span className="min-w-0 truncate font-mono">{entry.method ?? "unknown"}</span>
            <span className="shrink-0 text-[10px] text-muted-foreground">{entry.direction}</span>
          </button>
        ))}
      </div>

      <div className="rounded-md border border-border">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="font-mono text-xs">{selected.method ?? "unknown"}</span>
          <span className="text-[10px] text-muted-foreground">
            {selected.direction} &middot; {formatTime(selected.timestamp)}
          </span>
        </div>
        <pre className="max-h-80 overflow-auto p-3 font-mono text-[11px] leading-5 text-muted-foreground">
          {JSON.stringify(selected.payload, null, 2)}
        </pre>
      </div>
    </div>
  )
}

export function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: string | number
  tone?: "good" | "bad"
}) {
  const color =
    tone === "good" ? "text-emerald-400" : tone === "bad" ? "text-red-400" : "text-foreground"

  return (
    <div className="bg-card px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 font-mono text-lg font-medium ${color}`}>{value}</div>
    </div>
  )
}

export function StatusDot({ status }: { status: "passed" | "failed" }) {
  return status === "passed" ? (
    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-400" />
  ) : (
    <XCircle className="mt-0.5 size-3.5 shrink-0 text-red-400" />
  )
}

export function StatusBadge({ status }: { status: "passed" | "failed" }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
        status === "passed" ? "text-emerald-400" : "text-red-400"
      }`}
    >
      <Circle className={`size-1.5 ${status === "passed" ? "fill-emerald-400" : "fill-red-400"}`} />
      {status}
    </span>
  )
}

export function RunSummaryList({
  report,
  selectedResultId,
  onSelect,
}: {
  report: { totals: { scenarios: number; passed: number; failed: number; assertions: number; assertionsFailed: number }; scenarioResults: ScenarioResult[] }
  selectedResultId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border sm:grid-cols-4">
        <Stat label="Scenarios" value={report.totals.scenarios} />
        <Stat label="Passed" value={report.totals.passed} tone="good" />
        <Stat label="Failed" value={report.totals.failed} tone="bad" />
        <Stat
          label="Assertions"
          value={`${report.totals.assertions - report.totals.assertionsFailed}/${report.totals.assertions}`}
        />
      </div>

      <div className="divide-y divide-border overflow-hidden rounded-md border border-border">
        {report.scenarioResults.map((result) => (
          <button
            key={result.id}
            type="button"
            onClick={() => onSelect(result.id)}
            className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
              selectedResultId === result.id ? "bg-card" : "hover:bg-card/50"
            }`}
          >
            <StatusDot status={result.status} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px]">{result.title}</div>
              <div className="truncate font-mono text-[11px] text-muted-foreground">
                {result.suite} &middot; {result.durationMs}ms
              </div>
            </div>
            <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  )
}
