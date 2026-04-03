import { readFileSync, writeFileSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { SchemaService } from './SchemaService.js';
import { SandboxService } from './SandboxService.js';
import { TestingService } from './TestingService.js';
import { AuthService } from './AuthService.js';

const execAsync = promisify(exec);

export const CoreToolsDefinition = [
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read the contents of a file.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Absolute or relative path to the file" }
        },
        required: ["path"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description: "Write content to a file (overwrites completely).",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Path to the file" },
          content: { type: "string", description: "Content to write" }
        },
        required: ["path", "content"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "execute_shell",
      description: "Execute a shell command.",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string", description: "The shell command to run" }
        },
        required: ["command"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "execute_sandboxed_shell",
      description: "Execute a shell command inside an isolated Docker sandbox container. Use this for running arbitrary third-party tests or unknown scripts safely.",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string", description: "The shell command to run in the sandbox" }
        },
        required: ["command"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "load_api_schema",
      description: "Load an OpenAPI or GraphQL schema. Provide a path or URL. Returns the resolved schema string with all $refs.",
      parameters: {
        type: "object",
        properties: {
          source: { type: "string", description: "File path or URL to the schema" }
        },
        required: ["source"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "run_schemathesis",
      description: "Run automated API fuzzing using Schemathesis against a given schema and base URL.",
      parameters: {
        type: "object",
        properties: {
          schemaPathOrUrl: { type: "string", description: "Path or URL to the OpenAPI/GraphQL schema" },
          baseApiUrl: { type: "string", description: "Base URL of the running API to test" },
          authHeader: { type: "string", description: "Optional Authorization header (e.g. 'Bearer <token>')" }
        },
        required: ["schemaPathOrUrl", "baseApiUrl"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "run_pytest",
      description: "Execute Pytest for a Python script or Tavern YAML file.",
      parameters: {
        type: "object",
        properties: {
          scriptName: { type: "string", description: "Path to the test file to run (e.g., test_api.py)" }
        },
        required: ["scriptName"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "obtain_auth_token",
      description: "Perform a JSON POST request to fetch a JWT or API token for subsequent testing.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "Login endpoint URL" },
          payload: { type: "object", description: "JSON credentials payload (e.g. username/password)" },
          tokenPath: { type: "string", description: "JSON path to the token in the response (default: 'token')" }
        },
        required: ["url", "payload"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "delegate_testing_subagent",
      description: "Spawn a parallel subagent utilizing a LangGraph-inspired state machine to test an independent microservice or endpoint autonomously.",
      parameters: {
        type: "object",
        properties: {
          goal: { type: "string", description: "The specific testing goal or endpoint to test" }
        },
        required: ["goal"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "request_human_approval",
      description: "Halt execution and prompt the human user for approval before performing a high-risk action.",
      parameters: {
        type: "object",
        properties: {
          actionDescription: { type: "string", description: "Clear description of the high-risk action requiring approval" }
        },
        required: ["actionDescription"]
      }
    }
  }
];

import { LlmService } from './LlmService.js';
import { ConfigService } from './ConfigService.js';
import { GraphStateMachine } from './GraphStateMachine.js';
import inquirer from 'inquirer';

export class ToolService {
  private schemaService: SchemaService;
  private sandboxService: SandboxService;
  private testingService: TestingService;
  private authService: AuthService;

  constructor(private projectPath: string) {
    this.schemaService = new SchemaService(projectPath);
    this.sandboxService = new SandboxService(projectPath);
    this.testingService = new TestingService(this.sandboxService);
    this.authService = new AuthService();
  }

  async executeTool(name: string, args: any): Promise<string> {
    try {
      if (name === 'read_file') {
        const filePath = path.resolve(this.projectPath, args.path);
        return readFileSync(filePath, 'utf-8');
      }
      if (name === 'write_file') {
        const filePath = path.resolve(this.projectPath, args.path);
        writeFileSync(filePath, args.content, 'utf-8');
        return `Successfully wrote to ${args.path}`;
      }
      if (name === 'execute_shell') {
        const { stdout, stderr } = await execAsync(args.command, { cwd: this.projectPath });
        return stdout || stderr || "Command executed successfully with no output.";
      }
      if (name === 'execute_sandboxed_shell') {
        const result = await this.sandboxService.executeCommand(args.command);
        return result.stdout || result.stderr || "Command executed successfully with no output.";
      }
      if (name === 'load_api_schema') {
        return await this.schemaService.loadSchema(args.source);
      }
      if (name === 'run_schemathesis') {
        return await this.testingService.runSchemathesis(args.schemaPathOrUrl, args.baseApiUrl, { authHeader: args.authHeader });
      }
      if (name === 'run_pytest') {
        return await this.testingService.runPytest(args.scriptName);
      }
      if (name === 'obtain_auth_token') {
        return await this.authService.obtainToken(args.url, args.payload, args.tokenPath);
      }
      if (name === 'delegate_testing_subagent') {
        const configService = new ConfigService();
        const config = await configService.loadConfig();
        const llmService = new LlmService(config.llm);
        const subagent = new GraphStateMachine(llmService, this);
        return await subagent.runTestingWorkflow(args.goal);
      }
      if (name === 'request_human_approval') {
        const { approved } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'approved',
            message: `Agent requests approval for: ${args.actionDescription}`,
            default: false
          }
        ]);
        return approved ? 'APPROVED' : 'REJECTED';
      }
      throw new Error(`Unknown tool: ${name}`);
    } catch (e: any) {
      return `Error executing tool ${name}: ${e.message}`;
    }
  }
  
  async cleanup() {
    await this.sandboxService.cleanup();
  }
}


