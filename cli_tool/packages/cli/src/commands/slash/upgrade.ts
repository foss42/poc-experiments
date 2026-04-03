import chalk from 'chalk';
import { CommandContext } from '../types.js';

export async function upgradeCommand(_args: string[], _ctx: CommandContext): Promise<void> {
  const url = 'https://github.com/armanraymagit/cli_tool/releases';
  console.log(chalk.cyan(`\nOpening upgrade page: ${url}`));
  try {
    const open = (await import('open' as any)).default;
    await open(url);
  } catch {
    console.log(chalk.yellow('Could not open browser. Visit: ') + chalk.underline(url));
  }
}
