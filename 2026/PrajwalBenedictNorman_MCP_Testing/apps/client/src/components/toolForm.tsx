import { mcpConnection } from "../lib/connection.ts"
import { useState, useEffect, useMemo, type ReactNode } from "react"
import type { MCPTool } from "../lib/connection.ts"
import { saveRequest } from "../lib/collection.ts"

type JsonSchemaProp = {
  type?: string
  description?: string
  enum?: unknown[]
}

function formatTextPayload(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return text

  // Try direct JSON parsing, including nested JSON strings.
  let candidate = trimmed
  for (let i = 0; i < 3; i += 1) {
    try {
      const parsed = JSON.parse(candidate)
      if (typeof parsed === "string") {
        candidate = parsed.trim()
        continue
      }
      return JSON.stringify(parsed, null, 2)
    } catch {
      break
    }
  }

  // Handle mixed payloads like "message\n{\"id\":1}".
  const firstBrace = Math.max(trimmed.indexOf("{"), trimmed.indexOf("["))
  if (firstBrace > 0) {
    const prefix = trimmed.slice(0, firstBrace).trim()
    const jsonPart = trimmed.slice(firstBrace).trim()
    try {
      const parsed = JSON.parse(jsonPart)
      return prefix ? `${prefix}\n${JSON.stringify(parsed, null, 2)}` : JSON.stringify(parsed, null, 2)
    } catch {
      /* no-op */
    }
  }

  return text
}

function getRequiredSet(inputSchema: Record<string, unknown>): Set<string> {
  const req = inputSchema.required
  if (!Array.isArray(req)) return new Set()
  return new Set(req.filter((x): x is string => typeof x === "string"))
}

