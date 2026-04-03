import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { Config } from '../types/index.js';

const DEFAULT_CONFIG: Config = {
  llm: {
    provider: 'ollama',
    apiKey: '',
    model: 'llama3.2',
  },
  storage: { type: 'filesystem' },
  mcp: { servers: [] },
  ui: {
    theme: 'default',
    vimMode: false,
    autoSave: true,
    showLineNumbers: false,
    maxHistorySize: 1000,
  },
  theme: 'default',
  vimMode: false,
  editor: 'nano',
};

export class ConfigService {
  private configDir: string;
  private configPath: string;

  constructor() {
    this.configDir = join(homedir(), '.cli-tool');
    this.configPath = join(this.configDir, 'config.json');
  }

  /** Load config from disk, merging with defaults */
  async loadConfig(): Promise<Config> {
    if (!existsSync(this.configPath)) {
      return { ...DEFAULT_CONFIG };
    }
    try {
      const raw = readFileSync(this.configPath, 'utf-8');
      const user = JSON.parse(raw);
      return this.mergeDeep(DEFAULT_CONFIG, user) as Config;
    } catch {
      return { ...DEFAULT_CONFIG };
    }
  }

  /** Save config to disk */
  async saveConfig(config: Config): Promise<void> {
    this.ensureDir();
    writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
  }

  /** Create default config file */
  async initializeConfig(): Promise<void> {
    this.ensureDir();
    if (!existsSync(this.configPath)) {
      writeFileSync(this.configPath, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf-8');
    }
  }

  getConfigPath(): string { return this.configPath; }
  getConfigDir(): string { return this.configDir; }

  private ensureDir(): void {
    if (!existsSync(this.configDir)) {
      mkdirSync(this.configDir, { recursive: true });
    }
  }

  private mergeDeep(target: any, source: any): any {
    const output = Object.assign({}, target);
    if (isObject(target) && isObject(source)) {
      Object.keys(source).forEach(key => {
        if (isObject(source[key])) {
          if (!(key in target)) Object.assign(output, { [key]: source[key] });
          else output[key] = this.mergeDeep(target[key], source[key]);
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    return output;
  }
}

function isObject(item: any): boolean {
  return (item && typeof item === 'object' && !Array.isArray(item));
}
