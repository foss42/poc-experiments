import chalk from 'chalk';
import { CommandContext } from '../types.js';

const AVAILABLE_MODELS: Record<string, string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
  custom: ['custom-model'],
};

export async function modelCommand(args: string[], ctx: CommandContext): Promise<void> {
  const sub = args[0];
  const { config } = ctx;

  switch (sub) {
    case 'set': {
      const model = args[1];
      const persist = args.includes('--persist');
      if (!model) { console.log(chalk.red('Usage: /model set <model-name> [--persist]')); return; }
      config.llm.model = model;
      console.log(chalk.green(`✓ Model set to: ${model}`));
      if (persist) {
        const { ConfigService } = await import('../../services/ConfigService.js');
        const cs = new ConfigService();
        await cs.saveConfig(config);
        console.log(chalk.dim('  Saved to ~/.cli-tool/config.json'));
      }
      break;
    }
    case 'manage': {
      const { llm } = config;
      console.log(chalk.cyan.bold('\nModel Configuration:'));
      console.log(`  Provider: ${chalk.white(llm.provider)}`);
      console.log(`  Model:    ${chalk.white(llm.model)}`);
      console.log(`  API Key:  ${llm.apiKey ? chalk.green('configured') : chalk.red('not set')}`);
      if (llm.baseUrl) console.log(`  Base URL: ${chalk.white(llm.baseUrl)}`);
      console.log('');
      console.log(chalk.white.bold('Available Models:'));
      const models = AVAILABLE_MODELS[llm.provider] || [];
      models.forEach(m => {
        const cur = m === llm.model ? chalk.green(' ✓') : '  ';
        console.log(`${cur} ${m}`);
      });
      console.log('');
      break;
    }
    default: {
      const { llm } = config;
      console.log(chalk.cyan.bold('\nCurrent Model:'));
      console.log(`  ${chalk.white.bold(llm.model)} ${chalk.dim(`(${llm.provider})`)}`);
      console.log('');
      console.log(chalk.cyan.bold('Model Sub-commands:'));
      console.log('  /model set <name>           - Set the model');
      console.log('  /model set <name> --persist - Set and save to config');
      console.log('  /model manage               - Show full config dialog');
      console.log('');
    }
  }
}
