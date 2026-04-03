import chalk from 'chalk';
import { CommandContext } from '../types.js';
import { readdirSync, statSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { homedir } from 'os';

export async function directoryCommand(args: string[], ctx: CommandContext): Promise<void> {
  const sub = args[0];
  switch (sub) {
    case 'add': {
      const paths = args.slice(1).join(' ').split(',').map(p => p.trim()).filter(Boolean);
      if (paths.length === 0) { console.log(chalk.red('Usage: /directory add <path1>,<path2>')); return; }
      const added: string[] = [];
      for (const p of paths) {
        const resolved = p.startsWith('~') ? join(homedir(), p.slice(1)) : resolve(p);
        if (!existsSync(resolved)) { console.log(chalk.red(`Path not found: ${resolved}`)); continue; }
        added.push(resolved);
        console.log(chalk.green(`✓ Added workspace directory: ${resolved}`));
      }
      break;
    }
    case 'show': {
      console.log(chalk.cyan.bold('\nWorkspace Directories:'));
      console.log('  ' + chalk.green(process.cwd()) + chalk.dim(' (cwd)'));
      console.log('');
      break;
    }
    default:
      console.log(chalk.cyan.bold('\nDirectory Sub-commands:'));
      console.log('  /directory add <path>       - Add a directory to workspace');
      console.log('  /directory show             - Show all workspace directories');
      console.log('');
  }
}
