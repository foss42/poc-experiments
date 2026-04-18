import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {
  StdioConfigSchema,
  HttpConfigSchema,
  ToolInfoSchema,
  ResourceInfoSchema,
  PromptInfoSchema,
  ServerCapabilitiesSchema,
  InvokeResponseSchema,
} from '@mcp-suite/shared';
import type { ServerCapabilities, StdioConfig, HttpConfig, ToolInfo, ResourceInfo, PromptInfo, InvokeResponse } from '@mcp-suite/shared';

export class McpClientEngine {
  private client: Client | null = null;
  private transport: StdioClientTransport | StreamableHTTPClientTransport | null = null;
  private _capabilities: ServerCapabilities | null = null;

  /* ServerCapabilitiesSchema

    {
      serverInfo: z.object({
        name: z.string(),
        version: z.string(),
      }),
      capabilities: z.record(z.unknown()),
      protocolVersion: z.string().optional(),
      tools: z.array(ToolInfoSchema),
      resources: z.array(ResourceInfoSchema),
      prompts: z.array(PromptInfoSchema),
    }

  */

  get capabilities(): ServerCapabilities | null {
    return this._capabilities;
  }

  get isConnected(): boolean {
    return this.client !== null;
  }

  async connectStdio(config: StdioConfig): Promise<ServerCapabilities> {
    // Validate config through Zod
    const validated = StdioConfigSchema.parse(config);

    if (this.client) {
      await this.disconnect();
    }

    this.transport = new StdioClientTransport({
      command: validated.command,
      args: validated.args,
      cwd: validated.workingDirectory,
      env: validated.env
        ? { ...process.env, ...validated.env } as Record<string, string>
        : undefined,
    });

    this.client = new Client(
      { name: 'mcp-testing-suite', version: '0.1.0' },
      { capabilities: {} },
    );

    await this.client.connect(this.transport);
    return this._discoverCapabilities();
  }

  async connectStreamableHttp(config: HttpConfig): Promise<ServerCapabilities> {
    const validated = HttpConfigSchema.parse(config);

    if (this.client) {
      await this.disconnect();
    }

    const headers: Record<string, string> = {};
    if (validated.auth === 'bearer' && validated.bearerToken) {
      headers['Authorization'] = `Bearer ${validated.bearerToken}`;
    }

    this.transport = new StreamableHTTPClientTransport(
      new URL(validated.url),
      Object.keys(headers).length > 0 ? { requestInit: { headers } } : undefined,
    );

    this.client = new Client(
      { name: 'mcp-testing-suite', version: '0.1.0' },
      { capabilities: {} },
    );

    await this.client.connect(this.transport);
    return this._discoverCapabilities();
  }

  private async _discoverCapabilities(): Promise<ServerCapabilities> {
    const tools = await this.discoverTools();
    const resources = await this.discoverResources();
    const prompts = await this.discoverPrompts();

    this._capabilities = ServerCapabilitiesSchema.parse({
      serverInfo: {
        name: this.client!.getServerVersion()?.name ?? 'unknown',
        version: this.client!.getServerVersion()?.version ?? 'unknown',
      },
      capabilities: this.client!.getServerCapabilities() ?? {},
      protocolVersion: (this.client!.getServerVersion() as Record<string, unknown>)?.protocolVersion as string | undefined,
      tools,
      resources,
      prompts,
    });

    return this._capabilities;
  }

  private async discoverTools(): Promise<ToolInfo[]> {
    try {
      const result = await this.client!.listTools();
      return result.tools.map((t) => {
        const raw = t as Record<string, unknown>;
        return ToolInfoSchema.parse({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema as Record<string, unknown>,
          annotations: raw._meta as Record<string, unknown> | undefined,
        });
      });
    } catch {
      return [];
    }
  }

  private async discoverResources(): Promise<ResourceInfo[]> {
    try {
      const result = await this.client!.listResources();
      return result.resources.map((r) =>
        ResourceInfoSchema.parse({
          uri: r.uri,
          name: r.name,
          description: r.description,
          mimeType: r.mimeType,
        }),
      );
    } catch {
      return [];
    }
  }

  private async discoverPrompts(): Promise<PromptInfo[]> {
    try {
      const result = await this.client!.listPrompts();
      return result.prompts.map((p) =>
        PromptInfoSchema.parse({
          name: p.name,
          description: p.description,
          arguments: p.arguments,
        }),
      );
    } catch {
      return [];
    }
  }

  async readResource(uri: string): Promise<{ contents: unknown[] }> {
    if (!this.client) {
      throw new Error('Not connected to any MCP server');
    }
    const result = await this.client.readResource({ uri });
    return { contents: result.contents };
  }

  async invokeTool(
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<InvokeResponse> {
    if (!this.client) {
      throw new Error('Not connected to any MCP server');
    }

    const start = performance.now();
    const response = await this.client.callTool({
      name: toolName,
      arguments: args,
    });
    const latencyMs = Math.round(performance.now() - start);

    return InvokeResponseSchema.parse({
      result: response.content,
      isError: Boolean(response.isError),
      latencyMs,
      _meta: response._meta,
      structuredContent: (response as Record<string, unknown>).structuredContent,
    });
  }

  async disconnect(): Promise<void> {
    if (this.transport) {
      await this.transport.close();
    }
    this.client = null;
    this.transport = null;
    this._capabilities = null;
  }
}
