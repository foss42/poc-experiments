import { exec } from 'child_process';
import { promisify } from 'util';
import { randomBytes } from 'crypto';

const execAsync = promisify(exec);

export class SandboxService {
  private containerId?: string;

  constructor(
    private projectPath: string,
    private image: string = 'python:3.10-slim'
  ) {}

  /**
   * Initializes a new Docker sandbox container running in the background.
   */
  async initialize(): Promise<string> {
    if (this.containerId) {
      return this.containerId;
    }

    const id = randomBytes(8).toString('hex');
    const containerName = `cli-tool-sandbox-${id}`;
    
    try {
      // Start a detached container that stays alive. Mount the project path to /workspace.
      const mountArg = process.platform === 'win32' ? `"${this.projectPath}":/workspace` : `'${this.projectPath}':/workspace`;
      await execAsync(`docker run -d --name ${containerName} -v ${mountArg} -w /workspace --network none ${this.image} tail -f /dev/null`);
      this.containerId = containerName;
      return this.containerId;
    } catch (error: any) {
      throw new Error(`Failed to initialize sandbox: ${error.message}. Is Docker running?`);
    }
  }

  /**
   * Executes a command inside the sandboxed container.
   */
  async executeCommand(command: string): Promise<{ stdout: string; stderr: string }> {
    if (!this.containerId) {
      await this.initialize();
    }

    try {
      // Execute command inside the container
      const { stdout, stderr } = await execAsync(`docker exec ${this.containerId} sh -c "${command.replace(/"/g, '\\"')}"`);
      return { stdout, stderr };
    } catch (error: any) {
      // Executing commands that return non-zero exit codes will throw
      return { stdout: error.stdout || '', stderr: error.stderr || error.message };
    }
  }

  /**
   * Stops and removes the sandbox container.
   */
  async cleanup(): Promise<void> {
    if (this.containerId) {
      try {
        await execAsync(`docker rm -f ${this.containerId}`);
      } catch (e) {
        // Ignore cleanup errors
      }
      this.containerId = undefined;
    }
  }
}
