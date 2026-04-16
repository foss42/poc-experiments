import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { EVAL_FORM_HTML } from "./ui/eval-form.js";
import { EVAL_REPORT_HTML } from "./ui/eval-report.js";

const server = new McpServer({
  name: "ai-eval-poc",
  version: "1.0.0",
});

// Tool 1: select-eval-config
server.tool(
  "select-eval-config",
  "Opens the AI model evaluation configuration panel so the user can select models, dataset, and metrics.",
  async () => {
    const formHtml = EVAL_FORM_HTML();
    return {
      content: [
        {
          type: "text" as const,
          text: `Please select your evaluation preferences:\n\n${formHtml}`,
        },
      ],
    };
  }
);

// Tool 2: get-eval-data
server.tool(
  "get-eval-data",
  "Fetches simulated benchmark evaluation data for selected models and dataset.",
  async (args: { models: string[]; dataset: string; metrics: string[] }) => {
    const { models, dataset } = args;
    const results: Record<string, Record<string, number>> = {};

    for (const model of models) {
      results[model] = {
        accuracy: parseFloat((Math.random() * 0.25 + 0.70).toFixed(3)),
        latency:  parseFloat((Math.random() * 2.5  + 0.8 ).toFixed(2)),
        cost:     parseFloat((Math.random() * 0.04  + 0.001).toFixed(4)),
        f1:       parseFloat((Math.random() * 0.22  + 0.71).toFixed(3)),
      };
    }

    const summary = Object.entries(results)
      .map(([m, r]) => `${m}: accuracy=${r.accuracy}, latency=${r.latency}s, f1=${r.f1}`)
      .join("\n");

    return {
      content: [
        {
          type: "text" as const,
          text: `Evaluation results for ${models.length} model(s) on ${dataset}:\n\n${summary}`,
        },
      ],
    };
  }
);


// Tool 3: show-eval-report
server.tool(
  "show-eval-report",
  "Displays a visual evaluation report table with benchmark results for selected models.",
  async (args: any) => {
    const dataset = args?.dataset || "mmlu";
    const models: string[] = Array.isArray(args?.models) 
      ? args.models 
      : ["gpt-4o", "claude-3-5-sonnet"];
    
    const results: Record<string, Record<string, number>> = {};
    for (const model of models) {
      results[model] = {
        accuracy: parseFloat((Math.random() * 0.25 + 0.70).toFixed(3)),
        latency:  parseFloat((Math.random() * 2.5  + 0.8 ).toFixed(2)),
        cost:     parseFloat((Math.random() * 0.04  + 0.001).toFixed(4)),
        f1:       parseFloat((Math.random() * 0.22  + 0.71).toFixed(3)),
      };
    }

    const html = EVAL_REPORT_HTML(results, dataset);
    const table = Object.entries(results)
      .map(([m, r]) => `| ${m} | ${r.accuracy} | ${r.latency}s | ${r.cost} | ${r.f1} |`)
      .join("\n");

    return {
      content: [
        {
          type: "text" as const,
          text: `Evaluation Report — Dataset: ${dataset}\n\n| Model | Accuracy | Latency | Cost | F1 |\n|---|---|---|---|---|\n${table}`,
        },
      ],
    };
  }
);

// Resource: eval-form widget
server.resource(
  "eval-form",
  "ui://eval-form",
  async () => ({
    contents: [
      {
        uri: "ui://eval-form",
        mimeType: "text/html",
        text: EVAL_FORM_HTML(),
      },
    ],
  })
);

// Resource: eval-report widget
server.resource(
  "eval-report",
  "ui://eval-report",
  async () => ({
    contents: [
      {
        uri: "ui://eval-report",
        mimeType: "text/html",
        text: EVAL_REPORT_HTML({}, "N/A"),
      },
    ],
  })
);

// Start
const transport = new StdioServerTransport();
await server.connect(transport);
