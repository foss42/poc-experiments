import { chromium, type Browser, type Page } from "playwright"

import type { McpHttpClient } from "../client/mcp-http-client"
import type { HostTraceEntry } from "../shared/mcp"

interface HarnessOptions {
  client: McpHttpClient
  onTrace?: (entry: HostTraceEntry) => void
}

interface HostRequestPayload {
  method?: string
  id?: string | number
  params?: Record<string, unknown>
}

export interface HostSession {
  page: Page
  close(): Promise<void>
  getTrace(): HostTraceEntry[]
  waitForMethod(method: string, timeoutMs?: number): Promise<HostTraceEntry>
  postNotification(method: string, params: Record<string, unknown>): Promise<void>
}

export interface McpAppsHarness {
  mountApp(html: string, trace: HostTraceEntry[]): Promise<HostSession>
  close(): Promise<void>
}

export function createMcpAppsHarness({ client, onTrace }: HarnessOptions): McpAppsHarness {
  let browserPromise: Promise<Browser> | null = null

  function getBrowser(): Promise<Browser> {
    if (!browserPromise) {
      browserPromise = chromium.launch({ headless: true })
    }
    return browserPromise
  }

  function buildResponse(payload: HostRequestPayload): unknown | Promise<unknown> {
    if (payload.method === "ui/initialize") {
      return {
        clientInfo: { name: "mcp-testing-workbench", version: "0.1.0" },
        hostContext: { theme: "dark", surface: "workbench" },
      }
    }

    if (payload.method === "tools/call") {
      const toolName = String(payload.params?.name ?? "")
      const args = (payload.params?.arguments ?? {}) as Record<string, unknown>
      return client.callTool(toolName, args)
    }

    if (payload.method === "ui/download-file") {
      return { accepted: true }
    }

    return { acknowledged: true }
  }

  function pushTrace(trace: HostTraceEntry[], entry: HostTraceEntry): void {
    trace.push(entry)
    onTrace?.(entry)
  }

  async function mountApp(html: string, trace: HostTraceEntry[]): Promise<HostSession> {
    const sessionTraceStart = trace.length

    const browser = await getBrowser()
    const page = await browser.newPage()

    await page.exposeBinding(
      "mcpWorkbenchHost",
      async (_source, payload: HostRequestPayload) => {
        pushTrace(trace, {
          kind: "host-app",
          direction: "app->host",
          method: payload.method,
          timestamp: new Date().toISOString(),
          payload,
        })

        if (payload.id === undefined) {
          return null
        }

        const result = await buildResponse(payload)
        const response = { jsonrpc: "2.0" as const, id: payload.id, result }

        pushTrace(trace, {
          kind: "host-app",
          direction: "host->app",
          method: payload.method,
          timestamp: new Date().toISOString(),
          payload: response,
        })

        return response
      },
    )

    await page.setContent(HOST_PAGE_HTML)
    await page.evaluate((appHtml) => {
      const iframe = document.getElementById("mcp-app")
      if (!(iframe instanceof HTMLIFrameElement)) {
        throw new Error("MCP iframe missing")
      }
      iframe.srcdoc = appHtml
    }, html)

    return {
      page,

      async close() {
        await page.close()
      },

      getTrace() {
        return trace
      },

      async waitForMethod(method, timeoutMs = 8_000) {
        const deadline = Date.now() + timeoutMs
        while (Date.now() < deadline) {
          for (let i = sessionTraceStart; i < trace.length; i++) {
            const entry = trace[i]!
            if (entry.method === method && entry.direction === "app->host") {
              return entry
            }
          }
          await page.waitForTimeout(100)
        }
        throw new Error(`Timed out waiting for ${method}`)
      },

      async postNotification(method, params) {
        pushTrace(trace, {
          kind: "host-app",
          direction: "host->app",
          method,
          timestamp: new Date().toISOString(),
          payload: { jsonrpc: "2.0", method, params },
        })
        await page.evaluate(
          ({ m, p }) => {
            const iframe = document.getElementById("mcp-app")
            if (!(iframe instanceof HTMLIFrameElement) || !iframe.contentWindow) {
              throw new Error("MCP iframe not ready")
            }
            iframe.contentWindow.postMessage({ jsonrpc: "2.0", method: m, params: p }, "*")
          },
          { m: method, p: params },
        )
      },
    }
  }

  async function close(): Promise<void> {
    if (!browserPromise) {
      return
    }

    const browser = await browserPromise
    await browser.close()
  }

  return { mountApp, close }
}

const HOST_PAGE_HTML = `<!doctype html>
<html lang="en">
<body style="margin:0;background:#000;">
  <iframe id="mcp-app" title="MCP App" sandbox="allow-scripts allow-same-origin" style="border:0;width:1440px;height:1200px;"></iframe>
  <script>
    window.addEventListener("message", async (event) => {
      const response = await window.mcpWorkbenchHost(event.data);
      if (response && event.source) event.source.postMessage(response, "*");
    });
  </script>
</body>
</html>`
