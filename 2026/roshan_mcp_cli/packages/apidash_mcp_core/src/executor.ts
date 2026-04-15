import axios from "axios";
import { STATUS_REASONS } from "./data/api-data.js";

export interface HttpRequestContext {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
}

export async function executeHttpRequest({ method, url, headers, body, timeoutMs }: HttpRequestContext) {
  const startTime = Date.now();
  try {
    const finalHeaders = { ...(headers ?? {}) } as Record<string, string>;
    
    // LLM Forgiveness: Auto-add application/json Content-Type if missing and body looks like JSON
    if (body && !Object.keys(finalHeaders).some(k => k.toLowerCase() === 'content-type')) {
      const trimmed = body.trim();
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        finalHeaders['Content-Type'] = 'application/json';
      } else {
        finalHeaders['Content-Type'] = 'text/plain';
      }
    }

    const response = await axios({
      method: method.toLowerCase(),
      url,
      headers: finalHeaders,
      data: body,
      timeout: timeoutMs ?? 30000,
      validateStatus: () => true, // don't throw on non-2xx
      maxRedirects: 10,
    });
    const duration = Date.now() - startTime;
    const status = response.status;
    const statusText = STATUS_REASONS[status] || response.statusText || "";

    let responseBody: string;
    if (typeof response.data === "object") {
      responseBody = JSON.stringify(response.data, null, 2);
    } else {
      responseBody = String(response.data ?? "");
    }

    return {
      success: true,
      data: {
        method,
        url,
        status,
        statusText,
        headers: JSON.parse(JSON.stringify(response.headers || {})),
        body: responseBody,
        duration,
        request: { method, url, headers: headers ?? {}, body },
      }
    };
  } catch (err: unknown) {
    const duration = Date.now() - startTime;
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      errorMsg: msg,
      data: {
        method, url, error: msg, duration,
        status: 0, statusText: "Network Error",
      }
    };
  }
}
