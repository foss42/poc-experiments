import type { McpToolDefinition } from "../shared/mcp"
import type { McpHttpClient } from "../client/mcp-http-client"
import type { UiResourceSnapshot } from "../shared/scenario"

export function findTool(
  tools: McpToolDefinition[],
  name: string,
): McpToolDefinition | undefined {
  return tools.find((t) => t.name === name)
}

export function getUiResourceUri(
  meta: Record<string, unknown> | undefined,
): string | undefined {
  const ui = (meta?.ui ?? {}) as { resourceUri?: string }
  return ui.resourceUri
}

export async function fetchLinkedUiResource(
  client: McpHttpClient,
  tool: McpToolDefinition | undefined,
): Promise<UiResourceSnapshot | null> {
  const uri = getUiResourceUri(tool?._meta)
  if (!uri) return null
  const resource = await client.readResource(uri)
  return { uri, resource }
}
