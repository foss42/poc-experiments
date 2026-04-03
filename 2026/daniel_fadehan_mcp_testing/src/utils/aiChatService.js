import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, tool, jsonSchema, stepCountIs } from 'ai';
import { classifyToolOutcome, getToolErrorMessage } from './toolOutcome.js';

export const DEFAULT_SYSTEM_PROMPT = `You are an AI assistant equipped with dynamic tools provided by connected MCP (Model Context Protocol) servers. Your goal is to proactively and autonomously use these tools to fulfill the user's requests.

CRITICAL INSTRUCTIONS:
1. Always prefer using the available tools over asking the user for clarification.
2. If a tool requires parameters you do not have, but is designed to gather them interactively or can be initiated with defaults, invoke it immediately rather than asking the user.
3. Adapt seamlessly to whatever tools are currently provided in your context. You may be connected to different servers at different times, so rely strictly on the provided tool descriptions to determine their capabilities.
4. Act like an MCP agent with visible action narration. Before calling ANY tool, first output a short conversational message explaining what you are about to do and why.
5. NEVER call the exact same tool with the exact same arguments repeatedly in a loop. Read the conversation history to see if you have already called a tool.
6. TOOL CHAINING — when calling a tool that requires data from a previous tool result, carefully read the target tool's inputSchema and map EACH required field explicitly from previous results and conversation context.
7. SCHEMA STRICTNESS — Never nest a previous result under a single key like "data" unless the target tool's schema explicitly requires a "data" property. If the schema asks for "selections" and "report", you MUST provide both at the top level of the tool arguments.
8. DATA PERSISTENCE — When chaining, if the target tool asks for a "selections" object (containing things like states, metric, period, year), you must reconstruct this object from the original user request or context, NOT from the previous tool's output if that output only contained the generated report.
9. AFTER EACH TOOL RESULT — If another tool is needed, briefly say what you learned and what you will do next before making the next call.
10. FINAL RESPONSE — After the last tool in a chain, give the user a concise final answer using the meaningful result data, not transport metadata.
11. SUCCESSFUL TOOL EXECUTION vs PAYLOAD CONTENT — If a tool call succeeds, that tool execution is complete. Do NOT say the operation is still pending, incomplete, or still running unless the tool call itself failed or the tool result explicitly says so at the top level.
12. UNEXPECTED PAYLOADS — If a successful tool returns data that does not match the user's request, do not invent a failure. Briefly describe what the tool actually returned and note that the payload does not look like the expected domain data.
13. DO NOT expose hidden chain-of-thought. Your narration should be concise, action-oriented progress updates such as "I'll fetch the operation first" or "I have the operation now, so I'll use it to get the balance."`;

const FOLLOW_UP_TOOL_RESULT_REMINDER = `FOLLOW-UP STEP RULES:
- If you are generating after a tool result, that previous tool call already completed successfully unless the tool result explicitly raised an error.
- Do not treat nested payload fields such as completed, done, success, or status inside arbitrary result objects as the execution state of the tool call itself.
- If the payload looks unrelated or unexpected for the user's request, say exactly what the tool returned and note that it does not look like the expected domain data. Do not claim the tool is still running or incomplete.`;

export async function sendChatMessage({
  messages,
  mcpTools,
  mcpClient,
  apiKey,
  onToolCall,
  onToolResult,
  onStreamPart,
  system = DEFAULT_SYSTEM_PROMPT,
}) {
  const google = createGoogleGenerativeAI({ apiKey });

  const tools = {};
  for (const mcpTool of mcpTools) {
    tools[mcpTool.name] = tool({
      description: mcpTool.description || '',
      // Use jsonSchema() to pass the MCP inputSchema directly — avoids
      // Zod conversion issues and guarantees Gemini always sees type:object.
      parameters: jsonSchema(normalizeSchema(mcpTool.inputSchema)),
      execute: async (args, { toolCallId }) => {
        onToolCall?.(mcpTool.name, args, toolCallId);
        const result = await mcpClient.callTool(mcpTool.name, args);
        await onToolResult?.(mcpTool.name, args, result, toolCallId);

        const outcome = classifyToolOutcome(result);
        if (!outcome.ok) {
          throw new Error(getToolErrorMessage(result));
        }

          // Return clean data to the AI SDK so Gemini sees the actual
          // tool output shape (e.g. { selections, report }) rather than
        // the MCP transport wrapper ({ content, structuredContent, _meta, ... }).
        // This is critical for tool chaining — the next tool's inputSchema
        // expects fields from structuredContent, not the wrapper.
        return extractToolData(result);
      },
    });
  }

  const result = streamText({
    model: google('gemini-2.5-flash'),
    system,
    tools,
    messages: flattenMessagesForModel(messages),
    stopWhen: stepCountIs(5),
    prepareStep: async ({ stepNumber, steps }) => {
      if (stepNumber === 0) {
        return {};
      }

      const previousToolResults = steps.flatMap((step) => step.toolResults || []);
      if (previousToolResults.length === 0) {
        return {};
      }

      return {
        system: `${system}\n\n${FOLLOW_UP_TOOL_RESULT_REMINDER}`,
      };
    },
  });

  for await (const part of result.fullStream) {
    if (part) {
      await onStreamPart?.(part);
    }
  }

  const steps = await result.steps;

  return {
    text: await result.text,
    steps: (steps || []).map((s) => ({
      stepNumber: s.stepNumber,
      text: s.text || '',
      reasoning: s.reasoning || '',
      toolCalls: (s.toolCalls || []).map((tc) => ({
        toolCallId: tc.toolCallId,
        toolName: tc.toolName,
        args: tc.args,
      })),
    })),
    toolCalls: (steps || []).flatMap((s) => s.toolCalls || []),
  };
}

