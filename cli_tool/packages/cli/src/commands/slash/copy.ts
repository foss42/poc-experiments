import chalk from 'chalk';
import { CommandContext } from '../types.js';

export async function copyCommand(_args: string[], ctx: CommandContext): Promise<void> {
  const session = ctx.sessionManager.getCurrentSession();
  const messages = session?.messages || [];
  const lastAssistant = [...messages].reverse().find((m: any) => m.role === 'assistant');

  if (!lastAssistant) {
    console.log(chalk.red('No assistant output to copy.'));
    return;
  }

  try {
    const clipboardy = (await import('clipboardy' as any)).default;
    await clipboardy.write(lastAssistant.content);
    console.log(chalk.green('✓ Copied last output to clipboard'));
  } catch (err: any) {
    console.log(chalk.red(`Failed to copy: ${err.message}`));
    console.log(chalk.dim('Make sure clipboard tools are installed (xclip/pbcopy/clip)'));
  }
}
