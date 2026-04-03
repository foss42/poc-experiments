/**
 * Shared types for cli_tool
 */

export interface Config {
  llm: LlmConfig;
  storage?: StorageConfig;
  mcp?: McpConfig;
  ui?: UIConfig;
  theme?: string;
  vimMode?: boolean;
  editor?: string;
}

export interface LlmConfig {
  provider: 'openai' | 'anthropic' | 'custom' | 'ollama';
  apiKey: string;
  model: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface StorageConfig {
  type: 'filesystem' | 'database';
  path?: string;
}

export interface McpConfig {
  servers: McpServerConfig[];
}

export interface McpServerConfig {
  name: string;
  command: string;
  args: string[];
  enabled?: boolean;
  auth?: McpAuthConfig;
}

export interface McpAuthConfig {
  type?: string;
  token?: string;
  headers?: Record<string, string>;
}

export interface UIConfig {
  theme: string;
  vimMode: boolean;
  autoSave: boolean;
  showLineNumbers: boolean;
  maxHistorySize: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  content: string;
  isError?: boolean;
}

export interface Tool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface Session {
  id: string;
  name: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  projectId?: string;
}

export interface Memory {
  id: string;
  type: 'project' | 'user' | 'system';
  content: string;
  source: string;
  tags: string[];
  createdAt: Date;
}

export interface Extension {
  name: string;
  version: string;
  enabled: boolean;
  config?: Record<string, unknown>;
}

export interface Skill {
  name: string;
  description: string;
  enabled: boolean;
  triggers?: string[];
}

export interface Hook {
  name: string;
  event: string;
  script: string;
  enabled: boolean;
}

export interface Agent {
  name: string;
  type: 'local' | 'remote';
  enabled: boolean;
  config?: Record<string, unknown>;
}

export interface CommandCategory {
  name: string;
  description: string;
  commands: string[];
}

export type CommandType = 'slash' | 'at' | 'shell' | 'query';