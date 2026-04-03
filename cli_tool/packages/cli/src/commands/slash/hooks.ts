import chalk from 'chalk';
import { CommandContext } from '../types.js';

const hooks: Array<{ name: string; event: string; enabled: boolean }> = [];

export async function hooksCommand(args: string[], _ctx: CommandContext): Promise<void> {
  const sub = args[0];
  switch (sub) {
    case 'list':
    case 'show':
    case 'panel':
      console.log(chalk.cyan.bold('\nRegistered Hooks:'));
      if (hooks.length === 0) console.log(chalk.gray('  (No hooks registered)'));
      hooks.forEach(h => {
        const status = h.enabled ? chalk.green('enabled') : chalk.red('disabled');
        console.log(`  ${chalk.white(h.name.padEnd(20))} ${chalk.dim(h.event.padEnd(20))} ${status}`);
      });
      console.log('');
      break;
    case 'enable-all':
      hooks.forEach(h => h.enabled = true);
      console.log(chalk.green('✓ All hooks enabled'));
      break;
    case 'disable-all':
      hooks.forEach(h => h.enabled = false);
      console.log(chalk.green('✓ All hooks disabled'));
      break;
    case 'enable':
      if (!args[1]) { console.log(chalk.red('Usage: /hooks enable <name>')); return; }
      const eh = hooks.find(h => h.name === args[1]);
      if (eh) { eh.enabled = true; console.log(chalk.green(`✓ Hook enabled: ${args[1]}`)); }
      else console.log(chalk.red(`Hook not found: ${args[1]}`));
      break;
    case 'disable':
      if (!args[1]) { console.log(chalk.red('Usage: /hooks disable <name>')); return; }
      const dh = hooks.find(h => h.name === args[1]);
      if (dh) { dh.enabled = false; console.log(chalk.green(`✓ Hook disabled: ${args[1]}`)); }
      else console.log(chalk.red(`Hook not found: ${args[1]}`));
      break;
    default:
      console.log(chalk.cyan.bold('\nHooks Sub-commands:'));
      console.log('  /hooks list                 - Show all hooks');
      console.log('  /hooks enable-all           - Enable all hooks');
      console.log('  /hooks disable-all          - Disable all hooks');
      console.log('  /hooks enable <name>        - Enable a hook');
      console.log('  /hooks disable <name>       - Disable a hook');
      console.log('');
  }
}
