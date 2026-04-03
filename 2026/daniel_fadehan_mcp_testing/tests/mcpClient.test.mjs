/**
 * Unit tests for McpClient utility (server-side logic).
 * Tests the new listResources(), readResource(), and _meta in callTool().
 * Uses Node's built-in test runner (node:test) — no extra dependencies.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// ─── Mock globals for the browser-oriented McpClient ───────────────────────

let fetchCalls = [];
let fetchResponses = {};

global.fetch = async (url, opts) => {
  const body = JSON.parse(opts?.body || '{}');
  fetchCalls.push({ url, body });
  const key = body.method;
  const response = fetchResponses[key];
  if (!response) throw new Error(`No mock response for method: ${key}`);
  return {
    headers: { get: () => 'application/json' },
    json: async () => response(body),
  };
};

global.performance = { now: () => Date.now() };

// Inline the McpClient to avoid ESM/CJS issues with Vite-transpiled imports
// We replicate just the logic under test.

let requestId = 0;
const nextId = () => ++requestId;

class McpClient {
  constructor(url, transportType = 'http') {
    this.url = url.replace(/\/$/, '');
    this.transportType = transportType;
    this.abortController = null;
    this.connected = false;
  }

  async connect() {
    this.abortController = { signal: null };
    return this._connectStreamableHTTP();
  }

  async _connectStreamableHTTP() {
    const initResult = await this._sendHTTPRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'Test', version: '1.0.0' },
    });
    const serverInfo = initResult.result?.serverInfo || { name: 'Unknown', version: '0.0.0' };
    await this._sendHTTPNotification('notifications/initialized', {});
    const toolsResult = await this._sendHTTPRequest('tools/list', {});
    const tools = toolsResult.result?.tools || [];
    this.connected = true;
    return { serverInfo, tools };
  }

  async callTool(name, args) {
    const startTime = performance.now();
    try {
      const result = await this._sendHTTPRequest('tools/call', { name, arguments: args });
      const responseTime = Math.round(performance.now() - startTime);
      const normalized = {
        content: result.result?.content || result.result,
        structuredContent: result.result?.structuredContent,
        _meta: result.result?._meta,   // <-- the key change
        isError: result.result?.isError || false,
        error: result.error,
        responseTime,
      };

      if (normalized.error || normalized.isError) {
        return {
          ...normalized,
          isError: true,
          error: normalized.error || { message: 'Tool execution failed' },
        };
      }

      if (
        normalized.content === undefined &&
        normalized.structuredContent === undefined &&
        normalized._meta === undefined
      ) {
        return {
          ...normalized,
          isError: true,
          error: { message: 'Tool response had no usable result payload' },
        };
      }

      return normalized;
    } catch (err) {
      return { content: null, isError: true, error: { message: err.message }, responseTime: 0 };
    }
  }

  async listResources() {
    const result = await this._sendHTTPRequest('resources/list', {});
    return result.result?.resources || [];
  }

  async readResource(uri) {
    const startTime = performance.now();
    try {
      const result = await this._sendHTTPRequest('resources/read', { uri });
      return {
        contents: result.result?.contents || [],
        responseTime: Math.round(performance.now() - startTime),
      };
    } catch (err) {
      return {
        contents: [],
        isError: true,
        error: { message: err.message },
        responseTime: 0,
      };
    }
  }

  async _sendHTTPRequest(method, params) {
    const id = nextId();
    const body = JSON.stringify({ jsonrpc: '2.0', id, method, params });
    const response = await fetch(this.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      body,
    });
    return response.json();
  }

  async _sendHTTPNotification(method, params) {
    const body = JSON.stringify({ jsonrpc: '2.0', method, params });
    await fetch(this.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function setupMockServer() {
  fetchCalls = [];
  requestId = 0;
  fetchResponses = {
    initialize: (body) => ({
      jsonrpc: '2.0', id: body.id,
      result: { serverInfo: { name: 'Mock MCP', version: '1.0.0' }, capabilities: {}, protocolVersion: '2024-11-05' },
    }),
    'notifications/initialized': () => ({ jsonrpc: '2.0' }),
    'tools/list': (body) => ({
      jsonrpc: '2.0', id: body.id,
      result: { tools: [{ name: 'test_tool', description: 'Test', inputSchema: { type: 'object', properties: {} } }] },
    }),
    'tools/call': (body) => ({
      jsonrpc: '2.0', id: body.id,
      result: {
        content: [{ type: 'text', text: 'hello' }],
        _meta: { ui: { resourceUri: 'widget://my-widget' } },
      },
    }),
    'resources/list': (body) => ({
      jsonrpc: '2.0', id: body.id,
      result: { resources: [{ uri: 'widget://my-widget', name: 'My Widget', mimeType: 'text/html' }] },
    }),
    'resources/read': (body) => ({
      jsonrpc: '2.0', id: body.id,
      result: {
        contents: [{ uri: body.params?.uri, text: '<html><body>widget content</body></html>', mimeType: 'text/html' }],
      },
    }),
  };
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('McpClient', () => {
  test('connect() returns serverInfo and tools', async () => {
    setupMockServer();
    const client = new McpClient('http://localhost:3000/mcp', 'http');
    const { serverInfo, tools } = await client.connect();
    assert.equal(serverInfo.name, 'Mock MCP');
    assert.equal(tools.length, 1);
    assert.equal(tools[0].name, 'test_tool');
  });

  test('callTool() returns content and _meta', async () => {
    setupMockServer();
    const client = new McpClient('http://localhost:3000/mcp', 'http');
    await client.connect();
    const result = await client.callTool('test_tool', {});
    assert.ok(result.content, 'should have content');
    assert.ok(result._meta, 'should have _meta');
    assert.equal(result._meta.ui.resourceUri, 'widget://my-widget');
    assert.equal(result.isError, false);
  });

  test('callTool() _meta is undefined when server returns no _meta', async () => {
    setupMockServer();
    fetchResponses['tools/call'] = (body) => ({
      jsonrpc: '2.0', id: body.id,
      result: { content: [{ type: 'text', text: 'no meta here' }] },
    });
    const client = new McpClient('http://localhost:3000/mcp', 'http');
    await client.connect();
    const result = await client.callTool('test_tool', {});
    assert.equal(result._meta, undefined);
    assert.equal(result.isError, false);
  });

  test('listResources() returns array of resources', async () => {
    setupMockServer();
    const client = new McpClient('http://localhost:3000/mcp', 'http');
    await client.connect();
    const resources = await client.listResources();
    assert.equal(resources.length, 1);
    assert.equal(resources[0].uri, 'widget://my-widget');
    assert.equal(resources[0].name, 'My Widget');
  });

  test('listResources() returns empty array when server has none', async () => {
    setupMockServer();
    fetchResponses['resources/list'] = (body) => ({
      jsonrpc: '2.0', id: body.id,
      result: { resources: [] },
    });
    const client = new McpClient('http://localhost:3000/mcp', 'http');
    await client.connect();
    const resources = await client.listResources();
    assert.deepEqual(resources, []);
  });

  test('readResource() returns HTML content for a widget URI', async () => {
    setupMockServer();
    const client = new McpClient('http://localhost:3000/mcp', 'http');
    await client.connect();
    const result = await client.readResource('widget://my-widget');
    assert.ok(result.contents.length > 0);
    assert.equal(result.contents[0].text, '<html><body>widget content</body></html>');
    assert.equal(result.contents[0].mimeType, 'text/html');
  });

  test('readResource() returns isError on network failure', async () => {
    setupMockServer();
    fetchResponses['resources/read'] = () => { throw new Error('Network error'); };
    const client = new McpClient('http://localhost:3000/mcp', 'http');
    await client.connect();
    const result = await client.readResource('widget://bad');
    assert.equal(result.isError, true);
    assert.equal(result.error.message, 'Network error');
    assert.deepEqual(result.contents, []);
  });

  test('callTool() returns isError on network failure', async () => {
    setupMockServer();
    fetchResponses['tools/call'] = () => { throw new Error('Timeout'); };
    const client = new McpClient('http://localhost:3000/mcp', 'http');
    await client.connect();
    const result = await client.callTool('test_tool', {});
    assert.equal(result.isError, true);
    assert.equal(result.error.message, 'Timeout');
  });

  test('callTool() returns isError for malformed success envelope', async () => {
    setupMockServer();
    fetchResponses['tools/call'] = (body) => ({
      jsonrpc: '2.0', id: body.id,
      result: undefined,
    });
    const client = new McpClient('http://localhost:3000/mcp', 'http');
    await client.connect();
    const result = await client.callTool('test_tool', {});
    assert.equal(result.isError, true);
    assert.equal(result.error.message, 'Tool response had no usable result payload');
  });
});
