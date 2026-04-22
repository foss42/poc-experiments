import { executeWorkflow } from './workflowExecutor.js';

function stringifyBuilderResult(data) {
  if (data == null) return 'null';
  if (typeof data === 'string') return data;

  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return '[unserializable-builder-result]';
  }
}

export function normalizeBuilderExecutionResult(result, responseTime = 0) {
  if (!result?.success) {
    return {
      content: [
        {
          type: 'text',
          text: result?.error || 'Builder workflow execution failed',
        },
      ],
      structuredContent: null,
      _meta: { _serverId: 'builder' },
      isError: true,
      error: { message: result?.error || 'Builder workflow execution failed' },
      responseTime,
      steps: result?.steps || [],
    };
  }

  return {
    content: [
      {
        type: 'text',
        text: stringifyBuilderResult(result.data),
      },
    ],
    structuredContent: result.data ?? {},
    _meta: { _serverId: 'builder' },
    isError: false,
    error: null,
    responseTime,
    steps: result.steps || [],
  };
}

export function createBuilderChatAdapter(tools = []) {
  const toolMap = new Map(
    (tools || [])
      .filter((tool) => tool?.name)
      .map((tool) => [tool.name, tool])
  );

  return {
    supportsWidgets: false,

    async callTool(name, args = {}) {
      const tool = toolMap.get(name);
      const startedAt = performance.now();

      if (!tool?.originalTool) {
        return {
          content: [{ type: 'text', text: `Builder tool "${name}" was not found.` }],
          structuredContent: null,
          _meta: { _serverId: 'builder' },
          isError: true,
          error: { message: `Builder tool "${name}" was not found.` },
          responseTime: 0,
        };
      }

      try {
        const result = await executeWorkflow(
          tool.originalTool.nodes || [],
          tool.originalTool.edges || [],
          args
        );
        const responseTime = Math.round(performance.now() - startedAt);
        return normalizeBuilderExecutionResult(result, responseTime);
      } catch (error) {
        return {
          content: [{ type: 'text', text: error.message || 'Builder workflow execution failed' }],
          structuredContent: null,
          _meta: { _serverId: 'builder' },
          isError: true,
          error: { message: error.message || 'Builder workflow execution failed' },
          responseTime: Math.round(performance.now() - startedAt),
        };
      }
    },

    async readResource(uri) {
      return {
        contents: [],
        isError: true,
        error: {
          message: `Builder mode does not support chat widget resources yet (${uri}).`,
        },
        responseTime: 0,
      };
    },
  };
}
