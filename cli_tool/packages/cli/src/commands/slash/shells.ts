import chalk from 'chalk';
import { CommandContext } from '../types.js';

const shells: Array<{ id: string; cmd: string; status: 'running' | 'done' | 'error' }> = [];
let shellsVisible = false;

export async function shellsCommand(_args: string[], _ctx: CommandContext): Promise<void> {
  shellsVisible = !shellsVisible;
  if (shellsVisible) {
    console.log(chalk.cyan.bold('\nBackground Shells:'));
    if (shells.length === 0) {
      console.log(chalk.gray('  (No background shells running)'));
    } else {
      shells.forEach(s => {
        const color = s.status === 'running' ? chalk.yellow : s.status === 'done' ? chalk.green : chalk.red;
        console.log(`  ${chalk.dim(s.id)} ${color(s.status.padEnd(8))} ${chalk.white(s.cmd)}`);
      });
    }
    console.log('');
  } else {
    console.log(chalk.gray('Background shells panel hidden.'));
  }
}
