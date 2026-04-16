/**
 * APIDash CLI — AI / LLM Executor
 * Sends chat-completion requests to any OpenAI-compatible endpoint.
 * Supports: OpenAI, Gemini (via OpenAI-compat), Ollama, Mistral, Groq, etc.
 */

import axios from "axios";

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIRequestContext {
  url: string;           // endpoint, e.g. https://api.openai.com/v1/chat/completions
  apiKey?: string;       // Bearer token
  model: string;         // e.g. gpt-4o, llama3, gemini-pro
  messages: AIMessage[];
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

export interface AIResponseData {
  url: string;
  model: string;
  status: number;
  statusText: string;
  content: string;        // assistant reply text
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  finishReason?: string;
  duration: number;
  rawBody: string;
}

export interface AIResult {
  success: boolean;
  data: AIResponseData;
  errorMsg?: string;
}

// ── Preset endpoints for known providers ─────────────────────────

export const AI_PROVIDERS: Record<string, { url: string; label: string }> = {
  openai:    { url: "https://api.openai.com/v1/chat/completions",                          label: "OpenAI" },
  groq:      { url: "https://api.groq.com/openai/v1/chat/completions",                    label: "Groq" },
  mistral:   { url: "https://api.mistral.ai/v1/chat/completions",                         label: "Mistral AI" },
  together:  { url: "https://api.together.xyz/v1/chat/completions",                       label: "Together AI" },
  ollama:    { url: "http://localhost:11434/api/chat",                                     label: "Ollama (local)" },
  gemini:    { url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", label: "Google Gemini" },
  anthropic: { url: "https://api.anthropic.com/v1/messages",                              label: "Anthropic Claude" },
};

export async function executeAIRequest(ctx: AIRequestContext): Promise<AIResult> {
  const {
    url,
    apiKey,
    model,
    messages,
    systemPrompt,
    temperature = 0.7,
    maxTokens = 1024,
    headers = {},
    timeoutMs = 60_000,
  } = ctx;

  const startTime = Date.now();

  const fullMessages: AIMessage[] = [];
  if (systemPrompt) fullMessages.push({ role: "system", content: systemPrompt });
  fullMessages.push(...messages);

  const authHeaders: Record<string, string> = {};
  if (apiKey) authHeaders["Authorization"] = `Bearer ${apiKey}`;

  const mergedHeaders = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...authHeaders,
    ...headers,
  };

  const payload = {
    model,
    messages: fullMessages,
    temperature,
    max_tokens: maxTokens,
  };

  try {
    const response = await axios({
      method: "POST",
      url,
      headers: mergedHeaders,
      data: JSON.stringify(payload),
      timeout: timeoutMs,
      validateStatus: () => true,
    });

    const duration = Date.now() - startTime;
    const raw =
      typeof response.data === "object"
        ? JSON.stringify(response.data, null, 2)
        : String(response.data ?? "");

    const d = typeof response.data === "object" ? response.data : {};
    const choice = d?.choices?.[0];
    const content: string = choice?.message?.content ?? d?.content?.[0]?.text ?? d?.message?.content ?? "";
    const usage = d?.usage;

    return {
      success: response.status < 400,
      data: {
        url,
        model,
        status: response.status,
        statusText: response.statusText ?? "",
        content,
        inputTokens: usage?.prompt_tokens ?? usage?.input_tokens,
        outputTokens: usage?.completion_tokens ?? usage?.output_tokens,
        totalTokens: usage?.total_tokens,
        finishReason: choice?.finish_reason,
        duration,
        rawBody: raw,
      },
      errorMsg: response.status >= 400 ? `HTTP ${response.status}: ${raw.slice(0, 200)}` : undefined,
    };
  } catch (err: unknown) {
    const duration = Date.now() - startTime;
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      errorMsg: msg,
      data: {
        url,
        model,
        status: 0,
        statusText: "Network Error",
        content: "",
        duration,
        rawBody: "",
      },
    };
  }
}
