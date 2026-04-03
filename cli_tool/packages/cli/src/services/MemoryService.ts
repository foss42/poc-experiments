import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { Memory } from '../types/index.js';

export class MemoryService {
  private globalMemoryPath: string;
  private projectPath: string;
  private memories: Map<string, Memory> = new Map();

  constructor(projectPath = process.cwd()) {
    this.projectPath = projectPath;
    this.globalMemoryPath = join(homedir(), '.cli-tool', 'CLI-TOOL.md');
  }

  /** Find all CLI-TOOL.md files from project to root + global */
  private findMemoryFiles(): string[] {
    const files: string[] = [];

    // Walk up from project root looking for CLI-TOOL.md
    let current = this.projectPath;
    while (true) {
      const candidate = join(current, 'CLI-TOOL.md');
      if (existsSync(candidate)) files.push(candidate);
      const parent = dirname(current);
      if (parent === current) break;
      current = parent;
    }

    // Global memory
    if (existsSync(this.globalMemoryPath)) {
      files.push(this.globalMemoryPath);
    }

    return files.reverse(); // global first, project last
  }

  /** Load memory from all CLI-TOOL.md files */
  async loadMemory(): Promise<string> {
    const files = this.findMemoryFiles();
    const parts: string[] = [];
    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf-8');
        parts.push(`# Memory from: ${file}\n${content}`);
      } catch { /* skip */ }
    }
    return parts.join('\n\n---\n\n');
  }

  /** Add text to global CLI-TOOL.md */
  async addMemory(text: string): Promise<void> {
    const dir = dirname(this.globalMemoryPath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    let existing = '';
    if (existsSync(this.globalMemoryPath)) {
      existing = readFileSync(this.globalMemoryPath, 'utf-8');
    }
    writeFileSync(this.globalMemoryPath, `${existing}\n\n- ${text}`.trimStart(), 'utf-8');
  }

  /** List all memory file paths */
  listMemoryPaths(): string[] {
    return this.findMemoryFiles();
  }

  /** Show full concatenated memory content */
  async showMemory(): Promise<string> {
    return this.loadMemory();
  }

  /** Create a CLI-TOOL.md at specified path */
  async initCliToolMd(targetPath: string): Promise<void> {
    const mdPath = join(targetPath, 'CLI-TOOL.md');
    if (existsSync(mdPath)) return;

    const template = `# CLI-TOOL.md - Project Context

Add project-specific instructions and context for your AI assistant here.

## Project Overview

## Key Files

## Conventions

## Notes
`;
    writeFileSync(mdPath, template, 'utf-8');
  }
}
