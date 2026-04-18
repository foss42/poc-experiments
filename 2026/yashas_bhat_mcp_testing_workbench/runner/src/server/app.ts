import { Hono } from "hono"
import { cors } from "hono/cors"
import type { Context } from "hono"
import { z } from "zod"

import { createMcpHttpClient } from "../client/mcp-http-client"
import { buildScenarioManifestMap } from "../runner/scenario-loader"
import { runScenarioSuite } from "../runner/scenario-runner"
import { readLatestReport, readLatestTraces } from "./storage"

class InvalidJsonBodyError extends Error {}

const postRunBodySchema = z.object({
  serverUrl: z.string().optional(),
  scenarioIds: z.array(z.string()).optional(),
})

const postToolCallBodySchema = z.object({
  serverUrl: z.string().optional(),
  toolName: z.string().min(1),
  arguments: z.record(z.string(), z.unknown()).optional(),
})

async function readJsonBody(c: Context): Promise<unknown> {
  const text = await c.req.text()
  if (!text.trim()) {
    return {}
  }
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new InvalidJsonBodyError("Invalid JSON request body")
  }
}

function advertisesCapability(
  capabilities: Record<string, unknown> | undefined,
  name: "tools" | "resources",
): boolean {
  return name in (capabilities ?? {})
}

async function loadDiscoveryCollection<T>(
  advertised: boolean,
  load: () => Promise<T>,
  fallback: T,
): Promise<T> {
  if (advertised) {
    return load()
  }

  try {
    return await load()
  } catch {
    return fallback
  }
}

export function createApp(defaultServerUrl: string): Hono {
  const app = new Hono()

  app.use("*", cors({ origin: "*" }))

  app.onError((err, c) => {
    if (err instanceof InvalidJsonBodyError) {
      return c.json({ error: err.message }, 400)
    }
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 500)
  })

  app.get("/api/health", (c) => c.json({ ok: true, defaultServerUrl }, 200))

  app.get("/api/scenarios", (c) => c.json(Array.from(buildScenarioManifestMap().values()), 200))

  app.get("/api/discovery", async (c) => {
    const serverUrl = c.req.query("serverUrl") ?? defaultServerUrl
    const client = createMcpHttpClient({ serverUrl })
    const initialize = await client.initialize()
    const capabilities = initialize.capabilities
    const [tools, resources] = await Promise.all([
      loadDiscoveryCollection(
        advertisesCapability(capabilities, "tools"),
        () => client.listTools(),
        [],
      ),
      loadDiscoveryCollection(
        advertisesCapability(capabilities, "resources"),
        () => client.listResources(),
        [],
      ),
    ])
    return c.json({ serverUrl, initialize, tools, resources }, 200)
  })

  app.get("/api/resource", async (c) => {
    const serverUrl = c.req.query("serverUrl") ?? defaultServerUrl
    const resourceUri = c.req.query("uri")
    if (!resourceUri) {
      return c.json({ error: "Missing resource uri" }, 400)
    }
    const client = createMcpHttpClient({ serverUrl })
    await client.initialize()
    const resource = await client.readResource(resourceUri)
    return c.json({ serverUrl, resource }, 200)
  })

  app.post("/api/tools/call", async (c) => {
    const raw = await readJsonBody(c)
    const parsed = postToolCallBodySchema.safeParse(raw)
    if (!parsed.success) {
      return c.json({ error: "Invalid request", issues: parsed.error.issues }, 400)
    }
    const body = parsed.data
    const serverUrl = body.serverUrl ?? defaultServerUrl
    const client = createMcpHttpClient({ serverUrl })
    await client.initialize()
    const result = await client.callTool(body.toolName, body.arguments ?? {})
    return c.json({ serverUrl, toolName: body.toolName, result }, 200)
  })

  app.get("/api/report/latest", async (c) => {
    const latestReport = await readLatestReport()
    if (!latestReport) {
      return c.json({ error: "No saved run report found yet" }, 404)
    }
    return c.json(latestReport, 200)
  })

  app.get("/api/traces/latest", async (c) => {
    const traces = await readLatestTraces()
    if (!traces) {
      return c.json({ error: "No saved traces found yet" }, 404)
    }
    return c.json(traces, 200)
  })

  app.post("/api/run", async (c) => {
    const raw = await readJsonBody(c)
    const parsed = postRunBodySchema.safeParse(raw)
    if (!parsed.success) {
      return c.json({ error: "Invalid request", issues: parsed.error.issues }, 400)
    }
    const body = parsed.data
    const report = await runScenarioSuite({
      serverUrl: body.serverUrl ?? defaultServerUrl,
      scenarioIds: body.scenarioIds,
    })
    return c.json(report, 200)
  })

  app.notFound((c) => c.json({ error: "Not found" }, 404))

  return app
}
