import chalk from 'chalk';
import { CommandContext } from '../types.js';

export async function privacyCommand(_args: string[], _ctx: CommandContext): Promise<void> {
  console.log('');
  console.log(chalk.cyan.bold('Privacy Notice'));
  console.log(chalk.dim('─'.repeat(50)));
  console.log('');
  console.log(chalk.white('CLI Tool sends your queries to the configured LLM provider'));
  console.log(chalk.white('(OpenAI, Anthropic, or a custom provider).'));
  console.log('');
  console.log(chalk.white('Data stored locally:'));
  console.log('  • Session histories at ~/.cli-tool/sessions/');
  console.log('  • Configuration at ~/.cli-tool/config.json');
  console.log('  • Memory context in CLI-TOOL.md files');
  console.log('');
  console.log(chalk.white('Your API keys are stored locally in ~/.cli-tool/config.json only.'));
  console.log(chalk.dim('We do not collect telemetry or usage data.'));
  console.log('');
}
