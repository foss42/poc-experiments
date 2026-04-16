
import type { AssertionResult } from "@/shared/mcp"

export function buildAssertion(
  id: string,
  title: string,
  passed: boolean,
  message: string,
  expected?: unknown,
  actual?: unknown,
): AssertionResult {
  return {
    id,
    title,
    status: passed ? "passed" : "failed",
    message,
    expected,
    actual,
  }
}

export function assertTruthy(
  id: string,
  title: string,
  value: unknown,
  message: string,
): AssertionResult {
  return buildAssertion(id, title, Boolean(value), message, true, value)
}

export function assertEqual<T>(
  id: string,
  title: string,
  actual: T,
  expected: T,
  message: string,
): AssertionResult {
  return buildAssertion(id, title, actual === expected, message, expected, actual)
}

export function assertIncludes(
  id: string,
  title: string,
  haystack: string,
  needle: string,
  message: string,
): AssertionResult {
  return buildAssertion(id, title, haystack.includes(needle), message, needle, haystack)
}

export function assertArrayMinLength(
  id: string,
  title: string,
  value: unknown,
  minimum: number,
  message: string,
): AssertionResult {
  const length = Array.isArray(value) ? value.length : 0
  return buildAssertion(id, title, length >= minimum, message, minimum, length)
}

export function failAssertion(id: string, title: string, error: unknown): AssertionResult {
  const message = error instanceof Error ? error.message : String(error)
  return buildAssertion(id, title, false, message)
}
