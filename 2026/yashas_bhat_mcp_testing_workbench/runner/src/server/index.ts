import { serve } from "@hono/node-server"

import { runScenarioSuite } from "../runner/scenario-runner"
import { createApp } from "./app"
import { readLatestReport } from "./storage"

const PORT = 4177
const DEFAULT_SERVER_URL = process.env.MCP_SERVER_URL ?? "http://localhost:3000/mcp"

async function main() {
  if (process.argv.includes("--run-once")) {
    const report = await runScenarioSuite({ serverUrl: DEFAULT_SERVER_URL })
    console.log(JSON.stringify(report, null, 2))
    return
  }

  if (process.argv.includes("--print-latest")) {
    const latest = await readLatestReport()
    console.log(JSON.stringify(latest, null, 2))
    return
  }

  const app = createApp(DEFAULT_SERVER_URL)
  serve(
    {
      fetch: app.fetch,
      port: PORT,
      hostname: "127.0.0.1",
    },
    (info) => {
      console.log(`MCP Testing Workbench API listening on http://127.0.0.1:${info.port}`)
    },
  )
}

void main()
