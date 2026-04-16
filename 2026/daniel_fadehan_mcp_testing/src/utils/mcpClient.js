// Lightweight MCP client supporting SSE and Streamable HTTP transports
import { classifyToolOutcome } from './toolOutcome.js';
import { createChatLogEntry, getLogSourceLabel } from './chatRuntimeLog.js';

let requestId = 0;
const nextId = () => ++requestId;

// In dev, route through Vite's /mcp-proxy to avoid CORS issues with localhost servers.
// In production builds, fetch directly (the deployed app needs proper CORS or a backend proxy).
const proxyUrl = (url) => {
  if (import.meta.env.DEV) {
    return `/mcp-proxy?target=${encodeURIComponent(url)}`;
  }
  return url;
};

export class McpClient {
  constructor(url, transportType = 'sse') {
    this.url = url.replace(/\/$/, '');
    this.transportType = transportType;
    this.eventSource = null;
    this.messageEndpoint = null;
    this.pendingRequests = new Map();
    this.abortController = null;
    this.connected = false;
    this.logs = [];
    this.logSubscribers = new Set();
    this.logSource = getLogSourceLabel(this.url);
  }

  async connect() {
    this.abortController = new AbortController();

    if (this.transportType === 'sse') {
      return this._connectSSE();
    } else {
      return this._connectStreamableHTTP();
    }
  }

