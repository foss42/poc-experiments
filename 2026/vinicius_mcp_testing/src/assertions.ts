export interface AssertionResult {
  passed: boolean;
  name: string;
  category: string;
  error?: string;
  durationMs: number;
}

export type AssertionFn = () => Promise<void>;

export async function runAssertion(
  name: string,
  category: string,
  fn: AssertionFn
): Promise<AssertionResult> {
  const start = performance.now();
  try {
    await fn();
    return {
      passed: true,
      name,
      category,
      durationMs: performance.now() - start,
    };
  } catch (err) {
    return {
      passed: false,
      name,
      category,
      error: err instanceof Error ? err.message : String(err),
      durationMs: performance.now() - start,
    };
  }
}

export function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

export function assertType(value: unknown, expected: string, label: string): void {
  const actual = Array.isArray(value) ? "array" : typeof value;
  assert(actual === expected, `${label}: expected ${expected}, got ${actual}`);
}

export function assertHasKey(obj: unknown, key: string, label: string): void {
  assert(
    typeof obj === "object" && obj !== null && key in obj,
    `${label}: missing key "${key}"`
  );
}

export function assertErrorCode(err: unknown, code: number): void {
  const actual = (err as { code?: number }).code;
  assert(actual === code, `Expected error code ${code}, got ${actual}`);
}
