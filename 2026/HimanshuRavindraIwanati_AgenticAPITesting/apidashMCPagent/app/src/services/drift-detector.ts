import type {
  ApiTestCase,
  ExecutionResult,
  DriftEvent,
  HealingPatch,
  DriftSeverity,
} from "../types.js";
import { generateHealingReasoning } from "./llm-client.js";

// ─── Drift Detection ─────────────────────────────────────────────────────────

export function detectDrift(
  tests: ApiTestCase[],
  results: ExecutionResult[]
): DriftEvent[] {
  const driftEvents: DriftEvent[] = [];

  for (const result of results) {
    if (result.status !== "failed") continue;

    const tc = tests.find((t) => t.id === result.testId);
    if (!tc) continue;

    for (const assertionResult of result.assertionResults) {
      if (assertionResult.passed) continue;

      // Detect type drift specifically — the core drift pattern
      if (assertionResult.operator === "type_is") {
        const actualType = Array.isArray(assertionResult.actual)
          ? "array"
          : typeof assertionResult.actual;

        driftEvents.push({
          testId: result.testId,
          field: assertionResult.field,
          severity: classifyDriftSeverity(assertionResult.field, String(assertionResult.expected), actualType),
          originalType: String(assertionResult.expected),
          newType: actualType,
          originalValue: assertionResult.expected,
          newValue: assertionResult.actual,
          detectedAt: new Date().toISOString(),
        });
      }
    }
  }

  return driftEvents;
}

// ─── Severity Classification ─────────────────────────────────────────────────

function classifyDriftSeverity(
  field: string,
  originalType: string,
  newType: string
): DriftSeverity {
  // ID fields changing type is always BREAKING — downstream consumers parse differently
  if (field.toLowerCase().includes("id") &&
    ((originalType === "integer" || originalType === "number") && newType === "string")) {
    return "breaking";
  }

  // Numeric to string changes are breaking
  if ((originalType === "integer" || originalType === "number") && newType === "string") {
    return "breaking";
  }

  // String to number is also breaking
  if (originalType === "string" && (newType === "number" || newType === "integer")) {
    return "breaking";
  }

  // New field added (type was undefined, now has value) — compatible
  if (originalType === "undefined") return "compatible";

  return "breaking";
}

// ─── Healing Patch Generator ─────────────────────────────────────────────────

export async function generateHealingPatches(
  tests: ApiTestCase[],
  driftEvents: DriftEvent[]
): Promise<HealingPatch[]> {
  const patches: HealingPatch[] = [];

  for (const drift of driftEvents) {
    const tc = tests.find((t) => t.id === drift.testId);
    if (!tc) continue;

    // Find the failing assertion
    const originalAssertion = tc.assertions.find(
      (a) => a.field === drift.field && a.operator === "type_is"
    );
    if (!originalAssertion) continue;

    // Generate the proposed healed assertion
    const proposedAssertion = {
      ...originalAssertion,
      expected: drift.newType,
    };

    // Confidence scoring: breaking changes always require human review
    const confidence = drift.severity === "breaking" ? 0.78 : 0.95;
    const requiresHumanReview = drift.severity === "breaking" || drift.severity === "architectural";

    // LLM generates the reasoning (model router: haiku — explanation task)
    const reasoning = await generateHealingReasoning(
      drift.field,
      drift.originalType,
      drift.newType,
      tc.endpoint
    );

    patches.push({
      testId: drift.testId,
      field: drift.field,
      originalAssertion,
      proposedAssertion,
      confidence,
      reasoning,
      severity: drift.severity,
      requiresHumanReview,
    });
  }

  return patches;
}
