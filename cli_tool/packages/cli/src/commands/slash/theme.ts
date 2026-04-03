import chalk from 'chalk';
import { CommandContext } from '../types.js';

const THEMES = ['default', 'ocean', 'forest', 'sunset', 'mono'] as const;

export async function themeCommand(args: string[], ctx: CommandContext): Promise<void> {
  const requested = args[0];

  if (requested) {
    if (!THEMES.includes(requested as any)) {
      console.log(chalk.red(`Unknown theme: ${requested}`));
      console.log(chalk.gray('Available: ' + THEMES.join(', ')));
      return;
    }
    ctx.config.theme = requested;
    const { ConfigService } = await import('../../services/ConfigService.js');
    const cs = new ConfigService();
    await cs.saveConfig(ctx.config);
    console.log(chalk.green(`✓ Theme changed to: ${requested}`));
    return;
  }

  // Show theme picker
  console.log(chalk.cyan.bold('\nAvailable Themes:\n'));
  THEMES.forEach(t => {
    const cur = t === (ctx.config.theme || 'default') ? chalk.green(' ✓') : '  ';
    const preview = previewTheme(t);
    console.log(`${cur} ${chalk.white.bold(t.padEnd(12))} ${preview}`);
  });
  console.log('');
  console.log(chalk.dim('Usage: /theme <name>'));
  console.log('');
}

function previewTheme(theme: string): string {
  switch (theme) {
    case 'default': return chalk.cyan('■■') + chalk.green('■■') + chalk.yellow('■■');
    case 'ocean':   return chalk.blue('■■') + chalk.cyan('■■') + chalk.white('■■');
    case 'forest':  return chalk.green('■■') + chalk.yellow('■■') + chalk.white('■■');
    case 'sunset':  return chalk.red('■■') + chalk.yellow('■■') + chalk.magenta('■■');
    case 'mono':    return chalk.white('■■■■■■');
    default:        return '';
  }
}
