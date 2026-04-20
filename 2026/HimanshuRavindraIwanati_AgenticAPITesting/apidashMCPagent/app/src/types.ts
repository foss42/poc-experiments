// ─── Core Pipeline Types ───────────────────────────────────────────────────

export interface ApiEndpoint {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  summary: string;
  parameters: ApiParameter[];
  requestBody?: ApiRequestBody;
  responses: Record<string, ApiResponse>;
  tags: string[];
}

export interface ApiParameter {
  name: string;
  in: "query" | "path" | "header";
  required: boolean;
  schema: { type: string; example?: unknown };
  description?: string;
}

export interface ApiRequestBody {
  required: boolean;
  schema: Record<string, unknown>;
  example?: Record<string, unknown>;
}

export interface ApiResponse {
  description: string;
  schema?: Record<string, unknown>;
}

export interface ParsedSpec {
  title: string;
  baseUrl: string;
  version: string;
  endpoints: ApiEndpoint[];
  sessionId: string;
}

// ─── Test Case Types ────────────────────────────────────────────────────────

export type TestType =
  | "happy_path"
  | "boundary_value"
  | "error_injection"
  | "security_probe";

export type TestPriority = "high" | "medium" | "low";

export interface ApiTestCase {
  id: string;
  name: string;
  type: TestType;
  priority: TestPriority;
  endpoint: string;           // e.g. "GET /users/{id}"
  method: string;
  path: string;
  pathParams?: Record<string, string | number>;
  queryParams?: Record<string, string | number>;
  requestBody?: Record<string, unknown>;
  assertions: TestAssertion[];
  description: string;
  enabled: boolean;
}

export interface TestAssertion {
  field: string;              // e.g. "response.status", "response.body.id"
  operator: "equals" | "exists" | "type_is" | "gte" | "lte" | "contains";
  expected: unknown;
}

// ─── Execution Types ────────────────────────────────────────────────────────

export type ExecutionStatus = "pending" | "running" | "passed" | "failed" | "skipped";

export interface ExecutionResult {
  testId: string;
  testName: string;
  status: ExecutionStatus;
  durationMs: number;
  responseStatusCode?: number;
  responseBody?: unknown;
  assertionResults: AssertionResult[];
  error?: string;
}

export interface AssertionResult {
  field: string;
  passed: boolean;
  expected: unknown;
  actual: unknown;
  operator: string;
}

// ─── Drift & Healing Types ──────────────────────────────────────────────────

export type DriftSeverity = "cosmetic" | "compatible" | "breaking" | "architectural";

export interface DriftEvent {
  testId: string;
  field: string;
  severity: DriftSeverity;
  originalType: string;
  newType: string;
  originalValue: unknown;
  newValue: unknown;
  detectedAt: string;
}

export interface HealingPatch {
  testId: string;
  field: string;
  originalAssertion: TestAssertion;
  proposedAssertion: TestAssertion;
  confidence: number;           // 0.0 – 1.0
  reasoning: string;
  severity: DriftSeverity;
  requiresHumanReview: boolean;
}

// ─── Session Types ──────────────────────────────────────────────────────────

export type AgentState =
  | "IDLE"
  | "PARSING"
  | "PLANNING"
  | "AWAITING_APPROVAL"
  | "EXECUTING"
  | "VALIDATING"
  | "HEALING"
  | "REPORTING"
  | "COMPLETE"
  | "FAILED";

export interface AgentSession {
  id: string;
  state: AgentState;
  spec?: ParsedSpec;
  generatedTests: ApiTestCase[];
  approvedTests: ApiTestCase[];
  executionResults: ExecutionResult[];
  healingPatches: HealingPatch[];
  createdAt: string;
  updatedAt: string;
}
