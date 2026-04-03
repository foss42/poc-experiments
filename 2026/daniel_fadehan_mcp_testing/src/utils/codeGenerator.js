/**
 * Code Generator for MCP Server Export
 * Generates a complete TypeScript MCP server project from visual workflows
 */

/**
 * Convert a tool's workflow nodes/edges into executable code
 */
function generateToolExecutionCode(tool) {
  const inputNode = tool.nodes.find(n => n.type === 'input');
  const outputNode = tool.nodes.find(n => n.type === 'output');
  
  if (!inputNode || !outputNode) {
    return `    // TODO: Implement tool logic\n    return { content: [{ type: "text", text: "Not implemented" }] };`;
  }

  // Find all processing nodes (nodes that aren't input/output)
  const processingNodes = tool.nodes.filter(n => n.type !== 'input' && n.type !== 'output');
  
  if (processingNodes.length === 0) {
    // Simple passthrough - input directly to output
    return `    // Direct passthrough from input to output\n    return { content: [{ type: "text", text: JSON.stringify(args) }] };`;
  }

  // Generate code for each processing node
  const nodeCodeParts = [];
  
  for (const node of processingNodes) {
    switch (node.type) {
      case 'apiCall':
        nodeCodeParts.push(generateHttpNodeCode(node));
        break;
      case 'transform':
        nodeCodeParts.push(generateTransformNodeCode(node));
        break;
      case 'condition':
        nodeCodeParts.push(generateConditionNodeCode(node));
        break;
      case 'code':
        nodeCodeParts.push(generateCodeNodeCode(node));
        break;
      case 'loop':
        nodeCodeParts.push(generateLoopNodeCode(node));
        break;
      case 'merge':
        nodeCodeParts.push(generateMergeNodeCode(node));
        break;
      case 'errorHandler':
        nodeCodeParts.push(generateErrorHandlerNodeCode(node));
        break;
      default:
        nodeCodeParts.push(`    // Unknown node type: ${node.type}\n    const result = args;`);
    }
  }

  return nodeCodeParts.join('\n\n') + `\n\n    return { content: [{ type: "text", text: JSON.stringify(result) }] };`;
}

function generateHttpNodeCode(node) {
  const { url = '', method = 'GET', headers = {}, body = {} } = node.data || {};

  // Convert headers from { enabled, items: [{ key, value }] } format to plain object
  let headersObj = {};
  if (headers.enabled && Array.isArray(headers.items)) {
    headers.items.forEach(item => {
      if (item.key) {
        headersObj[item.key] = item.value || '';
      }
    });
  }

  // Convert body from { enabled, contentType, content } format
  let bodyCode = '';
  if (method !== 'GET' && body.enabled && body.content) {
    bodyCode = `body: ${body.content},`;
    if (body.contentType && !headersObj['Content-Type']) {
      headersObj['Content-Type'] = body.contentType;
    }
  }

  const headersStr = Object.keys(headersObj).length > 0
    ? JSON.stringify(headersObj, null, 6).replace(/\n/g, '\n      ')
    : '{}';

  return `    // HTTP Request: ${method} ${url}
    const response = await fetch(\`${url}\`, {
      method: '${method}',
      headers: ${headersStr},
      ${bodyCode}
    });
    const result = await response.json();`;
}

function generateTransformNodeCode(node) {
  const { expression = 'data' } = node.data || {};
  return `    // Transform data
    const result = ${expression};`;
}

function generateConditionNodeCode(node) {
  const { condition = 'true' } = node.data || {};
  return `    // Conditional logic
    if (${condition}) {
      // True branch
    } else {
      // False branch
    }`;
}

function generateCodeNodeCode(node) {
  const { code = '// Custom code' } = node.data || {};
  return `    // Custom code block
${code.split('\n').map(line => '    ' + line).join('\n')}`;
}

function generateLoopNodeCode(node) {
  const { arrayPath = 'args.items', itemVariable = 'item' } = node.data || {};
  return `    // Loop over array
    const items = ${arrayPath} || [];
    const result = items.map((${itemVariable}) => ${itemVariable});`;
}

function generateMergeNodeCode(node) {
  return `    // Merge branches
    const result = args;`;
}

function generateErrorHandlerNodeCode(node) {
  return `    // Error handler
    let result;
    try {
      result = args;
    } catch (error) {
      result = { error: error.message };
    }`;
}

/**
 * Generate Zod schema for tool parameters
 */
