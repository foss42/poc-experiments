#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import { ReplCore } from "./repl/ReplCore.js";
import { ConfigService } from "./services/ConfigService.js";

const program = new Command();

program
  .name("cli-tool")
  .description("CLI Tool - Agentic API CLI")
  .version("1.0.0");

program
  .command("chat")
  .description("Start an interactive chat session")
  .option("-p, --project <path>", "Project path", process.cwd())
  .action(async (options) => {
    const configService = new ConfigService();
    const config = await configService.loadConfig();

    const repl = new ReplCore(config, options.project);
    await repl.start();
  });

program
  .command("repl")
  .description("Start the REPL (default)")
  .option("-p, --project <path>", "Project path", process.cwd())
  .action(async (options) => {
    const configService = new ConfigService();
    const config = await configService.loadConfig();

    const repl = new ReplCore(config, options.project);
    await repl.start();
  });

program
  .command("init")
  .description("Initialize project context (CLI-TOOL.md) in current directory")
  .action(async () => {
    const { MemoryService } = await import("./services/MemoryService.js");
    const memory = new MemoryService(process.cwd());
    await memory.initCliToolMd(process.cwd());
    console.log(chalk.green("Created CLI-TOOL.md in current directory"));
  });

program
  .command("config")
  .description("Manage CLI configuration")
  .option("--show", "Show current configuration")
  .option("--init", "Initialize configuration")
  .action(async (options) => {
    const configService = new ConfigService();

    if (options.init) {
      await configService.initializeConfig();
      console.log(chalk.green("Configuration initialized at ~/.cli-tool/config.json"));
    } else if (options.show) {
      const config = await configService.loadConfig();
      console.log(JSON.stringify(config, null, 2));
    } else {
      console.log(chalk.blue("Config management:"));
      console.log("  cli-tool config --init   Initialize configuration");
      console.log("  cli-tool config --show   Show current configuration");
    }
  });

// Default to REPL if no command is provided
program.action(async () => {
  const configService = new ConfigService();
  const config = await configService.loadConfig();

  const repl = new ReplCore(config, process.cwd());
  await repl.start();
});

program.parse(process.argv);