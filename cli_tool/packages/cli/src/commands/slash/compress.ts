import chalk from 'chalk';
import { CommandContext } from '../types.js';

export async function compressCommand(_args: string[], ctx: CommandContext): Promise<void> {
  const msgs = ctx.sessionManager.getMessages();
  if (msgs.length === 0) {
    console.log(chalk.gray('\nNo context to compress.\n'));
    return;
  }
  console.log(chalk.cyan('Compressing context...'));
  const summary = `[Context compressed: ${msgs.length} messages summarized. Topics covered: ${
    msgs.filter(m => m.role === 'user').slice(-3).map(m => m.content.slice(0, 30)).join(', ')
  }...]`;
  ctx.sessionManager.clearMessages();
  ctx.sessionManager.addMessage({ role: 'system', content: summary });
  console.log(chalk.green('✓ Context compressed. Summary retained.'));
}
