#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import express, { Request, Response } from "express";
import { z } from "zod";

import { runClaudeEval } from "./providers/claude.js";
import { runGeminiEval } from "./providers/gemini.js";
import { EVAL_CONFIG_UI } from "./ui/eval-config.js";
import { EVAL_RESULTS_UI } from "./ui/eval-results.js";

const MIME = "text/html;profile=mcp-app" as const;
const URI = "ui://ai-eval-mcp";

type EvalCaseResult = {
  prompt: string;
  expected: string;
  actual: string;
  passed: boolean;
  error: string | null;
};

type ProviderEvalResult = {
  results: EvalCaseResult[];
  summary: {
    passed: number;
    total: number;
    score: number;
  };
};

type ComparisonEvalResult = {
  providers: string[];
  providerResults: Record<string, ProviderEvalResult>;
  testCases: Array<{ prompt: string; expected: string }>;
};

let globalLatestEvalResult: ComparisonEvalResult | null = null;

const createMcpServer = () => {
  const server = new McpServer({
    name: "ai-eval-mcp",
    version: "1.0.0",
  });
  let latestEvalResult: ComparisonEvalResult | null = null;

  server.registerResource(
    "eval-config-ui",
    `${URI}/eval-config`,
    {
      mimeType: MIME,
      description: "Interactive UI to configure and run AI model evaluations",
    },
    async (uri) => ({
      contents: [{
        uri: uri.href,
        mimeType: MIME,
        text: EVAL_CONFIG_UI(),
      }],
    }),
  );

  server.registerTool(
    "configure-eval",
    {
      description: "Open an interactive UI to configure an AI evaluation. User can select a provider (Claude or Gemini), enter test cases with prompts and expected answers, and run the evaluation.",
      _meta: {
        ui: {
          resourceUri: `${URI}/eval-config`,
          visibility: ["model", "app"],
        },
      },
    },
    async () => ({
      content: [{
        type: "text" as const,
        text: "Eval configurator opened. Use the UI to set up your evaluation.",
      }],
    }),
  );

  server.registerTool(
    "run-eval",
    {
      description: "Run evaluation test cases against one or two AI providers simultaneously. Returns results with actual responses and scores for comparison.",
      inputSchema: {
        providers: z.array(z.enum(["claude", "gemini"])).min(1).max(2).describe("One or two providers to evaluate"),
        apiKeys: z.record(z.string(), z.string()).describe("API keys per provider e.g. {claude: 'sk-...', gemini: 'AI...'}"),
        testCases: z.array(z.object({
          prompt: z.string(),
          expected: z.string(),
        })).describe("Array of test cases"),
      },
      _meta: {
        ui: {
          resourceUri: `${URI}/eval-config`,
          visibility: ["app"],
        },
      },
    },
    async ({ providers, apiKeys, testCases }: {
      providers: Array<"claude" | "gemini">;
      apiKeys: Record<string, string>;
      testCases: Array<{ prompt: string; expected: string }>;
    }) => {
      console.log(`Running eval: providers=${providers.join(",")}, cases=${testCases.length}`);

      const providerResults: Record<string, ProviderEvalResult> = {};

      await Promise.all(
        providers.map(async (provider) => {
          const apiKey = apiKeys[provider];

          const results = await Promise.all(
            testCases.map(async (tc) => {
              try {
                const actual = provider === "claude"
                  ? await runClaudeEval(tc.prompt, apiKey)
                  : await runGeminiEval(tc.prompt, apiKey);

                const passed = actual.toLowerCase().includes(tc.expected.toLowerCase());
                return {
                  prompt: tc.prompt,
                  expected: tc.expected,
                  actual,
                  passed,
                  error: null,
                };
              } catch (err: any) {
                return {
                  prompt: tc.prompt,
                  expected: tc.expected,
                  actual: "",
                  passed: false,
                  error: err.message || "Unknown error",
                };
              }
            }),
          );

          const passed = results.filter((r) => r.passed).length;
          providerResults[provider] = {
            results,
            summary: {
              passed,
              total: results.length,
              score: Math.round((passed / results.length) * 100),
            },
          };
        }),
      );

      const evalResult: Record<string, unknown> = { providers, providerResults, testCases };
      latestEvalResult = { providers, providerResults, testCases };
      globalLatestEvalResult = latestEvalResult;

      // Backward compatibility for single-provider consumers that still expect
      // { provider, results, summary } shape.
      if (providers.length === 1) {
        const provider = providers[0];
        evalResult.provider = provider;
        evalResult.results = providerResults[provider].results;
        evalResult.summary = providerResults[provider].summary;
      }

      return {
        content: [{ type: "text" as const, text: JSON.stringify(evalResult) }],
        structuredContent: evalResult as unknown as Record<string, unknown>,
      };
    },
  );

  server.registerResource(
    "eval-results-ui",
    `${URI}/eval-results`,
    {
      mimeType: MIME,
      description: "Interactive results dashboard showing evaluation outcomes",
    },
    async (uri) => ({
      contents: [{
        uri: uri.href,
        mimeType: MIME,
        text: EVAL_RESULTS_UI(),
      }],
    }),
  );

  server.registerTool(
    "show-eval-results",
    {
      description: "Display evaluation results as an interactive comparison dashboard. If arguments are omitted, use the latest available results. Supports single provider, both, and side-by-side comparisons.",
      inputSchema: {
        providers: z.array(z.string()).optional(),
        providerResults: z.record(
          z.string(),
          z.object({
            results: z.array(z.object({
              prompt: z.string(),
              expected: z.string(),
              actual: z.string(),
              passed: z.boolean(),
              error: z.string().nullable(),
            })),
            summary: z.object({
              passed: z.number(),
              total: z.number(),
              score: z.number(),
            }),
          }),
        ).optional(),
        testCases: z.array(z.object({
          prompt: z.string(),
          expected: z.string(),
        })).optional(),
        provider: z.string().optional(),
        results: z.array(z.object({
          prompt: z.string(),
          expected: z.string(),
          actual: z.string(),
          passed: z.boolean(),
          error: z.string().nullable(),
        })).optional(),
        summary: z.object({
          passed: z.number(),
          total: z.number(),
          score: z.number(),
        }).optional(),
      },
      _meta: {
        ui: {
          resourceUri: `${URI}/eval-results`,
          visibility: ["model", "app"],
        },
      },
    },
    async (input: {
      providers?: string[];
      providerResults?: Record<string, ProviderEvalResult>;
      testCases?: Array<{ prompt: string; expected: string }>;
      provider?: string;
      results?: EvalCaseResult[];
      summary?: { passed: number; total: number; score: number };
    }) => {
      let normalized: ComparisonEvalResult | null = null;

      if (input.providers && input.providerResults && input.testCases) {
        normalized = {
          providers: input.providers,
          providerResults: input.providerResults,
          testCases: input.testCases,
        };
      } else if (input.provider && input.results && input.summary) {
        normalized = {
          providers: [input.provider],
          providerResults: {
            [input.provider]: {
              results: input.results,
              summary: input.summary,
            },
          },
          testCases: input.results.map((r) => ({
            prompt: r.prompt,
            expected: r.expected,
          })),
        };
      } else {
        const cached = latestEvalResult ?? globalLatestEvalResult;
        if (cached) {
          const requestedRaw = [
            ...(input.providers ?? []),
            ...(input.provider ? [input.provider] : []),
          ];
          const requested = requestedRaw
            .map((p) => p.trim().toLowerCase())
            .filter((p) => p.length > 0);

          const wantsBoth = requested.length === 0 || requested.some((p) => p === "both" || p === "all");
          if (wantsBoth) {
            normalized = cached;
          } else {
            const selected = requested.filter((p) => cached.providerResults[p]);
            if (selected.length > 0) {
              normalized = {
                providers: selected,
                providerResults: Object.fromEntries(
                  selected.map((p) => [p, cached.providerResults[p]]),
                ),
                testCases: cached.testCases,
              };
            }
          }
        }
      }

      if (!normalized) {
        const cached = latestEvalResult ?? globalLatestEvalResult;
        if (cached && Object.keys(cached.providerResults).length > 0) {
          const available = Object.keys(cached.providerResults).join(", ");
          return {
            content: [{
              type: "text" as const,
              text: `Requested provider was not found. Available providers: ${available}.`,
            }],
            structuredContent: {} as Record<string, unknown>,
          };
        }
        return {
          content: [{
            type: "text" as const,
            text: "No evaluation results are available yet. Run run-eval first, or provide complete result payload fields.",
          }],
          structuredContent: {} as Record<string, unknown>,
        };
      }

      const { providers, providerResults, testCases } = normalized;
      const summary = providers.map((p) =>
        `${p}: ${providerResults[p].summary.passed}/${providerResults[p].summary.total} (${providerResults[p].summary.score}%)`
      ).join(", ");

      return {
        content: [{
          type: "text" as const,
          text: `Eval complete - ${summary}`,
        }],
        structuredContent: { providers, providerResults, testCases } as unknown as Record<string, unknown>,
      };
    },
  );

  server.registerTool(
    "show-latest-eval-results",
    {
      description: "Show the latest evaluation dashboard. Optionally pass provider='claude' or provider='gemini'; otherwise shows both when available.",
      inputSchema: {
        provider: z.string().optional(),
      },
      _meta: {
        ui: {
          resourceUri: `${URI}/eval-results`,
          visibility: ["model", "app"],
        },
      },
    },
    async ({ provider }: { provider?: string }) => {
      const cached = latestEvalResult ?? globalLatestEvalResult;
      if (!cached) {
        return {
          content: [{
            type: "text" as const,
            text: "No evaluation results are available yet. Run run-eval first.",
          }],
          structuredContent: {} as Record<string, unknown>,
        };
      }

      const requested = provider?.trim().toLowerCase();
      const wantsBoth = !requested || requested === "both" || requested === "all";
      if (wantsBoth) {
        const summary = cached.providers.map((p) =>
          `${p}: ${cached.providerResults[p].summary.passed}/${cached.providerResults[p].summary.total} (${cached.providerResults[p].summary.score}%)`
        ).join(", ");
        return {
          content: [{
            type: "text" as const,
            text: `Eval complete - ${summary}`,
          }],
          structuredContent: cached as unknown as Record<string, unknown>,
        };
      }

      const selected = cached.providerResults[requested];
      if (!selected) {
        const available = Object.keys(cached.providerResults).join(", ");
        return {
          content: [{
            type: "text" as const,
            text: `Requested provider was not found. Available providers: ${available}.`,
          }],
          structuredContent: {} as Record<string, unknown>,
        };
      }

      const normalized: ComparisonEvalResult = {
        providers: [requested],
        providerResults: { [requested]: selected },
        testCases: cached.testCases,
      };
      const summary = `${requested}: ${selected.summary.passed}/${selected.summary.total} (${selected.summary.score}%)`;
      return {
        content: [{
          type: "text" as const,
          text: `Eval complete - ${summary}`,
        }],
        structuredContent: normalized as unknown as Record<string, unknown>,
      };
    },
  );

  return server;
};

