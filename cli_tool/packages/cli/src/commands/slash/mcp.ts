import chalk from 'chalk';
import { CommandContext } from '../types.js';

export async function mcpCommand(args: string[], ctx: CommandContext): Promise<void> {
  const { mcpClient } = ctx;
  const sub = args[0] || 'list';

  if (!mcpClient) {
    console.log(chalk.yellow('MCP client not initialized. Add servers to ~/.cli-tool/config.json under mcp.servers'));
    return;
  }

  switch (sub) {
    case 'list':
    case 'ls': {
      const servers = mcpClient.listServers();
      if (servers.length === 0) {
        console.log(chalk.gray('\nNo MCP servers configured. Add to ~/.cli-tool/config.json\n'));
        return;
      }
      console.log(chalk.cyan.bold('\nMCP Servers:\n'));
      servers.forEach(s => {
        const status = s.enabled ? chalk.green('● connected') : chalk.red('○ disconnected');
        console.log(`  ${status}  ${chalk.white.bold(s.name)} ${chalk.dim(`(${s.tools} tools)`)}`);
      });
      console.log('');
      break;
    }
    case 'desc': {
      const tools = await mcpClient.listTools();
      console.log(chalk.cyan.bold('\nMCP Tools with Descriptions:\n'));
      tools.forEach(t => {
        console.log(`  ${chalk.cyan.bold(t.name)} ${chalk.dim(`[${t.server}]`)}`);
        console.log(`    ${chalk.gray(t.description)}`);
        console.log('');
      });
      break;
    }
    case 'schema': {
      const tools = await mcpClient.listTools();
      console.log(chalk.cyan.bold('\nMCP Tools with Schemas:\n'));
      tools.forEach(t => {
        console.log(`  ${chalk.cyan.bold(t.name)} ${chalk.dim(`[${t.server}]`)}`);
        console.log(`    ${chalk.gray(t.description)}`);
        console.log('    ' + chalk.dim(JSON.stringify(t.inputSchema, null, 2).replace(/\n/g, '\n    ')));
        console.log('');
      });
      break;
    }
    case 'refresh':
      console.log(chalk.gray('Refreshing MCP connections...'));
      await mcpClient.refresh();
      console.log(chalk.green('✓ MCP servers refreshed'));
      break;
    case 'enable':
      if (!args[1]) { console.log(chalk.red('Usage: /mcp enable <server-name>')); return; }
      await mcpClient.enableServer(args[1]);
      console.log(chalk.green(`✓ Enabled MCP server: ${args[1]}`));
      break;
    case 'disable':
      if (!args[1]) { console.log(chalk.red('Usage: /mcp disable <server-name>')); return; }
      await mcpClient.disableServer(args[1]);
      console.log(chalk.green(`✓ Disabled MCP server: ${args[1]}`));
      break;
    case 'auth':
      if (!args[1]) {
        console.log(chalk.cyan('\nOAuth-enabled MCP servers: (none configured)'));
      } else {
        console.log(chalk.yellow(`Initiating OAuth flow for: ${args[1]}`));
      }
      break;
    default:
      console.log(chalk.cyan.bold('\nMCP Sub-commands:'));
      console.log('  /mcp list|ls            - List servers and tools');
      console.log('  /mcp desc               - List tools with descriptions');
      console.log('  /mcp schema             - List tools with full schemas');
      console.log('  /mcp refresh            - Reconnect all servers');
      console.log('  /mcp enable <name>      - Enable a server');
      console.log('  /mcp disable <name>     - Disable a server');
      console.log('  /mcp auth [name]        - OAuth authentication');
      console.log('');
  }
}
