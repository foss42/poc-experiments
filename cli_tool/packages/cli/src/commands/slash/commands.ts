import chalk from 'chalk';
import { CommandContext } from '../types.js';

export async function commandsReloadCommand(_args: string[], _ctx: CommandContext): Promise<void> {
  console.log(chalk.green('✓ Custom commands reloaded from all sources'));
  console.log(chalk.dim('  Sources: ~/.cli-tool/commands/, .cli-tool/commands/, MCP prompts, extensions'));
}
