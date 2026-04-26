import fs from 'fs';
import os from 'os';
import path from 'path';
import { SAMPLE_REQUESTS } from './data/api-data.js';

export interface WorkspaceRequest {
  id: string;
  name: string;
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
  description?: string;
}

export function getSyncFilePath() {
  const customPath = process.env.MCP_WORKSPACE_PATH;
  const platform = os.platform();
  const homeDir = os.homedir();
  
  let defaultPath = '';
  if (platform === 'linux') {
    defaultPath = path.join(homeDir, '.local', 'share', 'apidash', 'apidash_mcp_workspace.json');
  } else if (platform === 'darwin') {
    defaultPath = path.join(homeDir, 'Library', 'Application Support', 'apidash', 'apidash_mcp_workspace.json');
  } else if (platform === 'win32') {
    defaultPath = path.join(process.env.APPDATA || homeDir, 'apidash', 'apidash_mcp_workspace.json');
  }

  return customPath || defaultPath;
}

export function getMcpWorkspaceData() {
  const syncFile = getSyncFilePath();

  try {
    if (fs.existsSync(syncFile)) {
      const data = fs.readFileSync(syncFile, 'utf8');
      const parsed = JSON.parse(data);
      if (parsed && parsed.requests && Array.isArray(parsed.requests)) {
        // Map APIDash RequestModel format to MCP sample format
        const mappedRequests = parsed.requests.map((r: any) => ({
          id: r.id || Math.random().toString(),
          name: r.name || 'Unnamed Request',
          method: r.method || 'GET',
          url: r.url || '',
          description: r.description || '',
          body: r.body,
          headers: r.headers,
        }));
        
        return {
          requests: mappedRequests.length > 0 ? mappedRequests : SAMPLE_REQUESTS,
          environments: parsed.environments || [],
          lastUpdated: parsed.lastUpdated as string | undefined,
        };
      }
    }
  } catch (error) {
    console.error(`[McpWorkspace] Failed to read sync file at ${syncFile}:`, error);
  }

  // Fallback to sample data
  return {
    requests: SAMPLE_REQUESTS,
    environments: [],
    lastUpdated: undefined as string | undefined,
  };
}

export function updateMcpWorkspaceData(newData: any) {
  const syncFile = getSyncFilePath();
  try {
    let currentData: any = { requests: [], environments: [] };
    if (fs.existsSync(syncFile)) {
      currentData = JSON.parse(fs.readFileSync(syncFile, 'utf8'));
    }
    
    const updatedData = { ...currentData, ...newData };
    updatedData.lastUpdated = new Date().toISOString();
    
    fs.mkdirSync(path.dirname(syncFile), { recursive: true });
    fs.writeFileSync(syncFile, JSON.stringify(updatedData, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`[McpWorkspace] Failed to write sync file at ${syncFile}:`, error);
    return false;
  }
}