function flattenMessagesForModel(messages = []) {
  return messages
    .filter((message) => {
      if (message.role !== 'assistant') return true;

      const hasContent = typeof message.content === 'string' && message.content.trim().length > 0;
      const hasParts = Array.isArray(message.parts) && message.parts.length > 0;
      const hasLegacyToolCalls = Array.isArray(message.toolCalls) && message.toolCalls.length > 0;

      return hasContent || hasParts || hasLegacyToolCalls;
    })
    .flatMap((message) => {
      if (message.role !== 'assistant') {
        return [{ role: message.role, content: message.content || '' }];
      }

      const parts = normalizeAssistantParts(message);
      const flattened = [];
      let assistantContent = [];

      const flushAssistantContent = () => {
        if (assistantContent.length === 0) return;
        flattened.push({ role: 'assistant', content: assistantContent });
        assistantContent = [];
      };

      for (const part of parts) {
        if (part.type === 'text' || part.type === 'error') {
          if (part.text) {
            assistantContent.push({ type: 'text', text: part.text });
          }
          continue;
        }

        if (part.type !== 'tool') continue;

        const toolCallId = part.toolCall?.callId;
        const toolName = part.toolCall?.toolName;
        if (!toolCallId || !toolName) continue;

        assistantContent.push({
          type: 'tool-call',
          toolCallId,
          toolName,
          args: part.toolCall.args || {},
        });
        flushAssistantContent();

        const resultPayload = part.toolCall.result ?? part.toolCall.output;
        if (resultPayload !== undefined && part.toolCall.status !== 'failed') {
          flattened.push({
            role: 'tool',
            content: [{
              type: 'tool-result',
              toolCallId,
              toolName,
              output: { type: 'json', value: extractToolData(resultPayload) },
            }],
          });
        }
      }

      if (assistantContent.length === 0 && typeof message.content === 'string' && message.content.trim()) {
        assistantContent.push({ type: 'text', text: message.content });
      }

      flushAssistantContent();
      return flattened;
    });
}

function normalizeAssistantParts(message) {
  if (Array.isArray(message.parts) && message.parts.length > 0) {
    return message.parts;
  }

  const parts = [];
  if (typeof message.content === 'string' && message.content.trim()) {
    parts.push({ type: 'text', text: message.content });
  }

  for (const toolCall of message.toolCalls || []) {
    parts.push({ type: 'tool', toolCall });
  }

  return parts;
}

// Gemini requires functionDeclaration.parameters to be type:"object".
// Some MCP servers omit the schema or use non-object types — normalise here.
function normalizeSchema(schema) {
  if (!schema || typeof schema !== 'object') {
    return { type: 'object', properties: {} };
  }
  if (schema.type !== 'object') {
    return { ...schema, type: 'object', properties: {} };
  }
  if (!schema.properties) {
    return { ...schema, properties: {} };
  }
  return schema;
}

/**
 * Extract the meaningful data from an MCP callTool result so the AI SDK
 * (and therefore Gemini) sees clean tool output rather than the transport
 * wrapper produced by McpClient.
 *
 * Priority:
 *  1. structuredContent — the rich typed object the server intended to return
 *  2. Parsed JSON from content[0].text — common pattern for text-only results
 *  3. The full result as-is — safe fallback
 */
function extractToolData(result) {
  if (!result || result.isError) return result;

  // 1. Prefer structuredContent (the canonical MCP rich-data field)
  if (result.structuredContent != null) {
    return result.structuredContent;
  }

  // 2. Try to parse JSON from the first text content block
  if (Array.isArray(result.content)) {
    const textBlock = result.content.find((c) => c.type === 'text');
    if (textBlock?.text) {
      try {
        return JSON.parse(textBlock.text);
      } catch {
        // Not JSON — return the text directly
        return { text: textBlock.text };
      }
    }
  }

  // 3. Fallback — return as-is
  return result;
}

export const __test = {
  extractToolData,
  flattenMessagesForModel,
  normalizeSchema,
  normalizeAssistantParts,
  DEFAULT_SYSTEM_PROMPT,
  FOLLOW_UP_TOOL_RESULT_REMINDER,
};
