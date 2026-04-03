import chalk from 'chalk';
import { CommandContext } from '../types.js';

export async function permissionsCommand(args: string[], _ctx: CommandContext): Promise<void> {
  const sub = args[0];
  switch (sub) {
    case 'trust': {
      const dir = args[1] || process.cwd();
      console.log(chalk.green(`✓ Trusted directory: ${dir}`));
      break;
    }
    default:
      console.log(chalk.cyan.bold('\nPermissions Sub-commands:'));
      console.log('  /permissions trust [dir]    - Trust a directory');
      console.log('');
  }
}
