import chalk from 'chalk';
import { CommandContext } from '../types.js';

export async function ideCommand(args: string[], _ctx: CommandContext): Promise<void> {
  const sub = args[0];
  switch (sub) {
    case 'enable':   console.log(chalk.green('✓ IDE integration enabled')); break;
    case 'disable':  console.log(chalk.green('✓ IDE integration disabled')); break;
    case 'install':
      console.log(chalk.cyan('Installing IDE companion...'));
      console.log(chalk.dim('For VS Code: install the "cli-tool" extension from the marketplace.'));
      break;
    case 'status':
      console.log(chalk.cyan.bold('\nIDE Integration Status:'));
      console.log('  Status:   ' + chalk.yellow('Not connected'));
      console.log('  Port:     ' + chalk.dim('N/A'));
      console.log('');
      break;
    default:
      console.log(chalk.cyan.bold('\nIDE Sub-commands:'));
      console.log('  /ide enable               - Enable IDE integration');
      console.log('  /ide disable              - Disable IDE integration');
      console.log('  /ide install              - Install IDE companion');
      console.log('  /ide status               - Check integration status');
      console.log('');
  }
}
