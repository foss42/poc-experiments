// Pulls out all the endpoints from an OpenAPI 3.x spec so the AI has
// something structured to reason over. No network calls, just parsing.

export interface Parameter {
  name: string;
  in: "path" | "query" | "header" | "cookie";
  required: boolean;
  schema?: Record<string, unknown>;
  description?: string;
}

export interface RequestBody {
  required: boolean;
  properties: Record<string, unknown>;
  requiredFields: string[];
}

export interface Endpoint {
  path: string;
  method: string;
  operationId?: string;
  summary?: string;
  parameters: Parameter[];
  requestBody?: RequestBody;
  responseCodes: string[];
}

// Just enough typing to walk the spec without casting everything to any
interface OpenApiSpec {
  openapi: string;
  paths?: Record<string, Record<string, OpenApiOperation>>;
}

interface OpenApiOperation {
  operationId?: string;
  summary?: string;
  parameters?: Array<{
    name: string;
    in: string;
    required?: boolean;
    schema?: Record<string, unknown>;
    description?: string;
  }>;
  requestBody?: {
    required?: boolean;
    content?: Record<string, { schema?: OpenApiSchema }>;
  };
  responses?: Record<string, unknown>;
}

interface OpenApiSchema {
  properties?: Record<string, unknown>;
  required?: string[];
}

export function parseSpec(spec: object): Endpoint[] {
  const api = spec as OpenApiSpec;

  if (!api.openapi || !api.openapi.startsWith("3.")) {
    throw new Error(
      `Only OpenAPI 3.x is supported (got "${api.openapi ?? "unknown"}")`
    );
  }

  if (!api.paths || Object.keys(api.paths).length === 0) {
    return [];
  }

  const endpoints: Endpoint[] = [];

  // Skip things like path-level "parameters" — we only want HTTP methods
  const HTTP_METHODS = new Set([
    "get", "post", "put", "patch", "delete", "head", "options", "trace",
  ]);

  for (const [path, pathItem] of Object.entries(api.paths)) {
    for (const [methodRaw, operation] of Object.entries(pathItem)) {
      if (!HTTP_METHODS.has(methodRaw)) continue;

      const method = methodRaw.toUpperCase();
      const op = operation as OpenApiOperation;

      const parameters: Parameter[] = (op.parameters ?? []).map((p) => ({
        name: p.name,
        in: p.in as Parameter["in"],
        required: p.required ?? false,
        schema: p.schema,
        description: p.description,
      }));

      let requestBody: RequestBody | undefined;
      if (op.requestBody) {
        const jsonContent = op.requestBody.content?.["application/json"];
        const schema = jsonContent?.schema ?? {};
        requestBody = {
          required: op.requestBody.required ?? false,
          properties: (schema as OpenApiSchema).properties ?? {},
          requiredFields: (schema as OpenApiSchema).required ?? [],
        };
      }

      endpoints.push({
        path,
        method,
        operationId: op.operationId,
        summary: op.summary,
        parameters,
        requestBody,
        responseCodes: Object.keys(op.responses ?? {}),
      });
    }
  }

  return endpoints;
}
