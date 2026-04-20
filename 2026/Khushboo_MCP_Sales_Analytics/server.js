import express from "express";
import cors from "cors";
import { runTests } from "./testing/testRunner.js";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Health check — pings your MCP server at port 3000
app.get("/api/health", async (req, res) => {
  try {
    const response = await fetch("http://localhost:3000/health");
    const data = await response.json();
    res.json({
      success: true,
      toolCount: 4,
      toolNames: [
        "select-sales-metric",
        "get-sales-data",
        "visualize-sales-data",
        "show-sales-pdf-report",
      ],
      mcpUrl: "http://localhost:3000/mcp",
      serverInfo: data,
    });
  } catch (e) {
    res.json({
      success: false,
      error: "MCP server not reachable at http://localhost:3000 — " + e.message,
    });
  }
});

// Run all tests
app.get("/api/run-tests", async (req, res) => {
  try {
    const result = await runTests();
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(4000, () => {
  console.log("🚀 UI running → http://localhost:4000");
});