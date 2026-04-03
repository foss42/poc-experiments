import { SandboxService } from './SandboxService.js';

export class TestingService {
  private isTestingEnvReady = false;

  constructor(private sandboxService: SandboxService) {}

  /**
   * Prepares the Docker testing environment by installing required Python packages.
   */
  async prepareEnvironment(): Promise<void> {
    if (this.isTestingEnvReady) return;
    
    // Install schemathesis, pytest, tavern, and requests
    const setupCommand = `pip install --quiet schemathesis pytest tavern requests && echo "ENV_READY"`;
    const result = await this.sandboxService.executeCommand(setupCommand);
    
    if (result.stdout.includes('ENV_READY')) {
      this.isTestingEnvReady = true;
    } else {
      throw new Error(`Failed to provision testing environment. Output: ${result.stderr || result.stdout}`);
    }
  }

  /**
   * Runs Schemathesis fuzzing against a schema.
   */
  async runSchemathesis(schemaPathOrUrl: string, baseApiUrl: string, options: { authHeader?: string } = {}): Promise<string> {
    await this.prepareEnvironment();
    
    // Ensure schemathesis is run in workspace to output logs properly if needed
    let command = `schemathesis run --base-url ${baseApiUrl} ${schemaPathOrUrl}`;
    
    if (options.authHeader) {
      command += ` -H "${options.authHeader}"`;
    }

    const { stdout, stderr } = await this.sandboxService.executeCommand(command);
    return stdout || stderr || 'Schemathesis run completed.';
  }

  /**
   * Runs Pytest tests against Python or Tavern YAML scripts in the sandbox.
   */
  async runPytest(scriptName: string = 'test_api.py'): Promise<string> {
    await this.prepareEnvironment();

    // Run pytest on the requested script, which resides in the mounted /workspace directory
    const { stdout, stderr } = await this.sandboxService.executeCommand(`pytest ${scriptName} -v`);
    return stdout || stderr || 'Pytest run completed.';
  }
}