const app = express();
app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", server: "ai-eval-mcp" });
});

const transports: Record<string, StreamableHTTPServerTransport> = {};
const sessionServers: Record<string, McpServer> = {};

const getSessionId = (req: Request): string | undefined => {
  const sessionId = req.headers["mcp-session-id"];
  if (typeof sessionId === "string" && sessionId.length > 0) {
    return sessionId;
  }
  return undefined;
};

app.post("/mcp", async (req: Request, res: Response) => {
  try {
    const sessionId = getSessionId(req);
    let transport: StreamableHTTPServerTransport | undefined;

    if (sessionId && transports[sessionId]) {
      transport = transports[sessionId];
      await transport.handleRequest(req, res, req.body);
      return;
    }

    if (!sessionId && isInitializeRequest(req.body)) {
      const mcpServer = createMcpServer();
      let sessionTransport: StreamableHTTPServerTransport;

      sessionTransport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (newSessionId) => {
          transports[newSessionId] = sessionTransport;
          sessionServers[newSessionId] = mcpServer;
        },
      });

      sessionTransport.onclose = () => {
        const closedSessionId = sessionTransport.sessionId;
        if (closedSessionId) {
          delete transports[closedSessionId];
          delete sessionServers[closedSessionId];
        }
      };

      await mcpServer.connect(sessionTransport);
      await sessionTransport.handleRequest(req, res, req.body);
      return;
    }

    res.status(400).json({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Bad Request: No valid session ID provided",
      },
      id: null,
    });
  } catch (error) {
    console.error("Error handling MCP POST request:", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error",
        },
        id: null,
      });
    }
  }
});

