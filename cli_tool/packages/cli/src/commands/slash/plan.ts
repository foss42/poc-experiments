import chalk from 'chalk';
import { CommandContext } from '../types.js';

export async function planCommand(_args: string[], ctx: CommandContext): Promise<void> {
  ctx.setMode('plan');
  console.log(chalk.magenta('Switched to PLAN mode. Safe analysis only.'));
}