function generateToolSchema(tool) {
  const inputNode = tool.nodes.find(n => n.type === 'input');
  const parameters = inputNode?.data?.parameters || [];

  if (parameters.length === 0) {
    return '{}';
  }

  const schemaFields = parameters.map(param => {
    let zodType = 'z.string()';
    
    switch (param.type) {
      case 'string':
        zodType = 'z.string()';
        break;
      case 'number':
        zodType = 'z.number()';
        break;
      case 'boolean':
        zodType = 'z.boolean()';
        break;
      case 'array':
        zodType = 'z.array(z.any())';
        break;
      case 'object':
        zodType = 'z.record(z.any())';
        break;
    }

    if (!param.required) {
      zodType += '.optional()';
    }

    if (param.description) {
      zodType += `.describe(${JSON.stringify(param.description)})`;
    }

    return `    ${param.name}: ${zodType}`;
  });

  return `{\n${schemaFields.join(',\n')}\n  }`;
}

/**
 * Generate tool registration code
 */
function generateToolCode(tool) {
  const schema = generateToolSchema(tool);
  const executionCode = generateToolExecutionCode(tool);
  const description = tool.description ? JSON.stringify(tool.description) : '""';

  return `  // Tool: ${tool.name}
  server.tool(
    ${JSON.stringify(tool.name)},
    ${description},
    ${schema},
    async (args) => {
${executionCode}
    }
  );`;
}

/**
 * Generate resource registration code
 */
function generateResourceCode(resource) {
  const { name, description, uriTemplate, mimeType, content, resourceType, variables } = resource;

  // Check if this is a template resource (has variables)
  const templateVars = (variables || []).filter(v => v.name);
  const isTemplate = resourceType === 'template' && templateVars.length > 0;

  if (isTemplate) {
    // Generate ResourceTemplate with variables
    const varSchemas = templateVars.map(v => {
      let zodType = 'z.string()';
      if (v.type === 'number') zodType = 'z.coerce.number()';
      if (v.description) zodType += `.describe(${JSON.stringify(v.description)})`;
      return `      ${v.name}: ${zodType}`;
    });

    return `  // Resource Template: ${name}
  server.resource(
    ${JSON.stringify(name)},
    new ResourceTemplate(${JSON.stringify(uriTemplate)}, {
      list: async () => ({
        resources: [{ uri: ${JSON.stringify(uriTemplate)}, name: ${JSON.stringify(name)}, mimeType: ${JSON.stringify(mimeType)} }]
      })
    }),
    async (uri, params) => {
      let content = ${JSON.stringify(content || '')};
      // Interpolate variables
${templateVars.map(v => `      content = content.replace(/\\{\\{${v.name}\\}\\}/g, String(params.${v.name} || ''));`).join('\n')}
      return {
        contents: [{
          uri: uri.href,
          mimeType: ${JSON.stringify(mimeType)},
          text: content
        }]
      };
    }
  );`;
  } else {
    // Static resource
    return `  // Resource: ${name}
  server.resource(
    ${JSON.stringify(name)},
    ${JSON.stringify(uriTemplate)},
    async (uri) => ({
      contents: [{
        uri: uri.href,
        mimeType: ${JSON.stringify(mimeType)},
        text: ${JSON.stringify(content || '')}
      }]
    })
  );`;
  }
}

/**
 * Generate prompt registration code
 */
function generatePromptCode(prompt) {
  const { name, description, arguments: args = [], messages = [] } = prompt;

  // Generate argument schema
  const argSchemas = args.map(arg => {
    let zodType = 'z.string()';
    switch (arg.type) {
      case 'number': zodType = 'z.coerce.number()'; break;
      case 'boolean': zodType = 'z.coerce.boolean()'; break;
      case 'array': zodType = 'z.array(z.any())'; break;
      case 'object': zodType = 'z.record(z.any())'; break;
    }
    if (!arg.required) zodType += '.optional()';
    if (arg.description) zodType += `.describe(${JSON.stringify(arg.description)})`;
    return `      ${arg.name}: ${zodType}`;
  });

  const argsSchema = args.length > 0 
    ? `{\n${argSchemas.join(',\n')}\n    }`
    : '{}';

  // Generate messages with interpolation
  // SDK only allows "user" | "assistant" roles, so filter out "system" messages
  const validRoles = ['user', 'assistant'];
  const messagesCode = messages
    .filter(msg => msg.role !== 'system') // Skip system messages (not supported by SDK)
    .map(msg => {
      const content = msg.content || '';
      const role = validRoles.includes(msg.role) ? msg.role : 'user';
      // Check if content has template variables
      const hasVars = /\{\{[^}]+\}\}/.test(content);

      if (hasVars) {
        // Need to interpolate
        const interpolated = content.replace(/\{\{([^}]+)\}\}/g, '${args.$1 || ""}');
        return `      { role: ${JSON.stringify(role)}, content: { type: "text", text: \`${interpolated}\` } }`;
      } else {
        return `      { role: ${JSON.stringify(role)}, content: { type: "text", text: ${JSON.stringify(content)} } }`;
      }
    });

  return `  // Prompt: ${name}
  server.prompt(
    ${JSON.stringify(name)},
    ${JSON.stringify(description || '')},
    ${argsSchema},
    async (args) => ({
      messages: [
${messagesCode.join(',\n')}
      ]
    })
  );`;
}

