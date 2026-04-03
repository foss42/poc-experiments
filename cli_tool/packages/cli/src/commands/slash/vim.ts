import chalk from 'chalk';
import { CommandContext } from '../types.js';

export async function vimCommand(_args: string[], ctx: CommandContext): Promise<void> {
  ctx.config.vimMode = !ctx.config.vimMode;
  const mode = ctx.config.vimMode;
  if (mode) {
    console.log(chalk.yellow.bold('\n[VIM MODE ENABLED]'));
    console.log(chalk.gray('  Normal mode: navigate with h,j,k,l'));
    console.log(chalk.gray('  Insert with i, a, o; escape to return to Normal'));
    console.log(chalk.gray('  Delete with x/dd/dw; change with c/cc/cw'));
    console.log(chalk.gray('  Use . to repeat last command'));
    console.log('');
  } else {
    console.log(chalk.gray('\n[Vim mode disabled]\n'));
  }
  // Persist
  const { ConfigService } = await import('../../services/ConfigService.js');
  const cs = new ConfigService();
  await cs.saveConfig(ctx.config);
}
