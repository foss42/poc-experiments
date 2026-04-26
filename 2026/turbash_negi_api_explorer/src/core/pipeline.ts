// NOTE: This module is currently not used by the active MCP explorer flow.
// It is intentionally kept for future OpenAPI import/pipeline work, since import from openapi is already there in apidash, so this is not what i am adding so not showcasing this yet just made for my own use.
import path from "node:path";
import { parseOpenApi } from "./openapi.js";
import {
  ManifestEntry,
  NormalizedEndpoint,
  PipelineOutput,
  SourceInput,
  TemplateArtifact,
} from "./types.js";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function inferAuthType(securitySchemes: Record<string, unknown>): NormalizedEndpoint["authType"] {
  const entries = Object.values(securitySchemes);
  if (entries.length === 0) return "none";
  const first = entries[0] as Record<string, unknown>;
  const type = String(first?.type ?? "unknown");
  if (type === "http") {
    const scheme = String(first?.scheme ?? "").toLowerCase();
    if (scheme === "bearer") return "bearer";
    if (scheme === "basic") return "basic";
  }
  if (type === "apiKey") return "apiKey";
  if (type === "oauth2") return "oauth2";
  return "unknown";
}

function categorize(summary: string, pathValue: string, tags: string[]): string {
  const blob = `${summary} ${pathValue} ${tags.join(" ")}`.toLowerCase();
  const rules: Array<[string, RegExp]> = [
    ["ai", /llm|chat|completion|embedding|model|prompt|ai/],
    ["finance", /payment|invoice|billing|charge|bank|transaction|finance/],
    ["weather", /weather|forecast|temperature|climate/],
    ["social", /user|profile|feed|post|comment|like|social/],
    ["developer_tools", /repo|commit|build|deploy|ci|webhook|token/],
    ["messaging", /message|sms|email|notification|inbox/],
    ["ecommerce", /cart|order|product|checkout|inventory/],
  ];

  for (const [category, re] of rules) {
    if (re.test(blob)) {
      return category;
    }
  }
  return "general";
}

function extractResponseExample(responses: Record<string, unknown> | undefined): unknown {
  if (!responses) return undefined;
  for (const [status, val] of Object.entries(responses)) {
    if (!status.startsWith("2")) continue;
    const response = val as Record<string, unknown>;
    const content = response?.content as Record<string, unknown> | undefined;
    if (!content) continue;
    if (content["application/json"]) {
      const media = content["application/json"] as Record<string, unknown>;
      if (media.example !== undefined) return media.example;
    }
    const firstMedia = Object.values(content)[0] as Record<string, unknown> | undefined;
    if (firstMedia && firstMedia.example !== undefined) {
      return firstMedia.example;
    }
  }
  return undefined;
}

function buildTemplatePath(endpointId: string): string {
  return path.posix.join("templates", `${endpointId}.json`);
}

export async function runPipeline(source: SourceInput): Promise<PipelineOutput> {
  const parsed = await parseOpenApi(source);

  const authType = inferAuthType(parsed.securitySchemes);
  const apiId = slugify(source.id || parsed.title);

  const endpoints: NormalizedEndpoint[] = parsed.operations.map((op) => {
    const endpointId = `${apiId}_${op.method.toLowerCase()}_${slugify(op.path)}`;

    const queryParams = op.parameters
      .filter((p) => {
        const pp = p as Record<string, unknown>;
        return String(pp.in ?? "") === "query";
      })
      .map((p) => String((p as Record<string, unknown>).name ?? ""))
      .filter(Boolean);

    const category = categorize(op.summary, op.path, op.tags);

    return {
      id: endpointId,
      apiId,
      apiName: parsed.title,
      category,
      method: op.method,
      path: op.path,
      url: `${parsed.baseUrl.replace(/\/$/, "")}${op.path}`,
      summary: op.summary,
      tags: op.tags,
      authType,
      queryParams,
      headers: [{ key: "Content-Type", value: "application/json" }],
      bodyExample: undefined,
      responseExample: extractResponseExample(op.responses),
      quality: {
        parseConfidence: 0.9,
        validated: true,
      },
      source: {
        type: source.type,
        location: source.location,
      },
    };
  });

  const templates: TemplateArtifact[] = endpoints.map((ep) => ({
    id: ep.id,
    name: `${ep.apiName} - ${ep.summary}`,
    request: {
      method: ep.method,
      url: ep.url,
      headers: ep.headers,
      query: ep.queryParams.map((q) => ({ key: q, value: "" })),
      body: ep.bodyExample,
    },
    meta: {
      category: ep.category,
      authType: ep.authType,
      sourceId: source.id,
    },
  }));

  const manifest: ManifestEntry[] = endpoints.map((ep) => ({
    id: ep.id,
    name: `${ep.apiName} - ${ep.summary}`,
    category: ep.category,
    authType: ep.authType,
    method: ep.method,
    summary: ep.summary,
    templatePath: buildTemplatePath(ep.id),
    sourceLocation: source.location,
  }));

  const categories: Record<string, number> = {};
  for (const ep of endpoints) {
    categories[ep.category] = (categories[ep.category] ?? 0) + 1;
  }

  const output = {
    source,
    endpoints,
    templates,
    manifest,
    report: {
      totalEndpoints: endpoints.length,
      generatedTemplates: templates.length,
      categories,
      generatedAt: new Date().toISOString(),
    },
  };

  return output;
}

export function toApiDashLikePayload(template: TemplateArtifact): Record<string, unknown> {
  return {
    method: template.request.method,
    url: template.request.url,
    headers: template.request.headers.map((h) => ({ name: h.key, value: h.value })),
    params: template.request.query.map((q) => ({ name: q.key, value: q.value })),
    body: template.request.body ? JSON.stringify(template.request.body, null, 2) : null,
  };
}
