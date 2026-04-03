import chalk from 'chalk';
import { CommandContext } from '../types.js';

export async function buildCommand(_args: string[], ctx: CommandContext): Promise<void> {
  ctx.setMode('build');
  console.log(chalk.green('Switched to BUILD mode. Changes will be executed.'));
}
