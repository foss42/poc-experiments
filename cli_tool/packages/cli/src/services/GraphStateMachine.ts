import { LlmService } from './LlmService.js';
import { ToolService, CoreToolsDefinition } from './ToolService.js';
import { ChatMessage } from '../types/index.js';
import chalk from 'chalk';

export type State = 'Analysis' | 'Generation' | 'Execution' | 'Verification' | 'End';

export class GraphStateMachine {
  private state: State = 'Analysis';
  private maxLoops = 15;
  
  constructor(private llm: LlmService, private tools: ToolService) {}
  
  /**
   * Runs the autonomous testing workflow through an explicit graph-based state machine.
   */
  async runTestingWorkflow(goal: string): Promise<string> {
    let context = `Original Goal: ${goal}\n`;
    let loops = 0;
    
    while (this.state !== 'End' && loops < this.maxLoops) {
      console.log(chalk.magenta.bold(`\n[Agent Graph Phase: ${this.state}]`));
      
      let systemPrompt = '';
      switch (this.state) {
        case 'Analysis':
          systemPrompt = "You are in the ANALYSIS phase. Use load_api_schema or read_file to understand the testtarget context. Once you are confident you understand it, respond with exactly TRANSITION_TO_GENERATION.";
          break;
        case 'Generation':
          systemPrompt = "You are in the GENERATION phase. Use write_file or obtain_auth_token to prepare tests (e.g., Tavern YAML or Pytest). When tests are generated and ready, respond with exactly TRANSITION_TO_EXECUTION.";
          break;
        case 'Execution':
          systemPrompt = "You are in the EXECUTION phase. Run your tests using tools like run_schemathesis or run_pytest. Once executed and outputs are collected, respond with exactly TRANSITION_TO_VERIFICATION.";
          break;
        case 'Verification':
          systemPrompt = "You are in the VERIFICATION phase. Analyze the test execution outputs. If the goal is fully met or no further action is needed, respond with exactly TRANSITION_TO_END. If tests failed and need to be debugged or modified, respond with exactly TRANSITION_TO_ANALYSIS.";
          break;
      }

      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: context }
      ];

      try {
        const response = await this.llm.chat(
          messages, 
          CoreToolsDefinition, 
          async (name: string, args: any) => {
            console.log(chalk.yellow(`  → Subagent executes ${name}`));
            return this.tools.executeTool(name, args);
          }
        );
        
        context += `\n[${this.state} Phase Report]:\n${response}\n`;
        
        // Handle transitions based on LLM output
        if (response.includes('TRANSITION_TO_GENERATION')) this.state = 'Generation';
        else if (response.includes('TRANSITION_TO_EXECUTION')) this.state = 'Execution';
        else if (response.includes('TRANSITION_TO_VERIFICATION')) this.state = 'Verification';
        else if (response.includes('TRANSITION_TO_END')) this.state = 'End';
        else if (response.includes('TRANSITION_TO_ANALYSIS')) this.state = 'Analysis';
        else {
          // If no transition code is given, stay in the current state but append the output to context
          console.log(chalk.gray(`  Agent did not request transition, remaining in ${this.state}.`));
        }

      } catch (error: any) {
        console.error(chalk.red(`Graph state error: ${error.message}`));
        context += `\n[Error in ${this.state}]: ${error.message}\n`;
        this.state = 'Verification'; // Fallback to verification on error
      }
      
      loops++;
    }
    
    if (this.state !== 'End') {
      console.log(chalk.red('\n[Graph] Maximum iterations reached. Forcing early exit.'));
    }

    return context;
  }
}
