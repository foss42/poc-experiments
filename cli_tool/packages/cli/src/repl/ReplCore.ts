import { createInterface } from 'readline';
import chalk from 'chalk';
import { CommandParser } from './CommandParser.js';
import { SessionManager } from './SessionManager.js';
import { CommandType, Config } from '../types/index.js';
import { LlmService } from '../services/LlmService.js';
import { McpClientService } from '../services/McpClientService.js';
import { MemoryService } from '../services/MemoryService.js';
import { ToolService, CoreToolsDefinition } from '../services/ToolService.js';
import { UIService } from '../services/UIService.js';

/**
 * Main REPL loop with stdin/stdout handling
 */
export class ReplCore {
  private rl: ReturnType<typeof createInterface>;
  private commandParser: CommandParser;
  private sessionManager: SessionManager;
  private config: Config;
  private isRunning = false;
  private continuationBuffer: string[] = [];
  private llmService: LlmService;
  private mcpClient?: McpClientService;
  private memoryService: MemoryService;
  private toolService: ToolService;
  private uiService: UIService;
  private mode: 'plan' | 'build' = 'build';

  constructor(config: Config, projectPath?: string) {
    this.config = config;
    this.commandParser = new CommandParser();
    this.sessionManager = new SessionManager(projectPath);
    this.llmService = new LlmService(config.llm);
    this.memoryService = new MemoryService(projectPath);
    this.toolService = new ToolService(projectPath || process.cwd());
    this.uiService = new UIService(config.theme as any || 'default', config.vimMode);

    // Initialize MCP client if servers are configured
    if (config.mcp?.servers?.length) {
      this.mcpClient = new McpClientService(config.mcp.servers);
    }

    this.rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  /**
   * Start the REPL
   */
  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    this.displayWelcome();

    // Connect MCP servers in background
    if (this.mcpClient) {
      this.mcpClient.connect().catch(() => { /* ignore connection errors at startup */ });
    }

    // Resume last session if exists
    const sessions = this.sessionManager.listSessions();
    if (sessions.length > 0) {
      const lastSession = this.sessionManager.loadSession(sessions[0].id);
      if (lastSession) {
        this.sessionManager.setCurrentSession(lastSession);
      }
    }

    await this.mainLoop();
  }

  /**
   * Display welcome banner
   */
  private displayWelcome(): void {
    const theme = this.config.theme || 'default';
    const color = chalk.cyan;
    console.log('');
    console.log(color.bold('╭──────────────────────────────────────────────────────────────╮'));
    console.log(color.bold('│') + '  ' + chalk.cyan.bold('🚀 CLI Tool') + chalk.white.bold(' - The Agentic API CLI               ') + color.bold('│'));
    console.log(color.bold('│') + '                                                              ' + color.bold('│'));
    console.log(color.bold('│') + '  ' + chalk.gray('Type ') + chalk.cyan('/help') + chalk.gray(' for commands  ') + chalk.yellow('!cmd') + chalk.gray(' for shell  ') + chalk.green('@file') + chalk.gray(' for context') + '  ' + color.bold('│'));
    console.log(color.bold('│') + '  ' + chalk.gray('Provider: ') + chalk.white(this.config.llm.provider) + chalk.gray('  Model: ') + chalk.white(this.config.llm.model) + chalk.gray(' '.repeat(Math.max(0, 30 - this.config.llm.model.length))) + color.bold('│'));
    console.log(color.bold('╰──────────────────────────────────────────────────────────────╯'));
    console.log('');

    if (!this.config.llm.apiKey && this.config.llm.provider !== 'ollama') {
      console.log(chalk.yellow('⚠  No API key configured. Run: ') + chalk.cyan('cli-tool config --init'));
      console.log(chalk.dim('   Or set llm.apiKey in ~/.cli-tool/config.json'));
      console.log('');
    }
  }

  /**
   * Main REPL loop
   */
  private async mainLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        const input = await this.readLine();
        if (input === null) {
          await this.quit();
          break;
        }

