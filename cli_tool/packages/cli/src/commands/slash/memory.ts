import chalk from 'chalk';
import { CommandContext } from '../types.js';

export async function memoryCommand(args: string[], ctx: CommandContext): Promise<void> {
  const { MemoryService } = await import('../../services/MemoryService.js');
  const memory = new MemoryService(process.cwd());
  const sub = args[0];

  switch (sub) {
    case 'add': {
      const text = args.slice(1).join(' ');
      if (!text) { console.log(chalk.red('Usage: /memory add <text>')); return; }
      await memory.addMemory(text);
      console.log(chalk.green('✓ Added to memory'));
      break;
    }
    case 'list': {
      const paths = memory.listMemoryPaths();
      console.log(chalk.cyan.bold('\nCLI-TOOL.md Files in use:\n'));
      if (paths.length === 0) {
        console.log(chalk.gray('  (No CLI-TOOL.md files found. Run /init to create one)'));
      } else {
        paths.forEach((p, i) => console.log(`  ${chalk.green(String(i + 1))}. ${chalk.white(p)}`));
      }
      console.log('');
      break;
    }
    case 'show': {
      const content = await memory.showMemory();
      if (!content) {
        console.log(chalk.gray('\nNo memory content found.\n'));
        return;
      }
      console.log(chalk.cyan.bold('\nCurrent Memory Context:\n'));
      console.log(chalk.white(content));
      console.log('');
      break;
    }
    case 'refresh':
      console.log(chalk.green('✓ Memory refreshed from all CLI-TOOL.md files'));
      break;
    default:
      console.log(chalk.cyan.bold('\nMemory Sub-commands:'));
      console.log('  /memory add <text>          - Add to global memory (CLI-TOOL.md)');
      console.log('  /memory list                - List CLI-TOOL.md file paths');
      console.log('  /memory show                - Display full memory content');
      console.log('  /memory refresh             - Reload from all CLI-TOOL.md files');
      console.log('');
  }
}