/**
 * Generate the main server index.ts file
 */
function generateIndexTs(server) {
  const { name, description, transport = 'stdio', tools = [], resources = [], prompts = [] } = server;

  const hasResources = resources.length > 0;
  const hasTemplateResources = resources.some(r =>
    r.resourceType === 'template' && (r.variables || []).some(v => v.name)
  );

  const isHttp = transport === 'http' || transport === 'sse';

  // Imports
  const imports = [
    'import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";',
  ];

  if (isHttp) {
    imports.push('import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";');
    imports.push('import express from "express";');
    imports.push('import cors from "cors";');
  } else {
    imports.push('import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";');
  }

  imports.push('import { z } from "zod";');

  if (hasTemplateResources) {
    imports.push('import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";');
  }

  // Server initialization
  const serverInit = `
// Create server instance
const server = new McpServer({
  name: ${JSON.stringify(name)},
  version: "1.0.0",
  description: ${JSON.stringify(description || '')}
});`;

  // Generate all tool registrations
  const toolsCode = tools.map(tool => generateToolCode(tool)).join('\n\n');

  // Generate all resource registrations
  const resourcesCode = resources.map(resource => generateResourceCode(resource)).join('\n\n');

  // Generate all prompt registrations
  const promptsCode = prompts.map(prompt => generatePromptCode(prompt)).join('\n\n');

  // Main function - different for HTTP vs stdio
  let mainFunc;
  if (isHttp) {
    mainFunc = `
// Start the HTTP/SSE server
const app = express();
app.use(cors());

// Store active transports by session ID
const transports = new Map<string, SSEServerTransport>();

// SSE endpoint for MCP communication
app.get("/sse", (req, res) => {
  const sessionId = req.query.sessionId as string || crypto.randomUUID();
  console.error(\`New SSE connection: \${sessionId}\`);

  const transport = new SSEServerTransport("/messages", res);
  transports.set(sessionId, transport);

  res.on("close", () => {
    console.error(\`SSE connection closed: \${sessionId}\`);
    transports.delete(sessionId);
  });

  server.connect(transport);
});

// Messages endpoint for client-to-server communication
app.post("/messages", express.json(), (req, res) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports.get(sessionId);

  if (!transport) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  transport.handlePostMessage(req, res);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.error(\`${name} MCP server running on http://localhost:\${PORT}\`);
  console.error(\`SSE endpoint: http://localhost:\${PORT}/sse\`);
});`;
  } else {
    mainFunc = `
// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("${name} MCP server running on stdio");
}

main().catch(console.error);`;
  }

  // Combine all parts
  const sections = [
    imports.join('\n'),
    serverInit
  ];

  if (tools.length > 0) {
    sections.push('\n// ============ TOOLS ============');
    sections.push(toolsCode);
  }

  if (resources.length > 0) {
    sections.push('\n// ============ RESOURCES ============');
    sections.push(resourcesCode);
  }

  if (prompts.length > 0) {
    sections.push('\n// ============ PROMPTS ============');
    sections.push(promptsCode);
  }

  sections.push(mainFunc);

  return sections.join('\n');
}

/**
 * Generate package.json
 */
