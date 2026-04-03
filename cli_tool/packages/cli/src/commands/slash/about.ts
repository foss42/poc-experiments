import chalk from 'chalk';
import { CommandContext } from '../types.js';

export async function aboutCommand(_args: string[], _ctx: CommandContext): Promise<void> {
  console.log('');
  console.log(chalk.cyan.bold('  ╔══════════════════════════════════════╗'));
  console.log(chalk.cyan.bold('  ║') + chalk.white.bold('          CLI Tool v1.0.0              ') + chalk.cyan.bold('║'));
  console.log(chalk.cyan.bold('  ║') + chalk.gray('  Your Intelligent Assistant           ') + chalk.cyan.bold('║'));
  console.log(chalk.cyan.bold('  ╚══════════════════════════════════════╝'));
  console.log('');
  console.log(chalk.white.bold('Features:'));
  console.log('  ' + chalk.green('✓') + ' Interactive REPL with session management');
  console.log('  ' + chalk.green('✓') + ' MCP client integration');
  console.log('  ' + chalk.green('✓') + ' Configurable LLM providers (OpenAI/Anthropic/Custom)');
  console.log('  ' + chalk.green('✓') + ' File operations via @path');
  console.log('  ' + chalk.green('✓') + ' Shell commands via !cmd');
  console.log('  ' + chalk.green('✓') + ' Hierarchical memory via CLI-TOOL.md');
  console.log('  ' + chalk.green('✓') + ' Extensions, Skills, Hooks, Agents');
  console.log('');
  console.log(chalk.dim('Built with love using TypeScript + MCP SDK'));
  console.log(chalk.dim('GitHub: https://github.com/armanraymagit/cli_tool'));
  console.log('');
}
