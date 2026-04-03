import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  readFileSync, writeFileSync, readdirSync, existsSync, statSync, mkdirSync,
} from "fs";
import { join, resolve, extname } from "path";
import { execSync } from "child_process";
import { homedir } from "os";
import SwaggerParser from '@apidevtools/swagger-parser';

const server = new Server(
  { name: "cli-tool-server", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "search_api_endpoints",
      description: "Search for endpoints in an OpenAPI specification by path or method.",
      inputSchema: {
        type: "object",
        properties: {
          schemaPath: { type: "string", description: "Path to the OpenAPI JSON/YAML file" },
          query: { type: "string", description: "Optional query to filter paths (e.g. 'users')" }
        },
        required: ["schemaPath"]
      }
    },
    {
      name: "get_api_endpoint_details",
      description: "Get full OpenAPI details for a specific endpoint and method.",
      inputSchema: {
        type: "object",
        properties: {
          schemaPath: { type: "string", description: "Path to the OpenAPI schema" },
          path: { type: "string", description: "The API path (e.g., '/users')" },
          method: { type: "string", description: "The HTTP method (e.g., 'get', 'post')" }
        },
        required: ["schemaPath", "path", "method"]
      }
    },
    {
      name: "read_file",
      description: "Read the contents of a local file",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string", description: "Absolute or relative path to the file" },
          start_line: { type: "number", description: "Start line (1-based, optional)" },
          end_line: { type: "number", description: "End line (1-based, optional)" },
        },
        required: ["path"],
      },
    },
    {
      name: "write_file",
      description: "Write content to a local file (creates parent directories if needed)",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string", description: "Path to the file" },
          content: { type: "string", description: "Content to write" },
          append: { type: "boolean", description: "Append instead of overwrite (default: false)" },
        },
        required: ["path", "content"],
      },
    },
    {
      name: "list_directory",
      description: "List files and directories inside a given directory",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string", description: "Directory path to list" },
          recursive: { type: "boolean", description: "List recursively (default: false)" },
        },
        required: ["path"],
      },
    },
    {
      name: "search_files",
      description: "Search for a text pattern across files in a directory",
      inputSchema: {
        type: "object",
        properties: {
          directory: { type: "string", description: "Root directory to search in" },
          pattern: { type: "string", description: "Search pattern (plain text)" },
          file_extension: { type: "string", description: "Limit to files with this extension (e.g. .ts)" },
        },
        required: ["directory", "pattern"],
      },
    },
    {
      name: "read_many_files",
      description: "Read multiple files at once and return their contents",
      inputSchema: {
        type: "object",
        properties: {
          paths: { type: "array", items: { type: "string" }, description: "Array of file paths to read" },
        },
        required: ["paths"],
      },
    },
    {
      name: "execute_command",
      description: "Execute a shell command and return its output",
      inputSchema: {
        type: "object",
        properties: {
          command: { type: "string", description: "Shell command to execute" },
          cwd: { type: "string", description: "Working directory (default: process.cwd())" },
          timeout_ms: { type: "number", description: "Timeout in milliseconds (default: 30000)" },
        },
        required: ["command"],
      },
    },
    {
      name: "get_file_info",
      description: "Get metadata about a file or directory",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string", description: "Path to the file or directory" },
        },
        required: ["path"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "search_api_endpoints": {
        const schemaPath = resolve(args?.schemaPath as string);
        const query = args?.query as string | undefined;
        const api = await SwaggerParser.parse(schemaPath) as any;
        const paths = api.paths || {};
        const results: string[] = [];

        for (const [pathStr, pathItem] of Object.entries(paths)) {
          if (query && !pathStr.includes(query)) continue;
          const methods = Object.keys(pathItem as any).filter(m => !m.startsWith('x-'));
          results.push(`Path: ${pathStr} | Methods: ${methods.join(', ')}`);
        }
        
        return {
          content: [{
            type: "text",
            text: results.length > 0 ? results.join("\n") : `No endpoints found matching '${query || ''}'`
          }]
        };
      }

      case "get_api_endpoint_details": {
        const schemaPath = resolve(args?.schemaPath as string);
        const path = args?.path as string;
        const method = (args?.method as string).toLowerCase();
        
        const api = await SwaggerParser.validate(schemaPath) as any;
        const endpoint = api.paths?.[path]?.[method];
        
        if (!endpoint) {
          return { content: [{ type: "text", text: `Endpoint ${method.toUpperCase()} ${path} not found in schema.` }] };
        }
        
        return { content: [{ type: "text", text: JSON.stringify(endpoint, null, 2) }] };
      }

      case "read_file": {
        const filePath = resolve(args?.path as string);
        const content = readFileSync(filePath, "utf-8");
        const startLine = args?.start_line as number | undefined;
        const endLine = args?.end_line as number | undefined;
        if (startLine || endLine) {
          const lines = content.split("\n");
          const s = (startLine ?? 1) - 1;
          const e = endLine ?? lines.length;
          return { content: [{ type: "text", text: lines.slice(s, e).join("\n") }] };
        }
        return { content: [{ type: "text", text: content }] };
      }

      case "write_file": {
        const filePath = resolve(args?.path as string);
        const dir = join(filePath, "..");
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
        const content = args?.content as string;
        const append = args?.append as boolean ?? false;
        if (append) {
          const existing = existsSync(filePath) ? readFileSync(filePath, "utf-8") : "";
          writeFileSync(filePath, existing + content, "utf-8");
        } else {
          writeFileSync(filePath, content, "utf-8");
        }
        return { content: [{ type: "text", text: `Successfully wrote to ${filePath}` }] };
      }

      case "list_directory": {
        const dirPath = resolve(args?.path as string);
        const recursive = args?.recursive as boolean ?? false;

        const listDir = (p: string, depth = 0): string[] => {
          const entries = readdirSync(p);
          const result: string[] = [];
          for (const entry of entries) {
            const full = join(p, entry);
            const stat = statSync(full);
            const relPath = full.replace(dirPath + "/", "").replace(dirPath + "\\", "");
            const type = stat.isDirectory() ? "[dir]" : "[file]";
            result.push(`${type} ${relPath} (${stat.size} bytes)`);
            if (recursive && stat.isDirectory() && depth < 3) {
              result.push(...listDir(full, depth + 1));
            }
          }
          return result;
        };

        const entries = listDir(dirPath);
        return { content: [{ type: "text", text: entries.join("\n") || "(empty directory)" }] };
      }

      case "search_files": {
        const dirPath = resolve(args?.directory as string);
        const pattern = args?.pattern as string;
        const ext = args?.file_extension as string | undefined;
        const results: string[] = [];

        const search = (p: string) => {
          const entries = readdirSync(p);
          for (const entry of entries) {
            if (["node_modules", ".git", "dist", "build"].includes(entry)) continue;
            const full = join(p, entry);
            const stat = statSync(full);
            if (stat.isDirectory()) { search(full); continue; }
            if (ext && extname(entry) !== ext) continue;
            try {
              const content = readFileSync(full, "utf-8");
              const lines = content.split("\n");
              lines.forEach((line, i) => {
                if (line.includes(pattern)) {
                  results.push(`${full}:${i + 1}: ${line.trim()}`);
                }
              });
            } catch { /* binary file */ }
          }
        };

        search(dirPath);
        return {
          content: [{
            type: "text",
            text: results.length > 0
              ? results.slice(0, 200).join("\n")
              : `No matches for "${pattern}" in ${dirPath}`,
          }],
        };
      }

      case "read_many_files": {
        const paths = args?.paths as string[];
        const results: string[] = [];
        for (const p of paths) {
          const resolved = resolve(p);
          try {
            const content = readFileSync(resolved, "utf-8");
            results.push(`### ${resolved}\n\`\`\`\n${content}\n\`\`\``);
          } catch (e: any) {
            results.push(`### ${resolved}\n[Error: ${e.message}]`);
          }
        }
        return { content: [{ type: "text", text: results.join("\n\n") }] };
      }

      case "execute_command": {
        const command = args?.command as string;
        const cwd = (args?.cwd as string | undefined) || process.cwd();
        const timeout = (args?.timeout_ms as number | undefined) || 30000;
        const output = execSync(command, {
          cwd,
          timeout,
          encoding: "utf-8",
          env: { ...process.env, CLI_TOOL: "1" },
        });
        return { content: [{ type: "text", text: output || "(no output)" }] };
      }

      case "get_file_info": {
        const filePath = resolve(args?.path as string);
        if (!existsSync(filePath)) {
          return { isError: true, content: [{ type: "text", text: `Not found: ${filePath}` }] };
        }
        const stat = statSync(filePath);
        const info = {
          path: filePath,
          type: stat.isDirectory() ? "directory" : "file",
          size: stat.size,
          created: stat.birthtime.toISOString(),
          modified: stat.mtime.toISOString(),
          extension: extname(filePath),
        };
        return { content: [{ type: "text", text: JSON.stringify(info, null, 2) }] };
      }

      default:
        throw new Error(`Tool not found: ${name}`);
    }
  } catch (error: any) {
    return { isError: true, content: [{ type: "text", text: error.message }] };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("CLI Tool MCP Server running on stdio (7 tools available)");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