  async _connectSSE() {
    // Step 1: Open SSE connection to get the message endpoint
    await new Promise((resolve, reject) => {
      const sseUrl = this.url.endsWith('/sse') ? this.url : `${this.url}/sse`;
      this.eventSource = new EventSource(proxyUrl(sseUrl));

      const timeout = setTimeout(() => {
        this.eventSource?.close();
        reject(new Error('Connection timed out after 10s'));
      }, 10000);

      this.eventSource.addEventListener('endpoint', (event) => {
        clearTimeout(timeout);
        // The endpoint may be relative or absolute
        const endpoint = event.data;
        if (endpoint.startsWith('http')) {
          this.messageEndpoint = endpoint;
        } else {
          // Build absolute URL from base
          const base = new URL(this.url);
          this.messageEndpoint = `${base.origin}${endpoint}`;
        }
        resolve();
      });

      this.eventSource.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.id != null && this.pendingRequests.has(data.id)) {
            const { resolve } = this.pendingRequests.get(data.id);
            this.pendingRequests.delete(data.id);
            resolve(data);
          }
        } catch {
          // ignore parse errors
        }
      });

      this.eventSource.onerror = (err) => {
        clearTimeout(timeout);
        if (!this.connected) {
          reject(new Error('Failed to connect via SSE'));
        }
      };
    });

    // Step 2: Send initialize request
    const initResult = await this._sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'Forge Inspector', version: '1.0.0' },
    });

    const serverInfo = initResult.result?.serverInfo || { name: 'Unknown', version: '0.0.0' };
    this.logSource = serverInfo.name || this.logSource;

    // Step 3: Send initialized notification
    await this._sendNotification('notifications/initialized', {});

    // Step 4: List tools
    const toolsResult = await this._sendRequest('tools/list', {});
    const tools = toolsResult.result?.tools || [];

    this.connected = true;
    return { serverInfo, tools };
  }

  async _connectStreamableHTTP() {
    // Streamable HTTP: send JSON-RPC directly to the URL
    const initResult = await this._sendHTTPRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'Forge Inspector', version: '1.0.0' },
    });

    const serverInfo = initResult.result?.serverInfo || { name: 'Unknown', version: '0.0.0' };
    this.logSource = serverInfo.name || this.logSource;

    // Send initialized notification
    await this._sendHTTPNotification('notifications/initialized', {});

    // List tools
    const toolsResult = await this._sendHTTPRequest('tools/list', {});
    const tools = toolsResult.result?.tools || [];

    this.connected = true;
    return { serverInfo, tools };
  }

  async callTool(name, args) {
    const startTime = performance.now();

    try {
      let result;
      if (this.transportType === 'sse') {
        result = await this._sendRequest('tools/call', { name, arguments: args });
      } else {
        result = await this._sendHTTPRequest('tools/call', { name, arguments: args });
      }

      const responseTime = Math.round(performance.now() - startTime);

      const normalized = {
        content: result.result?.content || result.result,
        structuredContent: result.result?.structuredContent,
        _meta: result.result?._meta,
        isError: result.result?.isError || false,
        error: result.error,
        responseTime,
      };

      const outcome = classifyToolOutcome(normalized);
      if (!outcome.ok) {
        return {
          ...normalized,
          isError: true,
          error: normalized.error || { message: outcome.message },
        };
      }

      return normalized;
    } catch (err) {
      const responseTime = Math.round(performance.now() - startTime);
      return {
        content: null,
        isError: true,
        error: { message: err.message },
        responseTime,
      };
    }
  }

  async listResources() {
    const result = this.transportType === 'sse'
      ? await this._sendRequest('resources/list', {})
      : await this._sendHTTPRequest('resources/list', {});
    return result.result?.resources || [];
  }

  async readResource(uri) {
    const startTime = performance.now();
    try {
      const result = this.transportType === 'sse'
        ? await this._sendRequest('resources/read', { uri })
        : await this._sendHTTPRequest('resources/read', { uri });
      return {
        contents: result.result?.contents || [],
        responseTime: Math.round(performance.now() - startTime),
      };
    } catch (err) {
      return {
        contents: [],
        isError: true,
        error: { message: err.message },
        responseTime: Math.round(performance.now() - startTime),
      };
    }
  }

  // SSE transport: send via POST to the message endpoint, receive via SSE
  _sendRequest(method, params) {
    return new Promise((resolve, reject) => {
      const id = nextId();
      this._pushLog({ dir: '->', type: method, status: 'info' });

      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        this._pushLog({ dir: '!', type: method, status: 'error' });
        reject(new Error(`Request timed out: ${method}`));
      }, 30000);

      this.pendingRequests.set(id, {
        resolve: (data) => {
          clearTimeout(timeout);
          this._pushLog({
            dir: '<-',
            type: method,
            status: data?.error ? 'error' : 'success',
          });
          resolve(data);
        },
      });

      const body = JSON.stringify({
        jsonrpc: '2.0',
        id,
        method,
        params,
      });

      fetch(proxyUrl(this.messageEndpoint), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream'
        },
        body,
        signal: this.abortController?.signal,
      }).catch((err) => {
        clearTimeout(timeout);
        this.pendingRequests.delete(id);
        this._pushLog({ dir: '!', type: method, status: 'error' });
        reject(err);
      });
    });
  }

  _sendNotification(method, params) {
    this._pushLog({ dir: '->', type: method, status: 'info' });
    const body = JSON.stringify({
      jsonrpc: '2.0',
      method,
      params,
    });

    return fetch(proxyUrl(this.messageEndpoint), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream'
      },
      body,
      signal: this.abortController?.signal,
    }).then((response) => {
      this._pushLog({
        dir: '<-',
        type: method,
        status: response.ok ? 'success' : 'error',
      });
      return response;
    }).catch((error) => {
      this._pushLog({ dir: '!', type: method, status: 'error' });
      throw error;
    });
  }

  // Streamable HTTP transport: send via POST, get response directly
  async _sendHTTPRequest(method, params) {
    const id = nextId();
    this._pushLog({ dir: '->', type: method, status: 'info' });
    const body = JSON.stringify({
      jsonrpc: '2.0',
      id,
      method,
      params,
    });

    const response = await fetch(proxyUrl(this.url), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
      },
      body,
      signal: this.abortController?.signal,
    });
    try {
      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('text/event-stream')) {
        // Parse SSE stream for response
        const payload = await this._parseSSEResponse(response, id);
        this._pushLog({
          dir: '<-',
          type: method,
          status: payload?.error || !response.ok ? 'error' : 'success',
        });
        return payload;
      }

      const payload = await response.json();
      this._pushLog({
        dir: '<-',
        type: method,
        status: payload?.error || !response.ok ? 'error' : 'success',
      });
      return payload;
    } catch (error) {
      this._pushLog({ dir: '!', type: method, status: 'error' });
      throw error;
    }
  }

  async _sendHTTPNotification(method, params) {
    this._pushLog({ dir: '->', type: method, status: 'info' });
    const body = JSON.stringify({
      jsonrpc: '2.0',
      method,
      params,
    });

    await fetch(proxyUrl(this.url), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream'
      },
      body,
      signal: this.abortController?.signal,
    }).then((response) => {
      this._pushLog({
        dir: '<-',
        type: method,
        status: response.ok ? 'success' : 'error',
      });
      return response;
    }).catch((error) => {
      this._pushLog({ dir: '!', type: method, status: 'error' });
      throw error;
    });
  }

  async _parseSSEResponse(response, requestId) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.id === requestId) {
              return data;
            }
          } catch {
            // ignore
          }
        }
      }
    }

    throw new Error('Stream ended without response');
  }

  disconnect() {
    this.connected = false;
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.pendingRequests.clear();
    this.messageEndpoint = null;
  }

  getLogs() {
    return [...this.logs];
  }

  subscribeLogs(listener) {
    this.logSubscribers.add(listener);
    return () => this.logSubscribers.delete(listener);
  }

  _pushLog({ dir, type, status }) {
    const entry = createChatLogEntry({
      dir,
      type,
      status,
      source: this.logSource,
    });
    this.logs = [...this.logs, entry];
    this.logSubscribers.forEach((listener) => listener(entry, this.getLogs()));
  }
}
