/**
 * Shared LLM helpers for Vercel/Vite API routes (DeepSeek / OpenAI / Gemini / Claude).
 */

export type LlmMessage = { role: "system" | "user" | "assistant"; content: string };

export function parseJsonLoose(text: string): any {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    if (start === -1) throw new Error("Model did not return JSON.");
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = start; i < cleaned.length; i++) {
      const ch = cleaned[i];
      if (inString) {
        if (escape) escape = false;
        else if (ch === "\\") escape = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') inString = true;
      else if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) return JSON.parse(cleaned.slice(start, i + 1));
      }
    }
    throw new Error("Could not parse model JSON.");
  }
}

export async function callOpenAICompatible(opts: {
  baseURL: string;
  apiKey: string;
  model: string;
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const res = await fetch(`${opts.baseURL.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify({
      model: opts.model,
      temperature: opts.temperature ?? 0.4,
      max_tokens: opts.maxTokens ?? 8192,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || `LLM failed (${res.status})`);
  }
  return data?.choices?.[0]?.message?.content || "";
}

export async function callGemini(opts: {
  apiKey: string;
  model: string;
  system: string;
  user: string;
  temperature?: number;
}): Promise<string> {
  const models = [opts.model, "gemini-2.5-flash", "gemini-flash-latest", "gemini-2.0-flash"];
  let last = "Gemini failed";
  for (const model of [...new Set(models)]) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": opts.apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: `${opts.system}\n\n${opts.user}` }] }],
          generationConfig: {
            temperature: opts.temperature ?? 0.4,
            responseMimeType: "application/json",
          },
        }),
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      last = data?.error?.message || `Gemini ${model} failed (${res.status})`;
      if (res.status === 404) continue;
      throw new Error(last);
    }
    return (data?.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || "").join("");
  }
  throw new Error(last);
}

export async function callClaude(opts: {
  apiKey: string;
  model: string;
  system: string;
  user: string;
}): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": opts.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: 8192,
      system: opts.system,
      messages: [{ role: "user", content: opts.user }],
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `Claude failed (${res.status})`);
  const parts = data?.content || [];
  return parts.map((p: any) => p.text || "").join("");
}

export function pickProviderConfig(provider: string, apiKey: string) {
  const id = provider === "auto" ? "openai" : provider;
  if (id === "deepseek") {
    return {
      kind: "openai" as const,
      baseURL: "https://api.deepseek.com/v1",
      models: ["deepseek-chat", "deepseek-reasoner"],
      apiKey,
    };
  }
  if (id === "grok") {
    return {
      kind: "openai" as const,
      baseURL: "https://api.x.ai/v1",
      models: ["grok-3-mini", "grok-3", "grok-2"],
      apiKey,
    };
  }
  if (id === "openai") {
    return {
      kind: "openai" as const,
      baseURL: "https://api.openai.com/v1",
      models: ["gpt-4o", "gpt-4.1", "gpt-4o-mini"],
      apiKey,
    };
  }
  if (id === "gemini") {
    return {
      kind: "gemini" as const,
      models: ["gemini-2.5-flash", "gemini-flash-latest"],
      apiKey,
    };
  }
  if (id === "claude") {
    return {
      kind: "claude" as const,
      models: ["claude-sonnet-4-20250514", "claude-3-5-sonnet-latest"],
      apiKey,
    };
  }
  throw new Error(`Unsupported provider: ${provider}`);
}

export async function runLlmJson(opts: {
  provider: string;
  apiKey: string;
  system: string;
  user: string;
  temperature?: number;
}): Promise<{ text: string; model: string }> {
  const cfg = pickProviderConfig(opts.provider, opts.apiKey);
  let lastErr: unknown = null;
  for (const model of cfg.models) {
    try {
      if (cfg.kind === "openai") {
        const text = await callOpenAICompatible({
          baseURL: cfg.baseURL,
          apiKey: cfg.apiKey,
          model,
          system: opts.system,
          user: opts.user,
          temperature: opts.temperature,
        });
        return { text, model };
      }
      if (cfg.kind === "gemini") {
        const text = await callGemini({
          apiKey: cfg.apiKey,
          model,
          system: opts.system,
          user: opts.user,
          temperature: opts.temperature,
        });
        return { text, model };
      }
      const text = await callClaude({
        apiKey: cfg.apiKey,
        model,
        system: opts.system,
        user: opts.user,
      });
      return { text, model };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("All models failed");
}
