import { CommandType } from '../types/index.js';

/**
 * Parse and dispatch commands based on prefix
 */
export class CommandParser {
  /**
   * Parse input and determine command type
   */
  parse(input: string): { type: CommandType; command: string; args: string[] } {
    const trimmed = input.trim();

    if (!trimmed) {
      return { type: 'query', command: '', args: [] };
    }

    // Shell command (!)
    if (trimmed.startsWith('!')) {
      const command = trimmed.substring(1).trim();
      const [cmd, ...args] = command.split(/\s+/);
      return { type: 'shell', command: cmd, args };
    }

    // At command (@)
    if (trimmed.startsWith('@')) {
      const path = trimmed.substring(1).trim();
      return { type: 'at', command: path, args: [] };
    }

    // Slash command (/)
    if (trimmed.startsWith('/')) {
      const [command, ...args] = trimmed.substring(1).split(/\s+/);
      return { type: 'slash', command, args };
    }

    // Regular query
    return { type: 'query', command: trimmed, args: [] };
  }

  /**
   * Extract subcommand and remaining args
   */
  parseSubcommand(args: string[]): { subcommand?: string; remaining: string[] } {
    if (args.length === 0) {
      return { subcommand: undefined, remaining: [] };
    }

    // Check if first arg looks like a subcommand (starts with dash or doesn't start with dash)
    const firstArg = args[0];
    const isFlag = firstArg.startsWith('-');

    if (isFlag) {
      return { subcommand: undefined, remaining: args };
    }

    return { subcommand: args[0], remaining: args.slice(1) };
  }

  /**
   * Parse flags from args
   */
  parseFlags(args: string[]): { flags: Map<string, string | true>; remaining: string[] } {
    const flags = new Map<string, string | true>();
    const remaining: string[] = [];

    for (const arg of args) {
      if (arg.startsWith('--')) {
        const parts = arg.substring(2).split('=');
        const key = parts[0];
        const value = parts.length > 1 ? parts[1] : true;
        flags.set(key, value);
      } else if (arg.startsWith('-')) {
        const key = arg.substring(1);
        flags.set(key, true);
      } else {
        remaining.push(arg);
      }
    }

    return { flags, remaining };
  }

  /**
   * Parse file paths from @ commands
   */
  parseFilePath(input: string): { path: string; lineRange?: { start: number; end: number } } {
    const trimmed = input.trim();

    // Check for line range syntax (e.g., file.ts:10-20)
    const match = trimmed.match(/^(.+?)(?::(\d+)(?:-(\d+))?)?$/);

    if (match) {
      const path = match[1];
      if (match[2]) {
        const start = parseInt(match[2], 10);
        const end = match[3] ? parseInt(match[3], 10) : start;
        return { path, lineRange: { start, end } };
      }
      return { path };
    }

    return { path: trimmed };
  }

  /**
   * Validate command format
   */
  validateCommand(type: CommandType, command: string): boolean {
    switch (type) {
      case 'slash':
        return /^[a-z][a-z0-9-]*$/.test(command);
      case 'shell':
        return /^[a-zA-Z0-9_-]+$/.test(command);
      case 'at':
        return command.length > 0;
      case 'query':
        return command.length > 0;
      default:
        return false;
    }
  }

  /**
   * Get command completion suggestions
   */
  getCompletions(
    type: CommandType,
    partial: string,
    availableCommands: string[]
  ): string[] {
    const lowerPartial = partial.toLowerCase();
    return availableCommands
      .filter(cmd => cmd.toLowerCase().startsWith(lowerPartial))
      .sort();
  }

  /**
   * Format command for display
   */
  formatCommand(type: CommandType, command: string, args: string[] = []): string {
    switch (type) {
      case 'slash':
        return `/${command}${args.length ? ' ' + args.join(' ') : ''}`;
      case 'shell':
        return `!${command}${args.length ? ' ' + args.join(' ') : ''}`;
      case 'at':
        return `@${command}`;
      case 'query':
        return command;
    }
  }

  /**
   * Split input into multiple commands if using semicolons
   */
  splitCommands(input: string): string[] {
    return input
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  /**
   * Check if input is multiline
   */
  isMultiline(input: string): boolean {
    return input.includes('\n');
  }

  /**
   * Join multiline input
   */
  joinMultiline(lines: string[]): string {
    return lines.join('\n');
  }
}