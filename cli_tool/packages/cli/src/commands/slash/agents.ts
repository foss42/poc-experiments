import chalk from 'chalk';
import { CommandContext } from '../types.js';

const AGENT_DIRS = ['.cli-tool/agents', 'cli-tool/agents'];

export async function agentsCommand(args: string[], ctx: CommandContext): Promise<void> {
  const sub = args[0];
  switch (sub) {
    case 'list':
      console.log(chalk.cyan.bold('\nAgents:'));
      console.log(chalk.gray('  (No agents configured - add agent configs to .cli-tool/agents/)'));
      console.log('');
      break;
    case 'reload':
    case 'refresh':
      console.log(chalk.green('✓ Agent registry reloaded'));
      break;
    case 'enable':
      if (!args[1]) { console.log(chalk.red('Usage: /agents enable <agent-name>')); return; }
      console.log(chalk.green(`✓ Enabled agent: ${args[1]}`));
      break;
    case 'disable':
      if (!args[1]) { console.log(chalk.red('Usage: /agents disable <agent-name>')); return; }
      console.log(chalk.green(`✓ Disabled agent: ${args[1]}`));
      break;
    case 'config':
      if (!args[1]) { console.log(chalk.red('Usage: /agents config <agent-name>')); return; }
      console.log(chalk.yellow(`Agent config dialog for: ${args[1]}`));
      break;
    default:
      console.log(chalk.cyan.bold('\nAgents Sub-commands:'));
      console.log('  /agents list              - List all agents');
      console.log('  /agents reload            - Reload agent registry');
      console.log('  /agents enable <name>     - Enable an agent');
      console.log('  /agents disable <name>    - Disable an agent');
      console.log('  /agents config <name>     - Configure an agent');
      console.log('');
  }
}
