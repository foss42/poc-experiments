import { WORKFLOW_NODE_TYPES } from './constants.js';

function evaluateExpression(expr, data) {
  try {
    const fn = new Function('data', `
      with (data) {
        return ${expr};
      }
    `);
    return fn(data);
  } catch (err) {
    console.error('Expression error:', err);
    return null;
  }
}

export async function executeWorkflow(nodes, edges, inputs) {
  const executionSteps = [];
  let state = { ...inputs };

  // Find the input node
  const inputNode = nodes.find(n => n.type === WORKFLOW_NODE_TYPES.INPUT);
  if (!inputNode) {
    return { success: false, error: 'No input node found in the workflow.', steps: [] };
  }

  // Set the input variables from the schema
  const parameters = inputNode.data.parameters || [];
  // (In a real scenario, could validate required fields here)

  let currentNode = inputNode;
  const visited = new Set();

  while (currentNode) {
    if (visited.has(currentNode.id)) {
      return { success: false, error: 'Infinite loop detected in workflow.', steps: executionSteps };
    }
    visited.add(currentNode.id);

    // Record step start
    const stepStart = performance.now();
    const stepOutput = { nodeId: currentNode.id, type: currentNode.type, input: { ...state } };

    try {
      switch (currentNode.type) {
        case WORKFLOW_NODE_TYPES.INPUT:
          // Just passes the State through
          break;

        case WORKFLOW_NODE_TYPES.API_CALL:
          const { method, url, body, headers, queryParams } = currentNode.data;

          let parsedUrl = url;
          // evaluate {{var}} in url
          parsedUrl = url.replace(/\{\{([^}]+)\}\}/g, (_, exp) => evaluateExpression(exp, state));

          if (!parsedUrl) throw new Error('API URL is empty');

          const fetchOptions = {
            method: method || 'GET',
            headers: {
              'Accept': 'application/json',
            },
          };

          if (headers?.enabled && headers.items) {
            headers.items.forEach(h => {
              if (h.key && h.value) {
                fetchOptions.headers[h.key] = h.value.replace(/\{\{([^}]+)\}\}/g, (_, exp) => evaluateExpression(exp, state));
              }
            });
          }

          if (body?.enabled && ['POST', 'PUT', 'PATCH'].includes(method)) {
            fetchOptions.headers['Content-Type'] = body.contentType || 'application/json';
            let parsedBody = body.content;
            if (typeof parsedBody === 'string') {
              parsedBody = parsedBody.replace(/\{\{([^}]+)\}\}/g, (_, exp) => evaluateExpression(exp, state));
            }
            fetchOptions.body = parsedBody;
          }

          if (queryParams?.enabled && queryParams.items) {
            const currentUrl = new URL(parsedUrl);
            queryParams.items.forEach(q => {
              if (q.key && q.value) {
                currentUrl.searchParams.append(q.key, q.value.replace(/\{\{([^}]+)\}\}/g, (_, exp) => evaluateExpression(exp, state)));
              }
            });
            parsedUrl = currentUrl.toString();
          }

          console.log(`Executing API call: ${method} ${parsedUrl}`, fetchOptions);
          // Only perform fetch if the URL starts with http
          if (parsedUrl.startsWith('http')) {
            const response = await fetch(parsedUrl, fetchOptions);
            const contentType = response.headers.get('content-type');
            let data;
            if (contentType && contentType.includes('application/json')) {
              data = await response.json();
            } else {
              data = await response.text();
            }
            state = { ...state, api_response: data, status: response.status };
          } else {
            state = { ...state, api_response: 'Mocked response for ' + parsedUrl };
          }
          break;

        case WORKFLOW_NODE_TYPES.TRANSFORM:
          // Example: Very simple transform using lodash/get or similar, here we use simple eval logic
          // A safer sandbox is better, but this is a builder preview
          const expr = currentNode.data.expression;
          if (expr) {
            state = { ...state, transformed: evaluateExpression(expr, state) };
          }
          break;

        case WORKFLOW_NODE_TYPES.CONDITION:
          // We look for true/false edge based on condition
          const isTrue = !!evaluateExpression(currentNode.data.expression, state);
          state = { ...state, condition_result: isTrue };
          break;

        case WORKFLOW_NODE_TYPES.CODE:
          // Use a simple new Function to run the Javascript Code
          const code = currentNode.data.code;
          const fn = new Function('data', code);
          state = await Promise.resolve(fn(state));
          break;

        case WORKFLOW_NODE_TYPES.OUTPUT:
          // If returnPath is defined, extract subset
          if (currentNode.data.returnPath) {
            state = evaluateExpression(currentNode.data.returnPath, state) || state;
          }
          break;

        // Add MERGE, LOOP if needed
      }

      stepOutput.output = { ...state };
      stepOutput.durationMs = Math.round(performance.now() - stepStart);
      executionSteps.push(stepOutput);

    } catch (err) {
      stepOutput.error = err.message;
      stepOutput.durationMs = Math.round(performance.now() - stepStart);
      executionSteps.push(stepOutput);
      return { success: false, error: err.message, steps: executionSteps, data: null };
    }

    // Output node is the end
    if (currentNode.type === WORKFLOW_NODE_TYPES.OUTPUT) {
      return { success: true, data: state, steps: executionSteps };
    }

    // Find the next node
    const outgoingEdges = edges.filter(e => e.source === currentNode.id);

    if (outgoingEdges.length === 0) {
      // Reached the end but no Output node? 
      // Technically should fail, but let's return latest state.
      return { success: true, data: state, steps: executionSteps };
    }

    // If it's a condition node, pick edge based on true/false handles
    if (currentNode.type === WORKFLOW_NODE_TYPES.CONDITION) {
      const handleId = state.condition_result ? 'true' : 'false';
      const edge = outgoingEdges.find(e => e.sourceHandle === handleId) || outgoingEdges[0];
      currentNode = nodes.find(n => n.id === edge.target);
    } else {
      // Just pick the first edge (assuming linear workflow mostly)
      currentNode = nodes.find(n => n.id === outgoingEdges[0].target);
    }
  }

  return { success: true, data: state, steps: executionSteps };
}
