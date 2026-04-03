import { Config } from '../types/index.js';
import { SessionManager } from '../repl/SessionManager.js';
import { McpClientService } from '../services/McpClientService.js';
import { LlmService } from '../services/LlmService.js';

export interface CommandContext {
  config: Config;
  sessionManager: SessionManager;
  mcpClient?: McpClientService;
  llmService: LlmService;
  mode: 'plan' | 'build';
  setMode: (mode: 'plan' | 'build') => void;
}
