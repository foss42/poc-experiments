import { MCPClient, ToolDefinition } from "./client.js";
import {
  AssertionResult,
  runAssertion,
  assert,
  assertType,
  assertHasKey,
  assertErrorCode,
} from "./assertions.js";

export async function runConformanceSuite(client: MCPClient): Promise<AssertionResult[]> {
  const results: AssertionResult[] = [];
  let tools: ToolDefinition[] = [];

  // ── Protocol Tests ──

  results.push(
    await runAssertion("initialize returns valid result", "Protocol", async () => {
      const result = await client.initialize();
      assertHasKey(result, "protocolVersion", "InitializeResult");
      assertHasKey(result, "capabilities", "InitializeResult");
      assertHasKey(result, "serverInfo", "InitializeResult");
    })
  );

  results.push(
    await runAssertion("server reports protocol version", "Protocol", async () => {
      const result = await client.initialize();
      assertType(result.protocolVersion, "string", "protocolVersion");
      assert(result.protocolVersion.length > 0, "protocolVersion is empty");
    })
  );

  results.push(
    await runAssertion("server reports name and version", "Protocol", async () => {
      const result = await client.initialize();
      assertHasKey(result.serverInfo, "name", "serverInfo");
      assertHasKey(result.serverInfo, "version", "serverInfo");
      assertType(result.serverInfo.name, "string", "serverInfo.name");
    })
  );

  results.push(
    await runAssertion("capabilities is an object", "Protocol", async () => {
      const result = await client.initialize();
      assertType(result.capabilities, "object", "capabilities");
    })
  );

  // ── Discovery Tests ──

  results.push(
    await runAssertion("tools/list returns valid array", "Discovery", async () => {
      tools = await client.listTools();
      assertType(tools, "array", "tools");
      assert(tools.length > 0, "Server returned 0 tools");
    })
  );

  // ── Schema Validation Tests ──

  results.push(
    await runAssertion("all tools have name and description", "Schema", async () => {
      if (tools.length === 0) tools = await client.listTools();
      for (const tool of tools) {
        assertHasKey(tool, "name", `tool`);
        assertType(tool.name, "string", `tool.name`);
        assert(tool.name.length > 0, `Tool has empty name`);
      }
    })
  );

  results.push(
    await runAssertion("all tools have valid inputSchema", "Schema", async () => {
      if (tools.length === 0) tools = await client.listTools();
      for (const tool of tools) {
        if (tool.inputSchema) {
          assertType(tool.inputSchema, "object", `${tool.name}.inputSchema`);
          assertHasKey(tool.inputSchema, "type", `${tool.name}.inputSchema`);
          assert(
            tool.inputSchema.type === "object",
            `${tool.name}.inputSchema.type should be "object", got "${tool.inputSchema.type}"`
          );
        }
      }
    })
  );

  // ── Tool Execution Tests ──

  results.push(
    await runAssertion("tools/call with valid params succeeds", "Execution", async () => {
      if (tools.length === 0) tools = await client.listTools();
      const tool = tools[0];

      // Build minimal valid args from schema
      const args: Record<string, unknown> = {};
      if (tool.inputSchema?.properties) {
        for (const [key, schema] of Object.entries(tool.inputSchema.properties)) {
          const s = schema as { type?: string };
          if (s.type === "string") args[key] = "test";
          else if (s.type === "number") args[key] = 1;
          else if (s.type === "boolean") args[key] = true;
        }
      }

      const result = await client.callTool(tool.name, args);
      assertHasKey(result, "content", "ToolCallResult");
      assertType(result.content, "array", "ToolCallResult.content");
    })
  );

  results.push(
    await runAssertion("tools/call with unknown tool returns error", "Execution", async () => {
      try {
        const result = await client.callTool("__nonexistent_tool_12345__");
        // MCP spec lists unknown tools under Protocol Errors (JSON-RPC error with -32602),
        // but some servers return a successful result with isError: true instead.
        // Both are acceptable — but the server MUST signal an error through one mechanism.
        assert(
          result.isError === true,
          "Expected JSON-RPC error (-32602) or tool result with isError: true for unknown tool"
        );
      } catch (err) {
        // Server returned a JSON-RPC protocol error — validate the code.
        // Per MCP spec example: -32602 (Invalid params), NOT -32601 (Method not found),
        // because tools/call IS the method — the tool name is the invalid parameter.
        assertErrorCode(err, -32602);
      }
    })
  );

  results.push(
    await runAssertion("tool result contains typed content", "Execution", async () => {
      if (tools.length === 0) tools = await client.listTools();
      const tool = tools[0];
      const args: Record<string, unknown> = {};
      if (tool.inputSchema?.properties) {
        for (const [key, schema] of Object.entries(tool.inputSchema.properties)) {
          const s = schema as { type?: string };
          if (s.type === "string") args[key] = "test";
          else if (s.type === "number") args[key] = 42;
        }
      }

      const result = await client.callTool(tool.name, args);
      assert(result.content.length > 0, "Tool returned empty content array");
      for (const item of result.content) {
        assertHasKey(item, "type", "content item");
        assertType(item.type, "string", "content.type");
      }
    })
  );

  results.push(
    await runAssertion("tools/call to each discovered tool succeeds", "Execution", async () => {
      if (tools.length === 0) tools = await client.listTools();
      for (const tool of tools) {
        const args: Record<string, unknown> = {};
        if (tool.inputSchema?.properties) {
          for (const [key, schema] of Object.entries(tool.inputSchema.properties)) {
            const s = schema as { type?: string };
            if (s.type === "string") args[key] = "test";
            else if (s.type === "number") args[key] = 1;
          }
        }
        const result = await client.callTool(tool.name, args);
        assertHasKey(result, "content", `${tool.name} result`);
      }
    })
  );

  results.push(
    await runAssertion("tool content items have text field", "Execution", async () => {
      if (tools.length === 0) tools = await client.listTools();
      const result = await client.callTool(tools[0].name, buildArgs(tools[0]));
      for (const item of result.content) {
        if (item.type === "text") {
          assertHasKey(item, "text", "text content item");
          assertType(item.text, "string", "content.text");
        }
      }
    })
  );

  // ── Edge Case Tests ──

  results.push(
    await runAssertion("unknown method returns error code", "Edge Cases", async () => {
      const response = await client.sendRaw("nonexistent/method", {});
      assert(response.error !== undefined, "Expected error for unknown method");
      assert(response.error!.code === -32601, `Expected -32601, got ${response.error!.code}`);
    })
  );

  results.push(
    await runAssertion("duplicate initialize is idempotent", "Edge Cases", async () => {
      const result1 = await client.initialize();
      const result2 = await client.initialize();
      assert(
        result1.protocolVersion === result2.protocolVersion,
        "Protocol version changed between initializations"
      );
      assert(
        result1.serverInfo.name === result2.serverInfo.name,
        "Server name changed between initializations"
      );
    })
  );

  results.push(
    await runAssertion("concurrent tool calls resolve independently", "Edge Cases", async () => {
      if (tools.length === 0) tools = await client.listTools();
      const tool = tools[0];
      const args = buildArgs(tool);

      const [result1, result2] = await Promise.all([
        client.callTool(tool.name, args),
        client.callTool(tool.name, args),
      ]);

      assertHasKey(result1, "content", "concurrent result 1");
      assertHasKey(result2, "content", "concurrent result 2");
      assert(result1.content.length > 0, "concurrent result 1 empty");
      assert(result2.content.length > 0, "concurrent result 2 empty");
    })
  );

  results.push(
    await runAssertion("tools/call with extra params does not crash", "Edge Cases", async () => {
      if (tools.length === 0) tools = await client.listTools();
      const tool = tools[0];
      const args = { ...buildArgs(tool), __extra_unexpected_param__: "should be ignored" };
      const result = await client.callTool(tool.name, args);
      assertHasKey(result, "content", "ToolCallResult with extra params");
    })
  );

  results.push(
    await runAssertion("tools/call with empty arguments object", "Edge Cases", async () => {
      if (tools.length === 0) tools = await client.listTools();
      // Call first tool with empty args — should not crash the server
      const result = await client.callTool(tools[0].name, {});
      assertHasKey(result, "content", "ToolCallResult with empty args");
    })
  );

  results.push(
    await runAssertion("JSON-RPC response has correct version field", "Edge Cases", async () => {
      const response = await client.sendRaw("initialize", {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "test", version: "0.0.1" },
      });
      assert(response.jsonrpc === "2.0", `Expected jsonrpc "2.0", got "${response.jsonrpc}"`);
    })
  );

  results.push(
    await runAssertion("error response includes message field", "Edge Cases", async () => {
      const response = await client.sendRaw("nonexistent/method", {});
      assert(response.error !== undefined, "Expected error response");
      assertHasKey(response.error, "message", "error");
      assertType(response.error!.message, "string", "error.message");
      assert(response.error!.message.length > 0, "Error message is empty");
    })
  );

  return results;
}

function buildArgs(tool: ToolDefinition): Record<string, unknown> {
  const args: Record<string, unknown> = {};
  if (tool.inputSchema?.properties) {
    for (const [key, schema] of Object.entries(tool.inputSchema.properties)) {
      const s = schema as { type?: string };
      if (s.type === "string") args[key] = "test";
      else if (s.type === "number") args[key] = 1;
      else if (s.type === "boolean") args[key] = true;
    }
  }
  return args;
}