function generatePackageJson(server) {
  const isHttp = server.transport === 'http' || server.transport === 'sse';

  const dependencies = {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "zod": "^3.22.0"
  };

  const devDependencies = {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  };

  // Add HTTP-specific dependencies
  if (isHttp) {
    dependencies["express"] = "^4.18.0";
    dependencies["cors"] = "^2.8.5";
    devDependencies["@types/express"] = "^4.17.0";
    devDependencies["@types/cors"] = "^2.8.0";
  }

  const packageJson = {
    name: server.name.toLowerCase().replace(/\s+/g, '-'),
    version: "1.0.0",
    description: server.description || `MCP server: ${server.name}`,
    type: "module",
    main: "dist/index.js",
    scripts: {
      build: "tsc",
      start: "node dist/index.js",
      dev: "tsc -w"
    },
    dependencies,
    devDependencies
  };

  return JSON.stringify(packageJson, null, 2);
}

/**
 * Generate tsconfig.json
 */
function generateTsConfig() {
  const tsConfig = {
    compilerOptions: {
      target: "ES2022",
      module: "NodeNext",
      moduleResolution: "NodeNext",
      outDir: "./dist",
      rootDir: "./src",
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      declaration: true
    },
    include: ["src/**/*"],
    exclude: ["node_modules", "dist"]
  };

  return JSON.stringify(tsConfig, null, 2);
}

/**
 * Generate README.md
 */
function generateReadme(server) {
  const { name, description, transport = 'stdio', tools = [], resources = [], prompts = [] } = server;
  const isHttp = transport === 'http' || transport === 'sse';
  const projectName = name.toLowerCase().replace(/\s+/g, '-');

  let readme = `# ${name}

${description || 'An MCP server generated by Forge.'}

## Installation

\`\`\`bash
npm install
npm run build
\`\`\`

## Usage

\`\`\`bash
npm start
\`\`\`

`;

  if (isHttp) {
    readme += `This server uses HTTP/SSE transport and will start on port 3000 by default.

- SSE endpoint: \`http://localhost:3000/sse\`
- Messages endpoint: \`http://localhost:3000/messages\`

You can change the port by setting the \`PORT\` environment variable:

\`\`\`bash
PORT=8080 npm start
\`\`\`

`;
  } else {
    readme += `Or configure in your MCP client:

\`\`\`json
{
  "mcpServers": {
    "${projectName}": {
      "command": "node",
      "args": ["path/to/dist/index.js"]
    }
  }
}
\`\`\`

`;
  }

  readme += `## Capabilities

`;

  if (tools.length > 0) {
    readme += `### Tools (${tools.length})\n\n`;
    tools.forEach(tool => {
      readme += `- **${tool.name}**: ${tool.description || 'No description'}\n`;
    });
    readme += '\n';
  }

  if (resources.length > 0) {
    readme += `### Resources (${resources.length})\n\n`;
    resources.forEach(resource => {
      readme += `- **${resource.name}** (\`${resource.uriTemplate}\`): ${resource.description || 'No description'}\n`;
    });
    readme += '\n';
  }

  if (prompts.length > 0) {
    readme += `### Prompts (${prompts.length})\n\n`;
    prompts.forEach(prompt => {
      readme += `- **${prompt.name}**: ${prompt.description || 'No description'}\n`;
    });
    readme += '\n';
  }

  readme += `
## Generated by Forge

This server was generated using [Forge](https://github.com/your-org/forge), a visual MCP server builder.
`;

  return readme;
}

/**
 * Generate manifest file for re-importing the server
 */
function generateManifest(server) {
  return JSON.stringify({
    version: "1.0.0",
    exportedAt: new Date().toISOString(),
    forgeVersion: "1.0.0",
    server: {
      id: server.id,
      name: server.name,
      description: server.description || '',
      transport: server.transport,
      tools: server.tools || [],
      resources: server.resources || [],
      prompts: server.prompts || [],
    }
  }, null, 2);
}

/**
 * Generate all files for the MCP server project
 * Returns an object with file paths as keys and content as values
 */
export function generateServerProject(server) {
  const files = {};
  const projectName = server.name.toLowerCase().replace(/\s+/g, '-');

  // Generate main files
  files[`${projectName}/src/index.ts`] = generateIndexTs(server);
  files[`${projectName}/package.json`] = generatePackageJson(server);
  files[`${projectName}/tsconfig.json`] = generateTsConfig();
  files[`${projectName}/README.md`] = generateReadme(server);
  files[`${projectName}/mcp-builder.manifest.json`] = generateManifest(server);

  // Add .gitignore
  files[`${projectName}/.gitignore`] = `node_modules/
dist/
.env
*.log
`;

  return files;
}

/**
 * Preview the generated index.ts code without full project
 */
export function previewServerCode(server) {
  return generateIndexTs(server);
}
