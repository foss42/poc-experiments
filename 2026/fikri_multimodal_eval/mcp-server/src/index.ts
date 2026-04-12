#!/usr/bin/env node
/**
 * Multimodal AI Eval — MCP Apps Server
 *
 * Exposes evaluation capabilities as MCP tools with rich interactive UIs
 * that render inside AI agent chat windows. Follows the sample-mcp-apps-chatflow
 * architecture recommended by API Dash mentors.
 *
 * Flow:
 *   1. Agent calls `select-eval-config` → renders config form MCP App
 *   2. User picks modality + model → form calls `run-multimodal-eval` tool
 *   3. Tool hits Python backend, returns structured results
 *   4. Agent calls `show-eval-results` → renders charts/table MCP App
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express, { Request, Response } from "express";
import { z } from "zod";

import { EVAL_CONFIG_UI } from "./ui/eval-config.js";
import { EVAL_RESULTS_UI } from "./ui/eval-results.js";

const MIME = "text/html;profile=mcp-app" as const;
const URI = "ui://multimodal-eval";
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8001";

const server = new McpServer({
  name: "multimodal-eval-mcp",
  version: "1.0.0",
});

// ─── Resource: Eval Config UI ─────────────────────────────────────────────

server.registerResource(
  "eval-config-ui",
  `${URI}/eval-config`,
  {
    mimeType: MIME,
    description:
      "Interactive evaluation configuration UI for selecting modality, model, and dataset",
  },
  async (uri) => ({
    contents: [{ uri: uri.href, mimeType: MIME, text: EVAL_CONFIG_UI() }],
  }),
);

// ─── Tool: Select Eval Config (renders the config form) ──────────────────

server.registerTool(
  "select-eval-config",
  {
    description:
      "Open the multimodal evaluation configuration UI. Users can select image VQA or audio STT evaluation, choose a local model, and run the eval.",
    _meta: {
      ui: {
        resourceUri: `${URI}/eval-config`,
        visibility: ["model", "app"],
      },
    },
  },
  async () => ({
    content: [
      {
        type: "text" as const,
        text: "Evaluation configuration UI opened. Select modality and model, then click Run.",
      },
    ],
  }),
);

// ─── Tool: Run Eval (called by config UI, hits Python backend) ───────────

server.registerTool(
  "run-multimodal-eval",
  {
    description:
      "Execute a multimodal evaluation against the local backend. Returns structured results with per-sample metrics.",
    inputSchema: {
      modality: z
        .enum(["image", "audio"])
        .describe("Evaluation modality: image VQA or audio STT"),
      model: z
        .string()
        .describe(
          "Model name — Ollama model for image (e.g. llava) or Whisper size for audio (e.g. base)",
        ),
      provider: z
        .enum(["ollama", "huggingface"])
        .optional()
        .default("ollama")
        .describe("Provider for image VQA: ollama (local) or huggingface (cloud)"),
    },
    _meta: {
      ui: {
        resourceUri: `${URI}/eval-config`,
        visibility: ["app"],
      },
    },
  },
  async ({ modality, model, provider }) => {
    console.log(
      `[run-multimodal-eval] modality=${modality}, model=${model}, provider=${provider || "ollama"}`,
    );

    const endpoint =
      modality === "image"
        ? `${BACKEND_URL}/api/eval/image`
        : `${BACKEND_URL}/api/eval/audio`;

    const resp = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, provider: provider || "ollama" }),
    });

    const text = await resp.text();
    const lines = text.split("\n").filter((l) => l.startsWith("data: "));
    let finalResult: Record<string, unknown> = {};

    for (const line of lines) {
      try {
        const event = JSON.parse(line.slice(6));
        if (event.type === "complete") {
          finalResult = event;
        }
      } catch {
        // skip
      }
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `Evaluation complete: ${modality} eval with ${model}. ${
            (finalResult as { summary?: { samples?: number } }).summary?.samples ?? 0
          } samples evaluated.`,
        },
      ],
      structuredContent: finalResult,
    };
  },
);

// ─── Tool: Compare Vision Models (multi-provider comparison) ──────────────

server.registerTool(
  "compare-vision-models",
  {
    description:
      "Compare multiple vision models side-by-side. Returns ROUGE-L, BLEU, and latency metrics for each provider/model combination.",
    inputSchema: {
      providers: z
        .array(
          z.object({
            provider: z.enum(["ollama", "huggingface"]),
            model: z.string(),
          }),
        )
        .min(1)
        .max(4)
        .describe("Array of provider/model combinations to compare (1-4)"),
    },
    _meta: {
      ui: {
        resourceUri: `${URI}/eval-config`,
        visibility: ["app"],
      },
    },
  },
  async ({ providers }) => {
    console.log(
      `[compare-vision-models] providers=${JSON.stringify(providers)}`,
    );

    const resp = await fetch(`${BACKEND_URL}/api/eval/image/compare`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providers }),
    });

    const text = await resp.text();
    const lines = text.split("\n").filter((l) => l.startsWith("data: "));
    let finalResult: Record<string, unknown> = {};

    for (const line of lines) {
      try {
        const event = JSON.parse(line.slice(6));
        if (event.type === "complete") {
          finalResult = event;
        }
      } catch {
        // skip
      }
    }

    const summaryText = Object.entries(
      (finalResult as { summaries?: Record<string, { avg_rouge_l: number; avg_bleu: number; avg_latency_ms: number }> }).summaries || {},
    )
      .map(
        ([k, v]) =>
          `${k}: ROUGE-L=${v.avg_rouge_l.toFixed(3)}, BLEU=${v.avg_bleu.toFixed(3)}, latency=${v.avg_latency_ms.toFixed(0)}ms`,
      )
      .join("; ");

    return {
      content: [
        {
          type: "text" as const,
          text: `Comparison complete: ${providers.length} models evaluated. ${summaryText}`,
        },
      ],
      structuredContent: finalResult,
    };
  },
);

// ─── Resource: Eval Results Visualization UI ─────────────────────────────

server.registerResource(
  "eval-results-ui",
  `${URI}/eval-results`,
  {
    mimeType: MIME,
    description:
      "Interactive visualization of evaluation results with charts and tables",
  },
  async (uri) => ({
    contents: [
      {
        uri: uri.href,
        mimeType: MIME,
        text: EVAL_RESULTS_UI(),
        _meta: {
          ui: {
            csp: { resourceDomains: ["https://cdn.jsdelivr.net"] },
            prefersBorder: false,
          },
        },
      },
    ],
  }),
);

// ─── Tool: Show Results (renders charts in agent chat) ───────────────────

server.registerTool(
  "show-eval-results",
  {
    description:
      "Visualize multimodal evaluation results as interactive charts and tables. Accepts structured evaluation data from a previous run.",
    inputSchema: {
      summary: z
        .object({
          model: z.string(),
          modality: z.string(),
          samples: z.number(),
        })
        .passthrough()
        .describe("Evaluation summary"),
      results: z
        .array(z.record(z.string(), z.unknown()))
        .describe("Per-sample evaluation results"),
    },
    _meta: {
      ui: {
        resourceUri: `${URI}/eval-results`,
        visibility: ["model", "app"],
      },
    },
  },
  async ({ summary, results }) => {
    console.log(
      `[show-eval-results] ${summary.modality} — ${summary.model} — ${summary.samples} samples`,
    );
    return {
      content: [
        {
          type: "text" as const,
          text: `Rendering ${summary.modality} evaluation results for ${summary.model} (${summary.samples} samples).`,
        },
      ],
      structuredContent: { summary, results },
    };
  },
);

// ─── Express HTTP transport ──────────────────────────────────────────────

const app = express();
app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", server: "multimodal-eval-mcp" });
});

app.post("/mcp", async (req: Request, res: Response) => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  res.on("close", () => transport.close());
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

const port = parseInt(process.env.PORT || "3000");

app.listen(port, () => {
  console.log(`MCP Apps server running at http://localhost:${port}`);
  console.log(`MCP endpoint: http://localhost:${port}/mcp`);
  console.log(
    `Test: npx @modelcontextprotocol/inspector http://localhost:${port}/mcp`,
  );
});
