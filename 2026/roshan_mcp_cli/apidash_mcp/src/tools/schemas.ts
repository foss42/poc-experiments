import { z } from "zod";

export const TOOL_OUTPUT_SCHEMAS: Record<string, any> = {
  "request-builder": z.object({}),
  "http-send-request": z.object({
    status:     z.number(),
    statusText: z.string().optional(),
    duration:   z.number().optional(),
    body:       z.string().optional(),
    headers:    z.record(z.string(), z.string()).optional(),
    method:     z.string().optional(),
    url:        z.string().optional(),
  }),
  "view-response": z.object({
    response: z.any(),
  }),
  "explore-collections": z.object({
    totalRequests: z.number(),
    requests:      z.array(z.any()),
  }),
  "graphql-explorer": z.object({}),
  "graphql-execute-query": z.object({
    status:    z.number(),
    duration:  z.number(),
    data:      z.any().optional(),
    hasErrors: z.boolean(),
  }),
  "codegen-ui": z.object({
    request: z.any().optional(),
  }),
  "generate-code-snippet": z.object({
    generator: z.string(),
    language:  z.string(),
    code:      z.string(),
    request:   z.any(),
  }),
  "manage-environment": z.object({}),
  "update-environment-variables": z.object({
    env:       z.string(),
    count:     z.number(),
    variables: z.array(z.any()),
  }),
  "get-api-request-template": z.object({
    request: z.any(),
    action:  z.string(),
  }),
  "ai-llm-request": z.object({
    model:        z.string(),
    duration:     z.number(),
    content:      z.string(),
    inputTokens:  z.number().optional(),
    outputTokens: z.number().optional(),
    totalTokens:  z.number().optional(),
    finishReason: z.string().optional(),
  }),
  "save-request": z.object({
    success: z.boolean(),
    id:      z.string().optional(),
    name:    z.string().optional(),
    method:  z.string().optional(),
    url:     z.string().optional(),
  }),
};
