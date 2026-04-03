import chalk from 'chalk';
import { CommandContext } from '../types.js';

const skills: Array<{ name: string; description: string; enabled: boolean }> = [
  { name: 'code-review', description: 'Code review and suggestions', enabled: true },
  { name: 'debugging',   description: 'Debugging assistance',        enabled: true },
  { name: 'refactoring', description: 'Refactoring recommendations', enabled: false },
];

export async function skillsCommand(args: string[], _ctx: CommandContext): Promise<void> {
  const sub = args[0];
  switch (sub) {
    case 'list':
      console.log(chalk.cyan.bold('\nAgent Skills:\n'));
      skills.forEach(s => {
        const status = s.enabled ? chalk.green('● enabled') : chalk.red('○ disabled');
        console.log(`  ${status}  ${chalk.white.bold(s.name.padEnd(20))} ${chalk.gray(s.description)}`);
      });
      console.log('');
      break;
    case 'enable':
      if (!args[1]) { console.log(chalk.red('Usage: /skills enable <name>')); return; }
      const es = skills.find(s => s.name === args[1]);
      if (es) { es.enabled = true; console.log(chalk.green(`✓ Enabled skill: ${args[1]}`)); }
      else console.log(chalk.red(`Skill not found: ${args[1]}`));
      break;
    case 'disable':
      if (!args[1]) { console.log(chalk.red('Usage: /skills disable <name>')); return; }
      const ds = skills.find(s => s.name === args[1]);
      if (ds) { ds.enabled = false; console.log(chalk.green(`✓ Disabled skill: ${args[1]}`)); }
      else console.log(chalk.red(`Skill not found: ${args[1]}`));
      break;
    case 'reload':
      console.log(chalk.green('✓ Skills reloaded'));
      break;
    default:
      console.log(chalk.cyan.bold('\nSkills Sub-commands:'));
      console.log('  /skills list              - List all skills');
      console.log('  /skills enable <name>     - Enable a skill');
      console.log('  /skills disable <name>    - Disable a skill');
      console.log('  /skills reload            - Reload skills');
      console.log('');
  }
}
