import chalk from 'chalk';
import fetch from 'node-fetch';
import { CommandContext } from '../types.js';

export async function requestCommand(args: string[], ctx: CommandContext): Promise<void> {
  if (args.length < 2) {
    console.log(chalk.red('Usage: /request <METHOD> <URL> [BODY]'));
    return;
  }
  const [method, url, ...bodyParts] = args;
  const body = bodyParts.join(' ');

  console.log(chalk.blue(`Making ${method.toUpperCase()} request to ${url}...`));

  try {
    const res = await fetch(url, {
      method: method.toUpperCase(),
      headers: { 'Content-Type': 'application/json' },
      body: body ? body : undefined
    });

    const text = await res.text();

    if (!res.ok) {
      console.log(chalk.red(`Request failed with status ${res.status} ${res.statusText}`));
      console.log(chalk.yellow(`Payload: ${text.substring(0, 500)}${text.length > 500 ? '...' : ''}`));
      console.log(chalk.cyan('Initiating AI Triage...'));
      
      const prompt = `The API request to ${url} with method ${method} failed with status ${res.status}. Response body: ${text}. Why did this fail and how do I fix the request parameters?`;
      ctx.sessionManager.addMessage({ role: 'user', content: prompt });
      
      // Auto-trigger LLM triage
      const response = await ctx.llmService.chat(ctx.sessionManager.getMessages());
      console.log(chalk.cyan.bold('CLI Tool Triage:'));
      console.log(chalk.white(response));
      ctx.sessionManager.addMessage({ role: 'assistant', content: response });
    } else {
      console.log(chalk.green(`Success! Status: ${res.status}`));
      console.log(chalk.white(text.substring(0, 1000)));
    }
  } catch (error: any) {
    console.log(chalk.red(`Network error: ${error.message}`));
  }
}
