// NOTE: This module is currently not used by the active MCP explorer flow.
// It is intentionally kept for future OpenAPI import/pipeline work, since import from openapi is already there in apidash, so this is not what i am adding so not showcasing this yet just made for my own use.
import fs from "node:fs/promises";
import yaml from "js-yaml";
import { SourceInput } from "./types.js";

export interface ParsedOperation {
  method: string;
  path: string;
  summary: string;
  tags: string[];
  parameters: unknown[];
  requestBody?: unknown;
  responses?: Record<string, unknown>;
}

export interface ParsedSpec {
  title: string;
  version: string;
  baseUrl: string;
  securitySchemes: Record<string, unknown>;
  operations: ParsedOperation[];
}

function parseMaybeYamlOrJson(raw: string): unknown {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return JSON.parse(trimmed);
  }
  return yaml.load(trimmed);
}

function operationEntries(pathItem: Record<string, unknown>): Array<[string, Record<string, unknown>]> {
  const verbs = ["get", "post", "put", "patch", "delete", "head", "options", "trace"];
  const out: Array<[string, Record<string, unknown>]> = [];
  for (const v of verbs) {
    const op = pathItem[v];
    if (op && typeof op === "object") {
      out.push([v.toUpperCase(), op as Record<string, unknown>]);
    }
  }
  return out;
}

export async function loadSourceContent(source: SourceInput): Promise<string> {
  if (source.type === "openapi_url") {
    const res = await fetch(source.location);
    if (!res.ok) {
      throw new Error(`Failed to fetch source: ${res.status} ${res.statusText}`);
    }
    return await res.text();
  }
  return await fs.readFile(source.location, "utf8");
}

export async function parseOpenApi(source: SourceInput): Promise<ParsedSpec> {
  const raw = await loadSourceContent(source);
  const doc = parseMaybeYamlOrJson(raw) as Record<string, unknown>;

  if (!doc || typeof doc !== "object" || !doc.paths) {
    throw new Error("Invalid OpenAPI document: missing paths");
  }

  const info = (doc.info ?? {}) as Record<string, unknown>;
  const title = String(info.title ?? source.name ?? "Untitled API");
  const version = String(info.version ?? "0.0.0");

  const servers = Array.isArray(doc.servers) ? (doc.servers as Array<Record<string, unknown>>) : [];
  const baseUrl = String(servers[0]?.url ?? "https://api.example.com");

  const components = (doc.components ?? {}) as Record<string, unknown>;
  const securitySchemes = ((components.securitySchemes ?? {}) as Record<string, unknown>) || {};

  const operations: ParsedOperation[] = [];
  const paths = doc.paths as Record<string, unknown>;

  for (const [path, pathItemAny] of Object.entries(paths)) {
    if (!pathItemAny || typeof pathItemAny !== "object") {
      continue;
    }
    const pathItem = pathItemAny as Record<string, unknown>;
    for (const [method, op] of operationEntries(pathItem)) {
      operations.push({
        method,
        path,
        summary: String(op.summary ?? op.operationId ?? `${method} ${path}`),
        tags: Array.isArray(op.tags) ? op.tags.map((t) => String(t)) : [],
        parameters: Array.isArray(op.parameters) ? op.parameters : [],
        requestBody: op.requestBody,
        responses: (op.responses as Record<string, unknown>) ?? {},
      });
    }
  }

  return {
    title,
    version,
    baseUrl,
    securitySchemes,
    operations,
  };
}