function ToolForm({
  tool,
  initialValue,
  onSaved,
}: {
  tool: MCPTool
  initialValue?: Record<string, unknown>
  onSaved?: () => void
}) {
  const [values, setValues] = useState<Record<string, unknown>>({})
  const [result, setResult] = useState<string | null>(null)
  const [latency, setLatency] = useState<number>(0)
  const [pdfData, setPdfData] = useState<{ base64: string; fileName: string } | null>(null)
  const [executing, setExecuting] = useState(false)
  const [saveHint, setSaveHint] = useState<string | null>(null)
  const [viewRaw, setViewRaw] = useState(false)
  const [rawDump, setRawDump] = useState<string | null>(null)
  const [lastError, setLastError] = useState<string | null>(null)

  const inputSchema = tool.inputSchema as Record<string, unknown>
  const properties = (inputSchema.properties ?? {}) as Record<string, JsonSchemaProp>
  const required = useMemo(() => getRequiredSet(inputSchema), [inputSchema])

  useEffect(() => {
    if (initialValue) setValues(initialValue)
  }, [initialValue])

  function validate(): string | null {
    for (const key of required) {
      const v = values[key]
      if (v === undefined || v === null || (typeof v === "string" && v.trim() === "")) {
        return `Missing required field: ${key}`
      }
    }
    return null
  }

  async function tryAttachPdfFromHttp(name: string, args: Record<string, unknown>) {
    if (!mcpConnection.httpUrl) return
    try {
      const rawRes = await mcpConnection.callToolRaw(name, args)
      const sc = rawRes?.result?.structuredContent
      if (sc?.pdfBase64 && typeof sc.pdfBase64 === "string") {
        setPdfData({
          base64: sc.pdfBase64,
          fileName: typeof sc.fileName === "string" ? sc.fileName : "report.pdf",
        })
      }
    } catch {
      /* optional path */
    }
  }

  async function execute() {
    setLastError(null)
    setPdfData(null)
    const err = validate()
    if (err) {
      setLastError(err)
      return
    }
    setExecuting(true)
    try {
      const res = await mcpConnection.callTool(tool.name, values)
      setLatency(res.latencyMs)
      setRawDump(JSON.stringify(res.result, null, 2))

      if (res.status === "failure") {
        setResult(null)
        setLastError(res.error ?? "Tool call failed")
        return
      }

      await tryAttachPdfFromHttp(tool.name, values)

      const raw = res.result as any
      let text = ""
      if (raw?.content) {
        text = raw.content
          .map((c: any) => {
            if (c.type === "text") {
              return typeof c.text === "string" ? formatTextPayload(c.text) : String(c.text ?? "")
            }
            if (c.type === "resource")
              return `[MCP resource]\nURI: ${c.resource?.uri}\nMIME: ${c.resource?.mimeType}`
            return JSON.stringify(c, null, 2)
          })
          .join("\n---\n")
      } else {
        text = raw?.text ?? JSON.stringify(raw, null, 2)
      }
      setResult(text)
    } finally {
      setExecuting(false)
    }
  }

  async function save() {
    const err = validate()
    if (err) {
      setLastError(err)
      return
    }
    await saveRequest(tool.name, values)
    setSaveHint("Saved to collection")
    onSaved?.()
    window.setTimeout(() => setSaveHint(null), 2500)
  }

  function copyResponse() {
    const text = viewRaw && rawDump ? rawDump : result
    if (!text) return
    void navigator.clipboard.writeText(text)
  }

  return (
    <div className="px-6 py-4">
      <h2 className="font-bold text-[#1F2E26]/60">Input values</h2>
      {lastError && (
        <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {lastError}
        </p>
      )}
      <div className="mt-3 space-y-4">
        {Object.entries(properties).map(([field, schema]) => {
          const labelExtra =
            schema.type === "array"
              ? " (comma-separated)"
              : schema.type === "object"
                ? " (JSON)"
                : ""
          const label = (
            <label className="text-sm text-[#1F2E26]/70 md:pt-2">
              <span className="font-medium text-[#1F2E26]">
                {field}
                {required.has(field) ? " *" : ""}
              </span>
              {labelExtra}
              {schema.description ? (
                <span className="mt-0.5 block text-xs font-normal text-[#1F2E26]/50">
                  {schema.description}
                </span>
              ) : null}
            </label>
          )

          const enumVals = Array.isArray(schema.enum) ? schema.enum : null

          let control: ReactNode
          if (enumVals && enumVals.length > 0) {
            control = (
              <select
                className="w-full max-w-xl rounded-xl border border-[#DDDAD6] bg-[#F3F1EC]/30 px-3 py-2 text-sm text-[#1F2E26]"
                value={values[field] !== undefined ? String(values[field]) : ""}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, [field]: e.target.value }))
                }
              >
                <option value="">Select…</option>
                {enumVals.map((opt) => (
                  <option key={String(opt)} value={String(opt)}>
                    {String(opt)}
                  </option>
                ))}
              </select>
            )
          } else if (schema.type === "boolean") {
            control = (
              <input
                type="checkbox"
                className="h-4 w-4 accent-[#2C9768]"
                checked={Boolean(values[field])}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, [field]: e.target.checked }))
                }
              />
            )
          } else if (schema.type === "object" || schema.type === "array") {
            control = (
              <textarea
                className="min-h-[4rem] w-full max-w-xl rounded-xl border border-[#DDDAD6] bg-[#F3F1EC]/30 px-3 py-2 font-mono text-sm"
                rows={4}
                value={
                  values[field] !== undefined
                    ? typeof values[field] === "object"
                      ? JSON.stringify(values[field], null, 2)
                      : String(values[field])
                    : ""
                }
                onChange={(e) => {
                  setValues((prev) => ({
                    ...prev,
                    [field]:
                      schema.type === "array"
                        ? e.target.value
                            .split(",")
                            .map((s) => s.trim().replace(/^["'\[\]\s]+|["'\[\]\s]+$/g, ""))
                        : (() => {
                            try {
                              return JSON.parse(e.target.value)
                            } catch {
                              return e.target.value
                            }
                          })(),
                  }))
                }}
              />
            )
          } else {
            control = (
              <input
                className="h-9 w-full max-w-xl rounded-xl border border-[#DDDAD6] bg-[#F3F1EC]/30 px-3 text-sm"
                type={schema.type === "number" || schema.type === "integer" ? "number" : "text"}
                value={values[field] !== undefined ? String(values[field]) : ""}
                onChange={(e) =>
                  setValues((prev) => ({
                    ...prev,
                    [field]:
                      schema.type === "number" || schema.type === "integer"
                        ? Number(e.target.value)
                        : e.target.value,
                  }))
                }
              />
            )
          }

          return (
            <div
              key={field}
              className="grid grid-cols-1 gap-2 border-b border-[#DDDAD6]/40 pb-4 last:border-0 md:grid-cols-[minmax(8rem,12rem)_1fr] md:items-start md:gap-x-6"
            >
              {label}
              <div className="min-w-0">{control}</div>
            </div>
          )
        })}
      </div>
      <hr className="mt-4 h-px border-0 bg-[#DDDAD6]" />
      <div className="flex flex-wrap items-center gap-3 py-4">
        <button
          type="button"
          onClick={execute}
          disabled={executing}
          className="rounded-lg bg-[#2C9768]/90 px-4 py-1.5 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {executing ? "Executing…" : "Execute"}
        </button>
        <button
          type="button"
          onClick={save}
          disabled={executing}
          className="rounded-lg bg-[#E8E5E1] px-4 py-1.5 text-sm text-[#1F2E26] disabled:opacity-60"
        >
          Save
        </button>
        {saveHint && <span className="text-sm text-[#2C9768]">{saveHint}</span>}
      </div>
      <div className="py-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-bold text-[#1F2E26]/60">Response</h2>
          {result && (
            <>
              <button
                type="button"
                onClick={() => setViewRaw((v) => !v)}
                className="rounded-lg border border-[#DDDAD6] bg-white px-2 py-1 text-xs text-[#1F2E26]/70"
              >
                {viewRaw ? "Pretty view" : "Raw text"}
              </button>
              <button
                type="button"
                onClick={copyResponse}
                className="rounded-lg border border-[#DDDAD6] bg-white px-2 py-1 text-xs text-[#1F2E26]/70"
              >
                Copy
              </button>
            </>
          )}
        </div>
        {result && (
          <div className="mt-4 flex max-h-[40vh] flex-col overflow-hidden rounded-2xl border border-[#DDDAD6] bg-[#F3F1EC]">
            <p className="shrink-0 border-b border-[#DDDAD6] px-4 py-2 text-sm text-[#1F2E26]/60">
              Latency: {latency} ms
            </p>
            <pre className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap break-words p-4 font-mono text-sm text-[#1F2E26]/85">
              {viewRaw && rawDump ? rawDump : result}
            </pre>
            {pdfData && (
              <div className="border-t border-[#DDDAD6] px-4 py-2">
                <button
                  type="button"
                  onClick={() => {
                    const link = document.createElement("a")
                    link.href = `data:application/pdf;base64,${pdfData.base64}`
                    link.download = pdfData.fileName
                    link.click()
                  }}
                  className="rounded-lg bg-[#2C9768]/90 px-3 py-1 text-sm text-white"
                >
                  Download PDF
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default ToolForm