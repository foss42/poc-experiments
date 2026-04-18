function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function sanitizeMeta(meta) {
  if (!isPlainObject(meta)) return null;

  const next = { ...meta };
  if (next._serverId !== undefined) {
    delete next._serverId;
  }

  return Object.keys(next).length ? next : null;
}

function parseTextContent(text) {
  if (typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (!trimmed) return null;

  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      return JSON.parse(trimmed);
    } catch {
      // Fall through to plain text
    }
  }

  return trimmed;
}

function findTextContent(result) {
  if (!Array.isArray(result?.content)) return null;
  const block = result.content.find((entry) => entry?.type === 'text' && typeof entry.text === 'string');
  return block?.text ?? null;
}

function buildResultDisplay(result) {
  if (!result || typeof result !== 'object') {
    return {
      kind: 'empty',
      value: null,
      label: 'No result',
      summary: 'No result payload was returned.',
    };
  }

  if (result.structuredContent != null) {
    const structured = result.structuredContent;
    if (isPlainObject(structured)) {
      const keys = Object.keys(structured);
      return {
        kind: 'structured',
        value: structured,
        label: 'Structured result',
        summary: keys.length === 0
          ? 'Returned an empty structured result.'
          : keys.length === 1
            ? `Returned ${keys[0]}.`
            : `Returned ${keys.length} fields: ${keys.slice(0, 3).join(', ')}${keys.length > 3 ? ', ...' : ''}.`,
      };
    }

    return {
      kind: 'structured',
      value: structured,
      label: 'Structured result',
      summary: 'Returned structured data.',
    };
  }

  const parsedText = parseTextContent(findTextContent(result));
  if (parsedText != null) {
    if (typeof parsedText === 'string') {
      const compact = parsedText.replace(/\s+/g, ' ').trim();
      return {
        kind: 'text',
        value: compact,
        label: 'Text result',
        summary: compact.length > 120 ? `${compact.slice(0, 117)}...` : compact,
      };
    }

    if (Array.isArray(parsedText)) {
      return {
        kind: 'json',
        value: parsedText,
        label: 'JSON result',
        summary: `Returned a JSON array with ${parsedText.length} item${parsedText.length === 1 ? '' : 's'}.`,
      };
    }

    if (isPlainObject(parsedText)) {
      const keys = Object.keys(parsedText);
      return {
        kind: 'json',
        value: parsedText,
        label: 'JSON result',
        summary: keys.length === 0
          ? 'Returned an empty JSON object.'
          : keys.length === 1
            ? `Returned ${keys[0]}.`
            : `Returned ${keys.length} fields: ${keys.slice(0, 3).join(', ')}${keys.length > 3 ? ', ...' : ''}.`,
      };
    }

    return {
      kind: 'json',
      value: parsedText,
      label: 'JSON result',
      summary: 'Returned JSON data.',
    };
  }

  const meta = sanitizeMeta(result._meta);
  if (meta) {
    return {
      kind: 'meta',
      value: meta,
      label: 'Metadata',
      summary: 'Returned metadata only.',
    };
  }

  return {
    kind: 'empty',
    value: null,
    label: 'No result',
    summary: 'Completed successfully with no user-facing result.',
  };
}

function buildInputDisplay(args) {
  if (!isPlainObject(args) || Object.keys(args).length === 0) {
    return {
      kind: 'empty',
      value: null,
      label: 'No input arguments',
      summary: 'No input arguments.',
    };
  }

  const keys = Object.keys(args);
  return {
    kind: 'arguments',
    value: args,
    label: 'Input arguments',
    summary: keys.length === 1
      ? `1 input argument: ${keys[0]}.`
      : `${keys.length} input arguments: ${keys.slice(0, 3).join(', ')}${keys.length > 3 ? ', ...' : ''}.`,
  };
}

export function formatToolDisplay({ args = {}, result = null } = {}) {
  const resultDisplay = buildResultDisplay(result);
  const uiResourceUri = result?._meta?.ui?.resourceUri || null;

  return {
    toolInputDisplay: buildInputDisplay(args),
    toolResultDisplay: resultDisplay,
    rawResult: result,
    hasRawDetails: result != null,
    isMcpAppResult: !!uiResourceUri,
    uiResourceUri,
  };
}

export function formatModelContextDisplay(modelContext) {
  if (modelContext == null) {
    return {
      kind: 'empty',
      value: null,
      label: 'No model context',
      summary: 'No model context has been sent from this app session.',
    };
  }

  if (isPlainObject(modelContext) && modelContext.structuredContent != null) {
    return {
      kind: 'structured-context',
      value: modelContext.structuredContent,
      label: 'Structured model context',
      summary: 'View provided structured model context.',
    };
  }

  if (isPlainObject(modelContext) && modelContext.content != null) {
    return {
      kind: 'content-context',
      value: modelContext.content,
      label: 'Content model context',
      summary: 'View provided content blocks for model context.',
    };
  }

  return {
    kind: 'context',
    value: modelContext,
    label: 'Model context',
    summary: 'View provided model context.',
  };
}

export const __test = {
  parseTextContent,
  sanitizeMeta,
};
