import chalk from 'chalk';
import { CommandContext } from '../types.js';

const ALL_COMMANDS = [
  { name: 'about',         desc: 'Show version info' },
  { name: 'agents',        desc: 'Manage local/remote subagents (list|reload|enable|disable|config)' },
  { name: 'auth',          desc: 'Change authentication method' },
  { name: 'bug',           desc: 'File a GitHub issue' },
  { name: 'chat',          desc: 'Session management (list|save|resume|delete|share|debug)' },
  { name: 'clear',         desc: 'Clear the terminal screen (also Ctrl+L)' },
  { name: 'commands',      desc: 'Manage custom commands (reload)' },
  { name: 'compress',      desc: 'Replace context with a summary' },
  { name: 'copy',          desc: 'Copy last AI output to clipboard' },
  { name: 'directory',     desc: 'Manage workspace directories (add|show)' },
  { name: 'docs',          desc: 'Open documentation in browser' },
  { name: 'editor',        desc: 'Select preferred editor' },
  { name: 'extensions',    desc: 'Manage extensions (list|install|enable|disable|...)' },
  { name: 'help',          desc: 'Show this help screen' },
  { name: 'hooks',         desc: 'Manage lifecycle hooks (list|enable|disable|...)' },
  { name: 'ide',           desc: 'Manage IDE integration (enable|disable|install|status)' },
  { name: 'init',          desc: 'Create CLI-TOOL.md context file in current directory' },
  { name: 'mcp',           desc: 'Manage MCP servers (list|enable|disable|refresh|auth|desc|schema)' },
  { name: 'memory',        desc: 'Manage AI memory (add|list|refresh|show)' },
  { name: 'model',         desc: 'Model config (set|manage)' },
  { name: 'permissions',   desc: 'Manage folder trust settings (trust)' },
  { name: 'plan',          desc: 'Plan mode (copy)' },
  { name: 'policies',      desc: 'List active policies (list)' },
  { name: 'privacy',       desc: 'Privacy notice and consent' },
  { name: 'quit',          desc: 'Exit CLI Tool (also /exit)' },
  { name: 'restore',       desc: 'Restore project files to pre-tool state' },
  { name: 'resume',        desc: 'Alias for /chat' },
  { name: 'rewind',        desc: 'Navigate backward through chat history' },
  { name: 'settings',      desc: 'Open settings editor' },
  { name: 'shells',        desc: 'Toggle background shells view' },
  { name: 'setup-github',  desc: 'Setup GitHub Actions with CLI Tool CI' },
  { name: 'skills',        desc: 'Manage agent skills (list|enable|disable|reload)' },
  { name: 'stats',         desc: 'Session/model/tool statistics' },
  { name: 'terminal-setup',desc: 'Configure terminal keybindings' },
  { name: 'theme',         desc: 'Change visual theme' },
  { name: 'tools',         desc: 'List available tools (desc|nodesc)' },
  { name: 'upgrade',       desc: 'Open upgrade page in browser' },
  { name: 'vim',           desc: 'Toggle vim keybindings mode' },
];

export async function helpCommand(args: string[], _ctx: CommandContext): Promise<void> {
  console.log('');
  console.log(chalk.cyan.bold('╔══════════════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan.bold('║') + chalk.white.bold('             CLI Tool - Available Commands                 ') + chalk.cyan.bold('║'));
  console.log(chalk.cyan.bold('╚══════════════════════════════════════════════════════════════╝'));
  console.log('');

  console.log(chalk.white.bold('Slash Commands') + chalk.dim(' (/) - CLI control'));
  console.log('');
  ALL_COMMANDS.forEach(cmd => {
    console.log(`  ${chalk.cyan('/' + cmd.name.padEnd(18))} ${chalk.gray(cmd.desc)}`);
  });

  console.log('');
  console.log(chalk.white.bold('Special Prefixes:'));
  console.log(`  ${chalk.yellow('!')} + command   ${chalk.gray('Execute shell command  (e.g. !ls -la)')}`);
  console.log(`  ${chalk.yellow('@')} + path      ${chalk.gray('Inject file into prompt (e.g. @README.md)')}`);
  console.log('');
  console.log(chalk.white.bold('Keyboard Shortcuts:'));
  console.log(`  ${chalk.yellow('Ctrl+L')}         ${chalk.gray('Clear screen')}`);
  console.log(`  ${chalk.yellow('Ctrl+D')}         ${chalk.gray('Exit CLI')}`);
  console.log(`  ${chalk.yellow('Esc Esc')}        ${chalk.gray('Rewind history')}`);
  console.log('');
  console.log(chalk.dim('Type /help <command> for details on a specific command.'));
  console.log('');
}
