import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Load .env file manually (tsx doesn't support --env-file reliably)
function loadEnvFile(): void {
  try {
    // Try multiple locations: cwd, project root (relative to this file)
    const candidates = [
      resolve(process.cwd(), ".env"),
      resolve(new URL(".", import.meta.url).pathname, "../../.env"),
    ];
    let envPath = "";
    for (const candidate of candidates) {
      try {
        readFileSync(candidate);
        envPath = candidate;
        break;
      } catch { /* try next */ }
    }
    if (!envPath) return;
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env file not found — that's fine, use process.env as-is
  }
}

loadEnvFile();

// Log LLM configuration status at startup
console.log(`[LLM Config] API Key: ${process.env.LLM_API_KEY ? "configured" : "NOT SET"}`);
console.log(`[LLM Config] Base URL: ${process.env.LLM_BASE_URL ? "custom" : "default (openai)"}`);
console.log(`[LLM Config] Model: ${process.env.LLM_MODEL || "gpt-4o-mini"}`);

export interface LLMConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export function getLLMConfig(): LLMConfig | null {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) return null;

  return {
    apiKey,
    baseUrl: process.env.LLM_BASE_URL || "https://api.openai.com/v1",
    model: process.env.LLM_MODEL || "gpt-4o-mini",
  };
}

export function isLLMConfigured(): boolean {
  return getLLMConfig() !== null;
}

/**
 * Call an OpenAI-compatible chat completions endpoint.
 * Works with OpenAI, Azure OpenAI, Ollama, LM Studio, etc.
 */
export async function callLLM(
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const config = getLLMConfig();
  if (!config) throw new Error("LLM not configured: set LLM_API_KEY");

  const url = `${config.baseUrl}/chat/completions`;
  const body: Record<string, unknown> = {
    model: config.model,
    messages: [
      { role: "system", content: systemPrompt + "\n\nIMPORTANT: Return ONLY valid JSON. No markdown, no explanation, no code fences." },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.3,
  };

  // Only add response_format for known-supported providers (OpenAI)
  if (config.baseUrl.includes("openai.com")) {
    body.response_format = { type: "json_object" };
  }

  let lastError: Error | null = null;

  // Single retry with 1s delay, 30s timeout per attempt
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      console.log(`[LLM] Attempt ${attempt + 1}, calling ${config.model}...`);
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`LLM API ${response.status}: ${text}`);
      }

      const data = (await response.json()) as {
        choices: Array<{ message: { content: string } }>;
      };

      const content = data.choices[0].message.content;
      console.log(`[LLM] Response received (${content.length} chars)`);

      // Strip markdown code fences if present
      const cleaned = content.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
      return cleaned;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`[LLM] Attempt ${attempt + 1} failed:`, lastError.message);
      if (attempt === 0) await new Promise((r) => setTimeout(r, 1000));
    }
  }

  throw lastError!;
}
