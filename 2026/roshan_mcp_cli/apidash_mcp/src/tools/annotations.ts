import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";

export const TOOL_ANNOTATIONS: Record<string, ToolAnnotations> = {
  "request-builder":              { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  "http-send-request":            { readOnlyHint: false, destructiveHint: true,  openWorldHint: true  },
  "view-response":                { readOnlyHint: true,  destructiveHint: false, openWorldHint: false },
  "explore-collections":          { readOnlyHint: true,  destructiveHint: false, openWorldHint: false },
  "graphql-explorer":             { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  "graphql-execute-query":        { readOnlyHint: false, destructiveHint: true,  openWorldHint: true  },
  "codegen-ui":                   { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  "generate-code-snippet":        { readOnlyHint: true,  destructiveHint: false, openWorldHint: false },
  "manage-environment":           { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  "update-environment-variables": { readOnlyHint: false, destructiveHint: true,  idempotentHint: true, openWorldHint: false },
  "get-api-request-template":     { readOnlyHint: true,  destructiveHint: false, openWorldHint: false },
  "ai-llm-request":               { readOnlyHint: false, destructiveHint: true,  openWorldHint: true  },
  "save-request":                 { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
};
