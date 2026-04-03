import chalk from 'chalk';
import { CommandContext } from '../types.js';

export async function policiesCommand(args: string[], _ctx: CommandContext): Promise<void> {
  const sub = args[0];
  switch (sub) {
    case 'list':
    default:
      console.log(chalk.cyan.bold('\nActive Policies:\n'));
      console.log('  ' + chalk.white.bold('Shell Execution') + '  ' + chalk.green('allowed'));
      console.log('  ' + chalk.white.bold('File Read      ') + '  ' + chalk.green('allowed'));
      console.log('  ' + chalk.white.bold('File Write     ') + '  ' + chalk.green('allowed'));
      console.log('  ' + chalk.white.bold('Network Access') + '   ' + chalk.green('allowed'));
      console.log('');
  }
}
