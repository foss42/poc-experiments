export type SourceType = "openapi_url" | "openapi_file";

export interface SourceInput {
  id: string;
  name: string;
  type: SourceType;
  location: string;
}

export interface NormalizedEndpoint {
  id: string;
  apiId: string;
  apiName: string;
  category: string;
  method: string;
  path: string;
  url: string;
  summary: string;
  tags: string[];
  authType: "none" | "apiKey" | "bearer" | "oauth2" | "basic" | "unknown";
  queryParams: string[];
  headers: Array<{ key: string; value: string }>;
  bodyExample?: unknown;
  responseExample?: unknown;
  quality: {
    parseConfidence: number;
    validated: boolean;
  };
  source: {
    type: SourceType;
    location: string;
  };
}

export interface TemplateArtifact {
  id: string;
  name: string;
  request: {
    method: string;
    url: string;
    headers: Array<{ key: string; value: string }>;
    query: Array<{ key: string; value: string }>;
    body?: unknown;
  };
  meta: {
    category: string;
    authType: string;
    sourceId: string;
  };
}

export interface ManifestEntry {
  id: string;
  name: string;
  category: string;
  authType: string;
  method: string;
  summary: string;
  templatePath: string;
  sourceLocation: string;
}

export interface PipelineOutput {
  source: SourceInput;
  endpoints: NormalizedEndpoint[];
  templates: TemplateArtifact[];
  manifest: ManifestEntry[];
  report: {
    totalEndpoints: number;
    generatedTemplates: number;
    categories: Record<string, number>;
    generatedAt: string;
  };
}
