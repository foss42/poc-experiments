import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { readFileSync, writeFileSync } from "fs";
const server = new Server({
    name: "bro-server",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {},
    },
});
/**
 * Tool: read_file
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "read_file",
                description: "Read the contents of a local file",
                inputSchema: {
                    type: "object",
                    properties: {
                        path: { type: "string", description: "Path to the file" },
                    },
                    required: ["path"],
                },
            },
            {
                name: "write_file",
                description: "Write content to a local file",
                inputSchema: {
                    type: "object",
                    properties: {
                        path: { type: "string", description: "Path to the file" },
                        content: { type: "string", description: "Content to write" },
                    },
                    required: ["path", "content"],
                },
            },
        ],
    };
});
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    if (name === "read_file") {
        const filePath = args?.path;
        try {
            const content = readFileSync(filePath, "utf-8");
            return {
                content: [{ type: "text", text: content }],
            };
        }
        catch (error) {
            return {
                isError: true,
                content: [{ type: "text", text: error.message }],
            };
        }
    }
    if (name === "write_file") {
        const filePath = args?.path;
        const content = args?.content;
        try {
            writeFileSync(filePath, content, "utf-8");
            return {
                content: [{ type: "text", text: `Successfully wrote to ${filePath}` }],
            };
        }
        catch (error) {
            return {
                isError: true,
                content: [{ type: "text", text: error.message }],
            };
        }
    }
    throw new Error(`Tool not found: ${name}`);
});
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Bro MCP Server running on stdio");
}
main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});
