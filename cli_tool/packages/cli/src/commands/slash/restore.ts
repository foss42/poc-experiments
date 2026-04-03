import chalk from 'chalk';
import { CommandContext } from '../types.js';

export async function restoreCommand(args: string[], ctx: CommandContext): Promise<void> {
  const toolCallId = args[0];
  if (!toolCallId) {
    console.log(chalk.cyan.bold('\nAvailable Restore Points:'));
    const msgs = ctx.sessionManager.getMessages();
    const toolCalls = msgs.filter(m => m.toolCalls && m.toolCalls.length > 0);
    if (toolCalls.length === 0) {
      console.log(chalk.gray('  (No tool executions in session to restore from)'));
    } else {
      toolCalls.forEach((m, i) => {
        m.toolCalls?.forEach(tc => {
          console.log(`  ${chalk.green(tc.id)}  ${chalk.white(tc.name)}`);
        });
      });
    }
    console.log('');
    console.log(chalk.dim('Usage: /restore <tool_call_id>'));
    return;
  }
  console.log(chalk.yellow(`Restore to checkpoint: ${toolCallId}`));
  console.log(chalk.dim('Full file-level checkpointing requires additional configuration.'));
}
