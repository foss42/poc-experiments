import type {
  DiscoveryPayload,
  ScenarioResult,
  ToolCallPayload,
} from "@/types/mcp"

import type { AppEntry, SchemaField } from "@/app/workbench-types"

export function buildAppEntries(discovery: DiscoveryPayload | null): AppEntry[] {
  if (!discovery) {
    return []
  }

  const toolBackedApps = discovery.tools
    .filter((tool) => getUiResourceUri(tool._meta))
    .map((tool) => ({
      key: `tool:${tool.name}`,
      title: tool.name,
      kind: "Tool-linked UI",
      toolName: tool.name,
      inputSchema: tool.inputSchema,
      uri: getUiResourceUri(tool._meta),
      mimeType: undefined,
      description: tool.description,
    }))

  const toolBackedUris = new Set(toolBackedApps.map((entry) => entry.uri).filter(Boolean))
  const standaloneResources = discovery.resources
    .filter((resource) => resource.mimeType?.includes("mcp-app"))
    .filter((resource) => !toolBackedUris.has(resource.uri))
    .map((resource) => ({
      key: `resource:${resource.uri}`,
      title: resource.name ?? resource.uri,
      kind: "UI resource",
      uri: resource.uri,
      mimeType: resource.mimeType,
      description: resource.description,
    }))

  return [...toolBackedApps, ...standaloneResources]
}

export function getUiResourceUri(meta: Record<string, unknown> | undefined): string | undefined {
  const ui = (meta?.ui ?? {}) as { resourceUri?: string }
  return ui.resourceUri
}

export function countSchemaKeys(schema: Record<string, unknown> | undefined): number {
  const properties = (schema?.properties ?? {}) as Record<string, unknown>
  return Object.keys(properties).length
}

export function formatTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value))
}

export function getSchemaFields(schema: Record<string, unknown> | undefined): SchemaField[] {
  const properties = (schema?.properties ?? {}) as Record<string, Record<string, unknown>>
  const required = new Set(((schema?.required ?? []) as string[]).filter(Boolean))

  return Object.entries(properties).map(([name, property]) => ({
    name,
    label: String(property.title ?? name),
    type: String(property.type ?? "string"),
    required: required.has(name),
    description: typeof property.description === "string" ? property.description : undefined,
  }))
}

export function parseSchemaArguments(
  schema: Record<string, unknown> | undefined,
  draft: Record<string, string>,
): Record<string, unknown> {
  const properties = (schema?.properties ?? {}) as Record<string, Record<string, unknown>>
  const output: Record<string, unknown> = {}

  for (const [name, property] of Object.entries(properties)) {
    const rawValue = draft[name]
    if (rawValue === undefined || rawValue === "") {
      continue
    }

    const type = String(property.type ?? "string")
    if (type === "number" || type === "integer") {
      output[name] = Number(rawValue)
      continue
    }

    if (type === "boolean") {
      output[name] = rawValue === "true"
      continue
    }

    if (type === "array" || type === "object") {
      output[name] = JSON.parse(rawValue)
      continue
    }

    output[name] = rawValue
  }

  return output
}

export function getToolNotificationPayload(result: ToolCallPayload["result"]): unknown {
  if (!result || typeof result !== "object") {
    return null
  }

  const record = result as Record<string, unknown>
  return {
    structuredContent: record.structuredContent ?? result,
    content: record.content,
    _meta: record._meta,
  }
}

export function getSelectedScenarioResult(
  report: { scenarioResults: ScenarioResult[] } | null,
  selectedScenarioResultId: string | null,
): ScenarioResult | null {
  if (!report) {
    return null
  }

  return (
    report.scenarioResults.find((result) => result.id === selectedScenarioResultId) ??
    report.scenarioResults[0] ??
    null
  )
}

export function buildHostedAppDocument(
  appHtml: string,
  serverUrl: string,
  toolPayload: unknown,
): string {
  const serializedAppHtml = JSON.stringify(appHtml).replace(/<\/script/gi, "<\\/script")
  const serializedServerUrl = JSON.stringify(serverUrl).replace(/<\/script/gi, "<\\/script")
  const serializedToolPayload = JSON.stringify(toolPayload ?? null).replace(/<\/script/gi, "<\\/script")

  return `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#0b1017;">
    <iframe
      id="mcp-app"
      title="MCP App"
      sandbox="allow-scripts allow-same-origin"
      style="display:block;border:0;width:100%;height:100%;min-height:512px;background:#0b1017;"
    ></iframe>
    <script>
      const iframe = document.getElementById("mcp-app");
      const serverUrl = ${serializedServerUrl};
      const initialToolPayload = ${serializedToolPayload};
      iframe.srcdoc = ${serializedAppHtml};

      function postToolPayload() {
        if (!initialToolPayload || !iframe.contentWindow) {
          return;
        }

        iframe.contentWindow.postMessage(
          {
            jsonrpc: "2.0",
            method: "ui/notifications/tool-input",
            params: initialToolPayload
          },
          "*"
        );
      }

      iframe.addEventListener("load", () => {
        window.setTimeout(postToolPayload, 50);
      });

      function postJsonRpcResult(target, id, result) {
        target.postMessage(
          {
            jsonrpc: "2.0",
            id,
            result
          },
          "*"
        );
      }

      function postJsonRpcError(target, id, message) {
        target.postMessage(
          {
            jsonrpc: "2.0",
            id,
            error: {
              code: -32000,
              message
            }
          },
          "*"
        );
      }

      async function proxyToolCall(payload) {
        const response = await fetch("/api/tools/call", {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            serverUrl,
            toolName: String(payload.params?.name ?? ""),
            arguments: payload.params?.arguments ?? {}
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || "Tool call failed");
        }

        const body = await response.json();
        return body.result;
      }

      window.addEventListener("message", async (event) => {
        const payload = event.data;
        if (!payload || payload.jsonrpc !== "2.0" || !event.source) {
          return;
        }

        if (payload.method === "ui/initialize" && payload.id !== undefined) {
          postJsonRpcResult(event.source, payload.id, {
            clientInfo: {
              name: "mcp-testing-workbench",
              version: "0.1.0"
            },
            hostContext: {
              theme: "dark",
              surface: "preview"
            }
          });
          return;
        }

        if (payload.method === "ui/notifications/size-changed") {
          const nextHeight = Math.max(Number(payload.params?.height ?? 0), 512);
          iframe.style.height = nextHeight + "px";
          return;
        }

        if (payload.id !== undefined) {
          if (payload.method === "tools/call") {
            try {
              const result = await proxyToolCall(payload);
              postJsonRpcResult(event.source, payload.id, result);
            } catch (error) {
              postJsonRpcError(
                event.source,
                payload.id,
                error instanceof Error ? error.message : String(error)
              );
            }
            return;
          }

          if (payload.method === "ui/update-model-context") {
            postJsonRpcResult(event.source, payload.id, { acknowledged: true });
            return;
          }

          if (payload.method === "ui/download-file") {
            postJsonRpcResult(event.source, payload.id, { accepted: true });
            return;
          }

          postJsonRpcResult(event.source, payload.id, { acknowledged: true });
        }
      });
    </script>
  </body>
</html>`
}