        // Handle continuation lines
        if (this.continuationBuffer.length > 0) {
          if (input.trim() === '') {
            const fullInput = this.continuationBuffer.join('\n');
            this.continuationBuffer = [];
            await this.processInput(fullInput);
          } else {
            this.continuationBuffer.push(input);
          }
          continue;
        }

        // Check for continuation (ends with backslash)
        if (input.trim().endsWith('\\')) {
          this.continuationBuffer.push(input.trim().slice(0, -1));
          continue;
        }

        await this.processInput(input);
      } catch (error: any) {
        console.error(chalk.red('Error:'), error?.message || error);
      }
    }
  }

  /**
   * Read a line from stdin
   */
  private readLine(): Promise<string | null> {
    return new Promise((resolve) => {
      const prompt = this.getPrompt();
      this.rl.question(prompt, (input) => {
        resolve(input);
      });
      this.rl.once('close', () => resolve(null));
    });
  }

  /**
   * Get the current prompt
   */
  private getPrompt(): string {
    const session = this.sessionManager.getCurrentSession();
    const sessionName = session ? chalk.cyan(session.name) : chalk.gray('new');
    const modeIndicator = this.mode === 'plan' ? chalk.magenta.bold('[PLAN] ') : '';
    const vimIndicator = this.config.vimMode ? chalk.yellow('[N] ') : '';
    return `${modeIndicator}${vimIndicator}${chalk.green.bold('cli-tool')} ${chalk.dim('(')}${sessionName}${chalk.dim(')')} ${chalk.dim('❯')} `;
  }

  /**
   * Process input and dispatch to appropriate handler
   */
  private async processInput(input: string): Promise<void> {
    const trimmed = input.trim();
    if (!trimmed) return;

    const parsed = this.commandParser.parse(trimmed);

    switch (parsed.type) {
      case 'slash':
        await this.handleSlashCommand(parsed.command, parsed.args);
        break;
      case 'at':
        await this.handleAtCommand(parsed.command);
        break;
      case 'shell':
        await this.handleShellCommand(parsed.command, parsed.args);
        break;
      case 'query':
        await this.handleQuery(parsed.command);
        break;
    }
  }

  /**
   * Build the command context
   */
  private buildContext() {
    return {
      config: this.config,
      sessionManager: this.sessionManager,
      mcpClient: this.mcpClient,
      llmService: this.llmService,
      mode: this.mode,
      setMode: (mode: 'plan' | 'build') => { this.mode = mode; },
    };
  }

  /**
   * Handle slash commands
   */
  private async handleSlashCommand(command: string, args: string[]): Promise<void> {
    const { slashCommands } = await import('../commands/index.js');

    if (command === 'quit' || command === 'exit') {
      await this.quit();
      return;
    }

    if (command === 'clear') {
      console.clear();
      this.displayWelcome();
      return;
    }

    if (command === 'help' || command === '?') {
      const { helpCommand } = await import('../commands/slash/help.js');
      await helpCommand(args, this.buildContext());
      return;
    }

    if (command === 'about') {
      const { aboutCommand } = await import('../commands/slash/about.js');
      await aboutCommand(args, this.buildContext());
      return;
    }

    // Dispatch to registered handler
    const handler = slashCommands[command];
    if (handler) {
      try {
        await handler(args, this.buildContext());
      } catch (error: any) {
        console.error(chalk.red(`Command error: ${error?.message || error}`));
      }
    } else {
      // Try prefix matching
      const allCmds = Object.keys(slashCommands);
      const matches = allCmds.filter(c => c.startsWith(command));
      if (matches.length === 1) {
        await slashCommands[matches[0]](args, this.buildContext());
      } else if (matches.length > 1) {
        console.log(chalk.yellow(`Ambiguous command: /${command}`));
        console.log(chalk.gray('Matches: ' + matches.map(m => '/' + m).join(', ')));
      } else {
        console.log(chalk.yellow(`Unknown command: /${command}`));
        console.log(chalk.gray('Type /help for available commands'));
      }
    }
  }

  /**
   * Handle at commands (file injection)
   */
  private async handleAtCommand(rawPath: string): Promise<void> {
    const { injectFileContent, parsePathWithRange } = await import('../commands/at/file-injector.js');
    const { path, lineRange } = parsePathWithRange(rawPath);
    try {
      const content = await injectFileContent(path, lineRange);
      console.log(chalk.dim('─── ') + chalk.cyan('@' + path) + chalk.dim(' ─────'));
      console.log(content);
      console.log(chalk.dim('─'.repeat(Math.min(path.length + 16, 80))));
      this.sessionManager.addMessage({
        role: 'system',
        content: `File context [${path}]:\n${content}`,
      });
      console.log(chalk.dim('  ↑ Injected into context'));
    } catch (error: any) {
      console.error(chalk.red(`@${rawPath}: ${error?.message}`));
    }
  }

  /**
   * Handle shell commands
   */
  private async handleShellCommand(command: string, args: string[]): Promise<void> {
    const { executeShell } = await import('../commands/shell/executor.js');
    try {
      const fullCommand = [command, ...args].join(' ');
      await executeShell(fullCommand);
    } catch (error: any) {
      console.error(chalk.red(`Shell error: ${error?.message}`));
    }
  }

  /**
   * Handle AI queries
   */
  private async handleQuery(query: string): Promise<void> {
    this.sessionManager.addMessage({ role: 'user', content: query });

    if (!this.llmService.isConfigured()) {
      console.log('');
      console.log(chalk.yellow('⚠  LLM not configured. Set your API key:'));
      console.log(chalk.dim('   Edit ~/.cli-tool/config.json and set llm.apiKey'));
      console.log(chalk.dim('   Or run: /settings llm.apiKey YOUR_KEY'));
      console.log('');
      return;
    }

    const spinner = this.uiService.createSpinner('Thinking...').start();
    try {
      const messages = this.sessionManager.getMessages();
      const memoryContext = await this.memoryService.loadMemory();
      
      let finalMessages = messages;
      
      let baseSystemMsg = `You are a helpful, technical AI assistant.
- If the user says "hey", "hello", or similar, just say hi back!
- In PLAN MODE, only provide a plan if there's a task.
- In BUILD MODE, use tools only for technical work.
- Be concise and friendly.
Current Mode: ${this.mode.toUpperCase()}\n\n`;




      const existingSystem = messages.find(m => m.role === 'system');

      if (memoryContext) {
        baseSystemMsg += `Project Context:\n${memoryContext}`;
      }

      if (existingSystem) {
        finalMessages = messages.map(m => 
          m === existingSystem ? { ...m, content: `${m.content}\n\n${baseSystemMsg}` } : m
        );
      } else {
        finalMessages = [
          { role: 'system', content: baseSystemMsg },
          ...messages
        ];
      }

      let tools: any[] | undefined = undefined;
      let toolHandler: ((name: string, args: any) => Promise<string>) | undefined = undefined;

      if (this.mode === 'build') {
        tools = CoreToolsDefinition;
        toolHandler = async (name: string, args: any) => {
          console.log(chalk.yellow(`\n⚡ Tool execution: ${name}`));
          return this.toolService.executeTool(name, args);
        };
      }

      const response = await this.llmService.chat(finalMessages, tools, toolHandler);

      spinner.stop();
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);

      console.log('');
      console.log(chalk.cyan.bold('CLI Tool:'));
      console.log(this.uiService.renderMarkdown(response));

      this.sessionManager.addMessage({ role: 'assistant', content: response });
    } catch (error: any) {
      spinner.fail('Error');
      console.error(chalk.red(`LLM error: ${error?.message || error}`));
    }
  }

  /**
   * Quit the REPL
   */
  private async quit(): Promise<void> {
    this.isRunning = false;
    if (this.mcpClient) await this.mcpClient.disconnect().catch(() => {});
    if (this.toolService) await this.toolService.cleanup().catch(() => {});
    this.rl.close();
    console.log('');
    console.log(chalk.green('👋 Goodbye!'));
  }

  getConfig(): Config { return this.config; }
  getSessionManager(): SessionManager { return this.sessionManager; }
}