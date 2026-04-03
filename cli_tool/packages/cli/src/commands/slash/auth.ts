import chalk from 'chalk';
import { CommandContext } from '../types.js';

export async function authCommand(args: string[], ctx: CommandContext): Promise<void> {
  console.log('');
  console.log(chalk.cyan.bold('Authentication Methods:'));
  console.log('');
  console.log('  ' + chalk.green('1.') + ' API Key (current)');
  console.log('  ' + chalk.white('2.') + ' OAuth 2.0');
  console.log('  ' + chalk.white('3.') + ' Custom Token');
  console.log('');
  console.log(chalk.dim('Configure your API key in ~/.cli-tool/config.json under llm.apiKey'));
  console.log('');
}
