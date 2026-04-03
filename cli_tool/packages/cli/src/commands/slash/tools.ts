import chalk from 'chalk';
import { CommandContext } from '../types.js';

export async function toolsCommand(args: string[], ctx: CommandContext): Promise<void> {
  const sub = args[0];
  const tools = ctx.mcpClient ? await ctx.mcpClient.listTools() : [];
  const showDesc = sub === 'desc' || sub === 'descriptions';
  const hideDesc = sub === 'nodesc' || sub === 'nodescriptions';

  if (tools.length === 0) {
    console.log(chalk.gray('\nNo MCP tools available. Connect an MCP server first with /mcp list.\n'));
    return;
  }

  console.log(chalk.cyan.bold(`\nAvailable Tools (${tools.length}):\n`));
  tools.forEach(t => {
    console.log(`  ${chalk.cyan.bold(t.name)} ${chalk.dim(`[${t.server}]`)}`);
    if (showDesc || (!hideDesc)) {
      console.log(`    ${chalk.gray(t.description)}`);
    }
  });
  console.log('');
  if (!showDesc && !hideDesc) {
    console.log(chalk.dim('Use /tools desc to show descriptions, /tools nodesc to hide them.'));
  }
  console.log('');
}
