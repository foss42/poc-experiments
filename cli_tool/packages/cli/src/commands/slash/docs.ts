import chalk from 'chalk';
import { CommandContext } from '../types.js';

export async function docsCommand(_args: string[], _ctx: CommandContext): Promise<void> {
  const url = 'https://modelcontextprotocol.io/llms.txt';
  console.log(chalk.cyan(`\nOpening documentation: ${url}`));
  try {
    const open = (await import('open' as any)).default;
    await open(url);
  } catch {
    console.log(chalk.yellow('Could not open browser. Visit: ') + chalk.underline(url));
  }
}
