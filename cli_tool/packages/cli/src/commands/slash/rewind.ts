import chalk from 'chalk';
import { CommandContext } from '../types.js';

export async function rewindCommand(_args: string[], ctx: CommandContext): Promise<void> {
  const msgs = ctx.sessionManager.getMessages();
  if (msgs.length === 0) {
    console.log(chalk.gray('\nNo messages to rewind to.\n'));
    return;
  }

  console.log(chalk.cyan.bold('\nRewind History:\n'));
  msgs.slice(-10).forEach((m, i) => {
    const role = m.role === 'user' ? chalk.green('USER') : chalk.cyan('BOT ');
    const preview = m.content.slice(0, 60) + (m.content.length > 60 ? '...' : '');
    console.log(`  ${chalk.dim(String(i + 1).padStart(2))}. [${role}] ${chalk.white(preview)}`);
  });

  console.log('');
  console.log(chalk.dim('Interactive rewind: press Esc twice to activate'));
}
