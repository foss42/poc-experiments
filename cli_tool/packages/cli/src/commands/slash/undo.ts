import chalk from 'chalk';
import { CommandContext } from '../types.js';

export async function undoCommand(_args: string[], ctx: CommandContext): Promise<void> {
  const messages = ctx.sessionManager.getMessages();
  
  if (messages.length < 2) {
    console.log(chalk.yellow('Nothing to undo in this session.'));
    return;
  }

  // Find the last assistant message
  const lastIndex = messages.map(m => m.role).lastIndexOf('assistant');
  if (lastIndex === -1) {
    console.log(chalk.yellow('No AI responses to undo.'));
    return;
  }

  // Remove the last assistant message and its preceding user query
  let removedCount = 0;
  for (let i = messages.length - 1; i >= lastIndex - 1; i--) {
     if (i >= 0) removedCount++;
  }
  
  const newMessages = messages.slice(0, Math.max(0, lastIndex - 1));
  
  // Actually update session manager internals
  ctx.sessionManager.clearMessages();
  for (const m of newMessages) {
     ctx.sessionManager.addMessage(m);
  }

  console.log(chalk.green(`✓ Undid the last interaction (${removedCount} messages removed).`));
  console.log(chalk.dim('Any file snapshots created during that action should ideally be restored here.'));
}
