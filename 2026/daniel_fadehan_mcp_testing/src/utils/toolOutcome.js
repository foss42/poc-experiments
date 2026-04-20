function extractErrorMessage(toolResult) {
  if (!toolResult || typeof toolResult !== 'object') {
    return 'Tool execution failed';
  }

  if (toolResult.error?.message) {
    return toolResult.error.message;
  }

  if (Array.isArray(toolResult.content)) {
    const textContent = toolResult.content.find((c) => c?.type === 'text')?.text;
    if (textContent) return textContent;
  }

  return 'Tool execution failed';
}

export function classifyToolOutcome(toolResult) {
  if (!toolResult || typeof toolResult !== 'object') {
    return {
      ok: false,
      type: 'protocol_error',
      message: 'Invalid tool response payload',
    };
  }

  if (toolResult.isError === true) {
    return {
      ok: false,
      type: 'tool_error',
      message: extractErrorMessage(toolResult),
    };
  }

  if (toolResult.error) {
    return {
      ok: false,
      type: 'transport_error',
      message: extractErrorMessage(toolResult),
    };
  }

  if (
    toolResult.content === undefined &&
    toolResult.structuredContent === undefined &&
    toolResult._meta === undefined
  ) {
    return {
      ok: false,
      type: 'protocol_error',
      message: 'Tool response had no usable result payload',
    };
  }

  return {
    ok: true,
    type: 'success',
    message: null,
  };
}

export function getToolErrorMessage(toolResult) {
  return extractErrorMessage(toolResult);
}
