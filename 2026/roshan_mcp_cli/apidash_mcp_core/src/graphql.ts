/**
 * APIDash CLI — GraphQL Executor
 * Sends GraphQL queries/mutations over HTTP POST.
 * Supports variables, operation names, and custom headers.
 */

import axios from "axios";
import { STATUS_REASONS } from "./data/api-data.js";

export interface GraphQLRequestContext {
  url: string;
  query: string;
  variables?: Record<string, unknown>;
  operationName?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

export interface GraphQLResponseData {
  url: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  data?: unknown;
  errors?: unknown[];
  duration: number;
}

export interface GraphQLResult {
  success: boolean;
  data: GraphQLResponseData;
  errorMsg?: string;
}

export async function executeGraphQLRequest(ctx: GraphQLRequestContext): Promise<GraphQLResult> {
  const {
    url,
    query,
    variables,
    operationName,
    headers = {},
    timeoutMs = 30_000,
  } = ctx;

  const startTime = Date.now();

  const payload: Record<string, unknown> = { query };
  if (variables && Object.keys(variables).length > 0) payload.variables = variables;
  if (operationName) payload.operationName = operationName;

  const mergedHeaders = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...headers,
  };

  try {
    const response = await axios({
      method: "POST",
      url,
      headers: mergedHeaders,
      data: payload,
      timeout: timeoutMs,
      validateStatus: () => true,
    });

    const duration = Date.now() - startTime;
    const status = response.status;
    const statusText = STATUS_REASONS[status] ?? response.statusText ?? "";

    const raw =
      typeof response.data === "object"
        ? JSON.stringify(response.data, null, 2)
        : String(response.data ?? "");

    const parsedGql = typeof response.data === "object" ? response.data : null;

    return {
      success: true,
      data: {
        url,
        status,
        statusText,
        headers: response.headers as Record<string, string>,
        body: raw,
        data: parsedGql?.data,
        errors: parsedGql?.errors,
        duration,
      },
    };
  } catch (err: unknown) {
    const duration = Date.now() - startTime;
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      errorMsg: msg,
      data: {
        url,
        status: 0,
        statusText: "Network Error",
        headers: {},
        body: "",
        duration,
      },
    };
  }
}
