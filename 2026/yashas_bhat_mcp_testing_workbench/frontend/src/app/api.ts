import type {
  DiscoveryPayload,
  LatestTracesPayload,
  ResourcePayload,
  RunReport,
  ScenarioManifest,
  ToolCallPayload,
} from "@/types/mcp"

export async function fetchScenarioManifests() {
  const response = await fetch("/api/scenarios")
  if (!response.ok) {
    throw new Error("Failed to load scenario manifests")
  }
  return (await response.json()) as ScenarioManifest[]
}

export async function fetchLatestReport() {
  const response = await fetch("/api/report/latest")
  if (response.status === 404) {
    return null
  }
  if (!response.ok) {
    throw new Error("Failed to load the latest report")
  }
  return (await response.json()) as RunReport
}

export async function fetchDiscovery(serverUrl: string) {
  const response = await fetch(`/api/discovery?serverUrl=${encodeURIComponent(serverUrl)}`)
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText)
  }
  return (await response.json()) as DiscoveryPayload
}

export async function fetchLatestTraces() {
  const response = await fetch("/api/traces/latest")
  if (response.status === 404) {
    return null
  }
  if (!response.ok) {
    throw new Error("Failed to load latest traces")
  }
  return (await response.json()) as LatestTracesPayload
}

export async function fetchResource(serverUrl: string, uri: string) {
  const response = await fetch(
    `/api/resource?serverUrl=${encodeURIComponent(serverUrl)}&uri=${encodeURIComponent(uri)}`,
  )
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText)
  }
  return (await response.json()) as ResourcePayload
}

export async function callTool(payload: {
  serverUrl: string
  toolName: string
  arguments: Record<string, unknown>
}) {
  const response = await fetch("/api/tools/call", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText)
  }

  return (await response.json()) as ToolCallPayload
}

export async function runScenarios(payload: {
  serverUrl: string
  scenarioIds: string[]
}) {
  const response = await fetch("/api/run", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText)
  }

  return (await response.json()) as RunReport
}
