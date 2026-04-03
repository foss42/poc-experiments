import chalk from 'chalk';
import { CommandContext } from '../types.js';

export async function editorCommand(_args: string[], ctx: CommandContext): Promise<void> {
  const current = ctx.config.editor || 'nano';
  console.log('');
  console.log(chalk.cyan.bold('Select Editor:'));
  console.log('');
  const editors = ['nano', 'vim', 'nvim', 'code', 'cursor', 'windsurf'];
  editors.forEach((e, i) => {
    const marker = e === current ? chalk.green(' ✓') : '  ';
    console.log(`${marker} ${chalk.white(String(i + 1))}. ${e}`);
  });
  console.log('');
  console.log(chalk.dim('To change editor: /settings editor <name>'));
  console.log('');
}
