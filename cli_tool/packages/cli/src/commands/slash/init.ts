import chalk from 'chalk';
import { CommandContext } from '../types.js';

export async function initCommand(_args: string[], _ctx: CommandContext): Promise<void> {
  const { MemoryService } = await import('../../services/MemoryService.js');
  const memory = new MemoryService(process.cwd());
  await memory.initCliToolMd(process.cwd());
  console.log(chalk.green('Initialized CLI-TOOL.md in current directory'));
  console.log(chalk.dim('  Edit this file to provide project context to your AI assistant.'));
}
