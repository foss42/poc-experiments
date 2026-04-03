import chalk from 'chalk';
import { CommandContext } from '../types.js';

export async function setupGithubCommand(_args: string[], _ctx: CommandContext): Promise<void> {
  console.log(chalk.cyan.bold('\nGitHub Actions Setup:'));
  console.log('');
  console.log(chalk.white('This will configure GitHub Actions to use CLI Tool for:'));
  console.log('  • Triaging issues');
  console.log('  • Reviewing PRs');
  console.log('  • Running CI checks');
  console.log('');
  const url = 'https://github.com/armanraymagit/cli_tool/wiki/github-actions';
  console.log(chalk.cyan(`Opening guide: ${url}`));
  try {
    const open = (await import('open' as any)).default;
    await open(url);
  } catch { /* ignore */ }
}
