import chalk from 'chalk';
import { CommandContext } from '../types.js';

export async function terminalSetupCommand(_args: string[], _ctx: CommandContext): Promise<void> {
  console.log(chalk.cyan.bold('\nTerminal Keybinding Setup:\n'));
  console.log(chalk.white.bold('VS Code / Cursor / Windsurf:'));
  console.log(chalk.gray('  Add to keybindings.json:'));
  console.log(chalk.dim(`  {
    "key": "ctrl+enter",
    "command": "workbench.action.terminal.sendSequence",
    "args": { "text": "\\n" }
  }`));
  console.log('');
  console.log(chalk.white.bold('Multiline Input:'));
  console.log('  Append \\ at line end to continue input on the next line.');
  console.log('  Send empty line to submit multiline input.');
  console.log('');
}
