import chalk from 'chalk';
import { CommandContext } from '../types.js';

export async function settingsCommand(args: string[], ctx: CommandContext): Promise<void> {
  const { config } = ctx;
  const key = args[0];
  const value = args[1];

  if (key && value) {
    // Set a setting
    const parts = key.split('.');
    let obj: any = config;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!obj[parts[i]]) obj[parts[i]] = {};
      obj = obj[parts[i]];
    }
    const lastKey = parts[parts.length - 1];
    if (value === 'true') obj[lastKey] = true;
    else if (value === 'false') obj[lastKey] = false;
    else if (!isNaN(Number(value))) obj[lastKey] = Number(value);
    else obj[lastKey] = value;

    const { ConfigService } = await import('../../services/ConfigService.js');
    const cs = new ConfigService();
    await cs.saveConfig(config);
    console.log(chalk.green(`✓ Set ${key} = ${value}`));
    return;
  }

  // Show all settings
  console.log(chalk.cyan.bold('\nCurrent Settings:\n'));
  const printObj = (obj: any, prefix = '') => {
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
        console.log(`  ${chalk.white.bold(prefix + k + ':')}`);
        printObj(v, prefix + '  ');
      } else if (Array.isArray(v)) {
        console.log(`  ${chalk.cyan(prefix + k)}: ${chalk.gray(JSON.stringify(v))}`);
      } else {
        const displayVal = k === 'apiKey' && v ? chalk.green('***configured***') : chalk.white(String(v));
        console.log(`  ${chalk.cyan(prefix + k)}: ${displayVal}`);
      }
    }
  };
  printObj(config);
  console.log('');
  console.log(chalk.dim('Usage: /settings <key.path> <value>  to set a value'));
  console.log(chalk.dim('Example: /settings llm.model gpt-4o-mini'));
  console.log('');
}
