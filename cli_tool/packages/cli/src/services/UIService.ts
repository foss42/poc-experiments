import chalk from 'chalk';
import { marked } from 'marked';
// @ts-ignore
import { markedTerminal } from 'marked-terminal';
import ora from 'ora';

marked.use(markedTerminal());

export type Theme = 'default' | 'ocean' | 'forest' | 'sunset' | 'mono';

const THEMES: Record<Theme, { primary: typeof chalk; secondary: typeof chalk; accent: typeof chalk; dim: typeof chalk }> = {
  default: { primary: chalk.cyan,   secondary: chalk.green,   accent: chalk.yellow,  dim: chalk.gray },
  ocean:   { primary: chalk.blue,   secondary: chalk.cyan,    accent: chalk.white,   dim: chalk.gray },
  forest:  { primary: chalk.green,  secondary: chalk.yellow,  accent: chalk.white,   dim: chalk.gray },
  sunset:  { primary: chalk.red,    secondary: chalk.yellow,  accent: chalk.magenta, dim: chalk.gray },
  mono:    { primary: chalk.white,  secondary: chalk.white,   accent: chalk.white,   dim: chalk.gray },
};

export class UIService {
  private currentTheme: Theme;
  private vimMode: boolean;

  constructor(theme: Theme = 'default', vimMode = false) {
    this.currentTheme = theme;
    this.vimMode = vimMode;
  }

  getTheme() { return THEMES[this.currentTheme] ?? THEMES.default; }
  getCurrentThemeName(): Theme { return this.currentTheme; }
  setTheme(t: Theme): void { this.currentTheme = t; }
  toggleVimMode(): boolean { this.vimMode = !this.vimMode; return this.vimMode; }
  isVimMode(): boolean { return this.vimMode; }
  availableThemes(): Theme[] { return Object.keys(THEMES) as Theme[]; }

  /** Print formatted table */
  printTable(headers: string[], rows: string[][]): void {
    const widths = headers.map((h, i) =>
      Math.max(h.length, ...rows.map(r => (r[i] || '').length))
    );
    const sep = widths.map(w => '─'.repeat(w + 2)).join('┼');
    const top = widths.map(w => '─'.repeat(w + 2)).join('┬');
    const bot = widths.map(w => '─'.repeat(w + 2)).join('┴');

    const theme = this.getTheme();
    console.log(theme.dim('┌' + top + '┐'));
    const headerRow = headers.map((h, i) => ` ${theme.primary.bold(h.padEnd(widths[i]))} `).join('│');
    console.log(theme.dim('│') + headerRow + theme.dim('│'));
    console.log(theme.dim('├' + sep + '┤'));
    for (const row of rows) {
      const r = row.map((c, i) => ` ${(c || '').padEnd(widths[i])} `).join('│');
      console.log(theme.dim('│') + r + theme.dim('│'));
    }
    console.log(theme.dim('└' + bot + '┘'));
  }

  /** Print an info box */
  printBox(title: string, lines: string[]): void {
    const theme = this.getTheme();
    const maxLen = Math.max(title.length, ...lines.map(l => l.length)) + 4;
    console.log(theme.primary('╭' + '─'.repeat(maxLen) + '╮'));
    console.log(theme.primary('│') + ' ' + theme.primary.bold(title).padEnd(maxLen + 9) + theme.primary('│'));
    console.log(theme.primary('│' + '─'.repeat(maxLen) + '│'));
    for (const line of lines) {
      console.log(theme.primary('│') + ' ' + line.padEnd(maxLen - 1) + theme.primary('│'));
    }
    console.log(theme.primary('╰' + '─'.repeat(maxLen) + '╯'));
  }

  /** Render markdown with cli syntax highlighting */
  renderMarkdown(text: string): string {
    return marked(text) as string;
  }

  /** Create an elegant spinner */
  createSpinner(text: string) {
    const theme = this.getTheme();
    return ora({
      text: theme.dim(text),
      spinner: 'dots',
      color: 'cyan'
    });
  }
}
