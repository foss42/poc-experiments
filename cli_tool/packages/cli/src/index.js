#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { ListToolsResultSchema } from "@modelcontextprotocol/sdk/types.js";
import { join } from "path";
const program = new Command();
program
    .name("bro")
    .description("Powerful CLI tool integrated with MCP")
    .version("1.0.0");
program
    .command("chat")
    .description("Start an interactive chat session with MCP context")
    .action(async () => {
    console.log(chalk.blue("Initializing Bro Chat..."));
    // In a real app, this would start the server or connect to a running one
    const transport = new StdioClientTransport({
        command: "node",
        args: [join(import.meta.dirname, "..", "..", "server", "dist", "index.js")],
    });
    const client = new Client({
        name: "bro-cli-client",
        version: "1.0.0",
    }, {
        capabilities: {},
    });
    try {
        await client.connect(transport);
        console.log(chalk.green("Connected to Bro MCP Server."));
        const tools = await client.request({ method: "tools/list" }, ListToolsResultSchema);
        console.log(chalk.yellow("Available context tools:"));
        tools.tools.forEach((tool) => {
            console.log(` - ${chalk.cyan(tool.name)}: ${tool.description}`);
        });
        console.log(chalk.gray("\nInteractive chat mode coming soon (requires LLM API key)."));
    }
    catch (error) {
        console.error(chalk.red("Failed to connect to MCP server:"), error);
    }
});
program
    .command("config")
    .description("Manage CLI configuration")
    .action(() => {
    console.log(chalk.blue("Config management:"));
    console.log("Use environment variables for now: BRO_API_KEY");
});
program.parse();