app.get("/mcp", async (req: Request, res: Response) => {
  const sessionId = getSessionId(req);
  if (!sessionId) {
    res.status(405).send("Method Not Allowed: Missing mcp-session-id");
    return;
  }

  const transport = transports[sessionId];
  if (!transport) {
    res.status(400).send("Invalid or missing session ID");
    return;
  }

  try {
    await transport.handleRequest(req, res);
  } catch (error) {
    console.error("Error handling MCP GET request:", error);
    if (!res.headersSent) {
      res.status(500).send("Error handling SSE stream");
    }
  }
});

app.delete("/mcp", async (req: Request, res: Response) => {
  const sessionId = getSessionId(req);
  if (!sessionId) {
    res.status(400).send("Invalid or missing session ID");
    return;
  }

  const transport = transports[sessionId];
  if (!transport) {
    res.status(400).send("Invalid or missing session ID");
    return;
  }

  try {
    await transport.handleRequest(req, res);
  } catch (error) {
    console.error("Error handling MCP DELETE request:", error);
    if (!res.headersSent) {
      res.status(500).send("Error terminating session");
    }
  }
});

const port = parseInt(process.env.PORT || "3000", 10);
app.listen(port, () => {
  console.log(`AI Eval MCP server running at http://localhost:${port}`);
  console.log(`MCP endpoint: http://localhost:${port}/mcp`);
  console.log(`Test with: npx @modelcontextprotocol/inspector http://localhost:${port}/mcp`);
});

process.on("SIGINT", async () => {
  for (const [sessionId, transport] of Object.entries(transports)) {
    try {
      await transport.close();
    } catch (error) {
      console.error(`Error closing transport for session ${sessionId}:`, error);
    }
  }

  for (const [sessionId, mcpServer] of Object.entries(sessionServers)) {
    try {
      await mcpServer.close();
    } catch (error) {
      console.error(`Error closing server for session ${sessionId}:`, error);
    }
  }

  process.exit(0);
});
