import chalk from 'chalk';
import { CommandContext } from '../types.js';

export async function bugCommand(args: string[], _ctx: CommandContext): Promise<void> {
  const title = args.join(' ') || 'Bug report';
  const encoded = encodeURIComponent(title);
  const url = `https://github.com/armanraymagit/cli_tool/issues/new?title=${encoded}&labels=bug`;
  console.log(chalk.cyan(`\nOpening bug report: ${url}`));
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const open = (await import('open' as any)).default;
    await open(url);
  } catch {
    console.log(chalk.yellow('Could not open browser. Please visit the URL above manually.'));
  }
}
