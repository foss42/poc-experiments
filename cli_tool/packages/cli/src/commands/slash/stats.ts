import chalk from 'chalk';
import { CommandContext } from '../types.js';

const sessionStart = Date.now();

export async function statsCommand(args: string[], ctx: CommandContext): Promise<void> {
  const sub = args[0] || 'session';

  switch (sub) {
    case 'session': {
      const msgs = ctx.sessionManager.getMessages();
      const durationMs = Date.now() - sessionStart;
      const mins = Math.floor(durationMs / 60000);
      const secs = Math.floor((durationMs % 60000) / 1000);
      console.log(chalk.cyan.bold('\nSession Statistics:\n'));
      console.log(`  Duration:       ${chalk.white(`${mins}m ${secs}s`)}`);
      console.log(`  Messages:       ${chalk.white(String(msgs.length))}`);
      console.log(`  User messages:  ${chalk.white(String(msgs.filter(m => m.role === 'user').length))}`);
      console.log(`  AI responses:   ${chalk.white(String(msgs.filter(m => m.role === 'assistant').length))}`);
      console.log('');
      break;
    }
    case 'model': {
      const { llm } = ctx.config;
      console.log(chalk.cyan.bold('\nModel Statistics:\n'));
      console.log(`  Provider:  ${chalk.white(llm.provider)}`);
      console.log(`  Model:     ${chalk.white(llm.model)}`);
      console.log(`  API Key:   ${llm.apiKey ? chalk.green('configured') : chalk.red('not set')}`);
      console.log('');
      break;
    }
    case 'tools': {
      const tools = ctx.mcpClient ? await ctx.mcpClient.listTools() : [];
      console.log(chalk.cyan.bold('\nTool Statistics:\n'));
      console.log(`  Total tools: ${chalk.white(String(tools.length))}`);
      const byServer: Record<string, number> = {};
      tools.forEach(t => { byServer[t.server] = (byServer[t.server] || 0) + 1; });
      Object.entries(byServer).forEach(([server, count]) => {
        console.log(`  ${chalk.white(server)}: ${count} tools`);
      });
      console.log('');
      break;
    }
    default:
      console.log(chalk.cyan.bold('\nStats Sub-commands:'));
      console.log('  /stats session  - Session usage statistics');
      console.log('  /stats model    - Model info and quota');
      console.log('  /stats tools    - Tool usage statistics');
      console.log('');
  }
}
