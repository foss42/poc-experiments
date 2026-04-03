import chalk from 'chalk';
import { CommandContext } from '../types.js';

export async function chatCommand(args: string[], ctx: CommandContext): Promise<void> {
  const sub = args[0];
  const { sessionManager } = ctx;

  switch (sub) {
    case 'list': {
      const sessions = sessionManager.listSessions();
      if (sessions.length === 0) {
        console.log(chalk.gray('\nNo saved sessions.\n'));
        return;
      }
      console.log(chalk.cyan.bold('\nSaved Sessions:\n'));
      sessions.forEach((s, i) => {
        const date = s.updatedAt.toLocaleString();
        const msgs = s.messages.length;
        const first = s.messages.find(m => m.role === 'user')?.content?.slice(0, 50) || '';
        console.log(`  ${chalk.green(String(i + 1).padStart(2))}. ${chalk.white.bold(s.name)} ${chalk.dim(`(${msgs} msgs) ${date}`)}`);
        if (first) console.log(`      ${chalk.gray(first + (first.length >= 50 ? '...' : ''))}`);
      });
      console.log('');
      break;
    }
    case 'save': {
      const tag = args[1];
      if (!tag) { console.log(chalk.red('Usage: /chat save <tag>')); return; }
      const session = sessionManager.getCurrentSession();
      if (!session) { console.log(chalk.red('No active session to save.')); return; }
      session.name = tag;
      sessionManager.saveSession(session);
      console.log(chalk.green(`✓ Session saved as: ${tag}`));
      break;
    }
    case 'resume':
    case 'load': {
      const tag = args[1];
      if (!tag) { console.log(chalk.red('Usage: /chat resume <tag>')); return; }
      const sessions = sessionManager.listSessions();
      const found = sessions.find(s => s.name === tag || s.id === tag);
      if (!found) { console.log(chalk.red(`Session not found: ${tag}`)); return; }
      sessionManager.setCurrentSession(found);
      console.log(chalk.green(`✓ Resumed session: ${found.name}`));
      break;
    }
    case 'delete': {
      const tag = args[1];
      if (!tag) { console.log(chalk.red('Usage: /chat delete <tag>')); return; }
      const sessions = sessionManager.listSessions();
      const found = sessions.find(s => s.name === tag || s.id === tag);
      if (!found) { console.log(chalk.red(`Session not found: ${tag}`)); return; }
      sessionManager.deleteSession(found.id);
      console.log(chalk.green(`✓ Deleted session: ${tag}`));
      break;
    }
    case 'share': {
      const filename = args[1];
      const session = sessionManager.getCurrentSession();
      if (!session) { console.log(chalk.red('No active session.')); return; }
      const data = sessionManager.exportSession(session.id);
      const target = filename || `cli-tool-session-${Date.now()}.json`;
      const { writeFileSync } = await import('fs');
      writeFileSync(target, data || '', 'utf-8');
      console.log(chalk.green(`✓ Session exported to: ${target}`));
      break;
    }
    case 'debug': {
      const session = sessionManager.getCurrentSession();
      if (!session) { console.log(chalk.red('No active session.')); return; }
      console.log(chalk.cyan.bold('\nSession Debug Info:'));
      console.log(JSON.stringify({
        id: session.id,
        name: session.name,
        messages: session.messages.length,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      }, null, 2));
      console.log('');
      break;
    }
    default:
      console.log(chalk.cyan.bold('\nChat Sub-commands:'));
      console.log('  /chat list                  - List saved sessions');
      console.log('  /chat save <tag>            - Save current session');
      console.log('  /chat resume <tag>          - Resume a session');
      console.log('  /chat delete <tag>          - Delete a session');
      console.log('  /chat share [filename]      - Export session to file');
      console.log('  /chat debug                 - Show session debug info');
      console.log('');
  }
}

// /resume is an alias
export const resumeCommand = chatCommand;
