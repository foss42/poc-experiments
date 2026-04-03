import { LlmConfig, ChatMessage } from '../types/index.js';
import { RunTree } from 'langsmith';

export class LlmService {
  constructor(private config: LlmConfig) {}

  async chat(messages: ChatMessage[], tools?: any[], toolHandler?: (name: string, args: any) => Promise<string>): Promise<string> {
    const isTracingEnabled = process.env.LANGCHAIN_TRACING_V2 === 'true';
    let runTree: RunTree | undefined;
    
    if (isTracingEnabled) {
      runTree = new RunTree({
        name: `AgenticChat - ${this.config.provider}`,
        run_type: 'chain',
        inputs: { messages }
      });
      await runTree.postRun();
    }
    
    try {
      let result: string;
      switch (this.config.provider) {
        case 'openai':    result = await this.chatWithOpenAI(messages, tools, toolHandler); break;
        case 'anthropic': result = await this.chatWithAnthropic(messages); break;
        case 'custom':    result = await this.chatWithCustom(messages); break;
        case 'ollama':    result = await this.chatWithOllama(messages, tools, toolHandler); break;
        default:          throw new Error(`Unknown provider: ${this.config.provider}`);
      }
      
      if (runTree) {
        await runTree.end({ outputs: { result } });
        await runTree.patchRun();
      }
      
      return result;
    } catch (error: any) {
      if (runTree) {
        await runTree.end({ error: error.message });
        await runTree.patchRun();
      }
      throw error;
    }
  }

  isConfigured(): boolean {
    if (this.config.provider === 'ollama') return true;
    return !!this.config.apiKey;
  }

  private async chatWithOpenAI(messages: ChatMessage[], tools?: any[], toolHandler?: (name: string, args: any) => Promise<string>): Promise<string> {
    if (!this.config.apiKey) throw new Error('OpenAI API key not configured. Run: cli-tool config --init');
    const OpenAI = (await import('openai' as any)).default;
    const client = new OpenAI({ apiKey: this.config.apiKey, baseURL: this.config.baseUrl });

    let activeMessages = messages.map((m: any) => ({
      role: m.role,
      content: m.content || '', // Ensure empty content isn't omitted if tool_calls are present
      ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}),
      ...(m.tool_call_id ? { tool_call_id: m.tool_call_id, name: m.name } : {})
    }));

    // Start evaluation loop for tool calls
    while (true) {
      const response = await client.chat.completions.create({
        model: this.config.model || 'gpt-4o',
        messages: activeMessages,
        temperature: this.config.temperature ?? 0.7,
        max_tokens: this.config.maxTokens ?? 4096,
        ...(tools && tools.length > 0 ? { tools: tools } : {})
      });

      const message = response.choices[0]?.message;
      if (!message) throw new Error("No response from OpenAI.");

      if (message.tool_calls && message.tool_calls.length > 0 && toolHandler) {
        // AI decided to execute a tool
        activeMessages.push(message as any);

        for (const tool_call of message.tool_calls) {
          const args = JSON.parse(tool_call.function.arguments);
          const result = await toolHandler(tool_call.function.name, args);
          activeMessages.push({
            role: "tool",
            tool_call_id: tool_call.id,
            name: tool_call.function.name,
            content: result
          } as any);
        }
        // Loop and make another call with the tool results appended
      } else {
        return message.content || '';
      }
    }
  }

  private async chatWithAnthropic(messages: ChatMessage[]): Promise<string> {
    if (!this.config.apiKey) throw new Error('Anthropic API key not configured. Run: cli-tool config --init');
    const Anthropic = (await import('@anthropic-ai/sdk' as any)).default;
    const client = new Anthropic({ apiKey: this.config.apiKey });

    const systemMsg = messages.find(m => m.role === 'system');
    const humanMsgs = messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const response = await client.messages.create({
      model: this.config.model || 'claude-3-5-sonnet-20241022',
      max_tokens: this.config.maxTokens ?? 4096,
      system: systemMsg?.content,
      messages: humanMsgs,
    });
    return response.content[0]?.type === 'text' ? response.content[0].text : '';
  }

  private async chatWithCustom(messages: ChatMessage[]): Promise<string> {
    if (!this.config.baseUrl) throw new Error('Custom provider baseUrl not configured');
    const fetch = (await import('node-fetch' as any)).default;

    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        temperature: this.config.temperature ?? 0.7,
        max_tokens: this.config.maxTokens ?? 4096,
      }),
    });

    if (!response.ok) {
      throw new Error(`Custom provider error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json() as any;
    return data.choices?.[0]?.message?.content ?? '';
  }

  private async chatWithOllama(messages: ChatMessage[], tools?: any[], toolHandler?: (name: string, args: any) => Promise<string>): Promise<string> {
    const { Ollama } = (await import('ollama' as any));
    const client = new Ollama({ host: this.config.baseUrl || 'http://127.0.0.1:11434' });

    const formattedMessages = messages.map((m: any) => ({
      role: m.role === 'system' ? 'system' : (m.role === 'user' ? 'user' : (m.role === 'tool' ? 'tool' : 'assistant')),
      content: m.content || '',
      ...(m.tool_calls ? { tool_calls: m.tool_calls } : {})
    }));

    while (true) {
      const response = await client.chat({
        model: this.config.model || 'llama3',
        messages: formattedMessages,
        ...(tools && tools.length > 0 ? { tools: tools } : {})
      });

      if (response.message.tool_calls && response.message.tool_calls.length > 0 && toolHandler) {
        // AI decided to execute a tool
        formattedMessages.push(response.message);

        for (const tool_call of response.message.tool_calls) {
          const result = await toolHandler(tool_call.function.name, tool_call.function.arguments);
          formattedMessages.push({
            role: "tool",
            // The ollama SDK might not need tool_call_id, but we push the content correctly
            content: result
          } as any);
        }
      } else {
        return response.message.content;
      }
    }
  }
}
