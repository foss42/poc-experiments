import { existsSync, readFileSync, statSync, readdirSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { homedir } from 'os';

interface LineRange { start: number; end: number; }

/**
 * Inject file or directory content into the chat context.
 * Supports:
 *  @path/to/file.ts
 *  @path/to/file.ts:10-20  (line range)
 *  @path/to/directory/
 *  ~/path/...
 */
export async function injectFileContent(
  rawPath: string,
  lineRange?: LineRange
): Promise<string> {
  // Resolve home directory
  const expanded = rawPath.replace(/^~/, homedir());
  const resolved = resolve(expanded);

  if (!existsSync(resolved)) {
    throw new Error(`Path not found: ${resolved}`);
  }

  const stat = statSync(resolved);

  if (stat.isFile()) {
    return readFileWithRange(resolved, lineRange);
  }

  if (stat.isDirectory()) {
    return readDirectory(resolved);
  }

  throw new Error(`Not a file or directory: ${resolved}`);
}

/** Parse line range from path syntax: file.ts:10-20 */
export function parsePathWithRange(input: string): { path: string; lineRange?: LineRange } {
  const match = input.match(/^(.+?)(?::(\d+)(?:-(\d+))?)?$/);
  if (!match) return { path: input };
  const path = match[1];
  if (match[2]) {
    const start = parseInt(match[2], 10);
    const end = match[3] ? parseInt(match[3], 10) : start;
    return { path, lineRange: { start, end } };
  }
  return { path };
}

function readFileWithRange(filePath: string, range?: LineRange): string {
  const content = readFileSync(filePath, 'utf-8');
  if (!range) return content;
  const lines = content.split('\n');
  const slice = lines.slice(range.start - 1, range.end);
  return slice.join('\n');
}

const BINARY_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.pdf', '.zip', '.tar', '.gz', '.exe', '.dll', '.so']);
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', '__pycache__', '.cache']);
const MAX_FILE_SIZE = 500_000; // 500KB

function shouldSkip(name: string, isDir: boolean): boolean {
  if (isDir) return SKIP_DIRS.has(name);
  const ext = name.lastIndexOf('.') >= 0 ? name.slice(name.lastIndexOf('.')) : '';
  return BINARY_EXTENSIONS.has(ext);
}

function readDirectory(dirPath: string, depth = 0): string {
  if (depth > 3) return '';
  const parts: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dirPath);
  } catch {
    return '';
  }

  for (const entry of entries) {
    if (shouldSkip(entry, false)) continue;
    const fullPath = join(dirPath, entry);
    try {
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        if (shouldSkip(entry, true)) continue;
        const sub = readDirectory(fullPath, depth + 1);
        if (sub) parts.push(`\n### Directory: ${fullPath}\n${sub}`);
      } else if (stat.isFile()) {
        if (stat.size > MAX_FILE_SIZE) {
          parts.push(`\n### File: ${fullPath}\n[File too large, skipped]`);
          continue;
        }
        try {
          const content = readFileSync(fullPath, 'utf-8');
          parts.push(`\n### File: ${fullPath}\n\`\`\`\n${content}\n\`\`\``);
        } catch { /* binary or unreadable */ }
      }
    } catch { /* permission error */ }
  }
  return parts.join('\n');
}
