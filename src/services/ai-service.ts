import OpenAI from "openai";
import {
  buildUserContent,
  buildPlanPrompt,
  buildTalkPrompt,
  extractCompletedFilesFromPartialJson,
  type GenerationOptions,
} from "@/lib/generation-prompt";
import { parsePlanJson, type BuildPlan } from "@/lib/agent-procedure";
import { isSeedWorkspace } from "@/lib/vfs";
import { resilientFetch } from "@/lib/resilient-fetch";
import {
  attachmentPromptBlock,
  dataUrlToInline,
  type ChatAttachment,
} from "@/lib/attachments";
import { classifyBuildScale } from "@/lib/complexity";
import { parseModelJson } from "@/lib/parse-model-json";
import { agentProgressMessage } from "@/lib/agent-identity";

const getActiveProvider = () =>
  (typeof window !== "undefined"
    ? localStorage.getItem("asooju_active_provider")
    : "openai") || "openai";

export const PROVIDER_META: Record<
  string,
  { label: string; placeholder: string; hint: string }
> = {
  openai: { label: "OpenAI", placeholder: "sk-...", hint: "platform.openai.com" },
  gemini: {
    label: "Google Gemini",
    placeholder: "AIza… or AQ.…",
    hint: "aistudio.google.com/apikey",
  },
  claude: { label: "Anthropic Claude", placeholder: "sk-ant-...", hint: "console.anthropic.com" },
  grok: { label: "xAI Grok", placeholder: "xai-...", hint: "console.x.ai" },
  deepseek: {
    label: "DeepSeek",
    placeholder: "sk-...",
    hint: "platform.deepseek.com",
  },
  auto: { label: "Auto", placeholder: "sk-...", hint: "Uses OpenAI if set" },
};

const PROVIDER_ALIASES: Record<string, string[]> = {
  openai: ["openai", "gpt", "chatgpt"],
  gemini: ["gemini", "google", "google gemini", "google ai"],
  grok: ["grok", "xai", "x.ai"],
  claude: ["claude", "anthropic"],
  deepseek: ["deepseek", "deep seek"],
  auto: ["openai", "gpt", "chatgpt"],
};

const STORAGE_KEYS: Record<string, string> = {
  openai: "asooju_openai_key",
  auto: "asooju_openai_key",
  gemini: "asooju_gemini_key",
  grok: "asooju_grok_key",
  claude: "asooju_claude_key",
  deepseek: "asooju_deepseek_key",
};

/** User-pasted BYOK only (localStorage). Platform keys live server-side — never VITE_*. */
export function getByokKey(provider?: string): string {
  if (typeof window === "undefined") return "";
  const id = provider || getActiveProvider();
  const aliases = PROVIDER_ALIASES[id] || [id];
  const storageKey = STORAGE_KEYS[id];
  if (storageKey) {
    const direct = localStorage.getItem(storageKey);
    if (direct) {
      const cleaned = normalizeKey(direct);
      if (cleaned) return cleaned;
    }
  }
  try {
    const keysJson = localStorage.getItem("asooju_keys");
    if (keysJson) {
      const arr = JSON.parse(keysJson) as Array<{ provider?: string; key?: string; value?: string }>;
      for (const row of arr) {
        const p = String(row.provider || "").toLowerCase();
        const raw = row.value || row.key;
        if (aliases.some((a) => p === a || p.includes(a)) && raw) {
          const cleaned = normalizeKey(String(raw));
          if (cleaned) return cleaned;
        }
      }
    }
  } catch {
    /* ignore */
  }
  return "";
}

function normalizeKey(raw: string): string {
  return raw
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[^\x20-\x7E]/g, "");
}

/** BYOK only — platform secrets must never ship in the browser bundle. */
export const getApiKey = (provider: string): string => {
  return getByokKey(provider);
};

/** Preferred chat models (first match wins after live list probe) */
const PREFERRED_MODELS: Record<string, string[]> = {
  openai: ["gpt-4o", "gpt-4.1", "gpt-4o-mini", "gpt-4.1-mini", "o4-mini", "gpt-3.5-turbo"],
  grok: ["grok-4.5", "grok-4.3", "grok-4", "grok-3-mini", "grok-3", "grok-2", "grok-beta"],
  deepseek: ["deepseek-chat", "deepseek-reasoner"],
  claude: [
    "claude-sonnet-4-20250514",
    "claude-sonnet-4-5-20250929",
    "claude-3-5-sonnet-latest",
    "claude-3-5-sonnet-20241022",
    "claude-3-haiku-20240307",
  ],
  gemini: [
    "gemini-3.8-flash",
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-2.5-flash",
    "gemini-flash-latest",
    "gemini-3-flash-preview",
    "gemini-2.5-pro",
    "gemini-pro-latest",
  ],
};

const OPENAI_COMPAT: Record<string, { baseURL: string }> = {
  openai: { baseURL: "https://api.openai.com/v1" },
  auto: { baseURL: "https://api.openai.com/v1" },
  grok: { baseURL: "https://api.x.ai/v1" },
  deepseek: { baseURL: "https://api.deepseek.com/v1" },
};

function modelCacheKey(provider: string) {
  return `asooju_resolved_model_${provider}`;
}

function getCachedModel(provider: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(modelCacheKey(provider));
}

function setCachedModel(provider: string, model: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(modelCacheKey(provider), model);
}

function pickPreferred(available: string[], preferred: string[], fallback: string): string {
  const set = new Set(available.map((m) => m.replace(/^models\//, "")));
  for (const p of preferred) {
    if (set.has(p)) return p;
  }
  // fuzzy: preferred stem in available
  for (const p of preferred) {
    const hit = available.find((a) => a.replace(/^models\//, "").includes(p) || p.includes(a.replace(/^models\//, "")));
    if (hit) return hit.replace(/^models\//, "");
  }
  const first = available[0]?.replace(/^models\//, "");
  return first || fallback;
}

function friendlyProviderError(provider: string, error: unknown): Error {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Request failed";

  if (/401|invalid authentication|API[_ ]?key|unauthenticated|PERMISSION_DENIED|ACCESS_TOKEN/i.test(raw)) {
    if (provider === "gemini") {
      return new Error(
        "Gemini rejected this API key (401). Paste your AI Studio key in Settings → API Keys, set provider to Gemini, and retry — or use platform credits while signed in."
      );
    }
    return new Error(
      `${provider} rejected your API key (401). Update it in Settings → API Keys and confirm that provider is selected.`
    );
  }

  if (/429|quota|RESOURCE_EXHAUSTED/i.test(raw)) {
    return new Error(`${provider} quota exceeded. Check billing / rate limits for that provider.`);
  }

  const short = raw.replace(/\s+/g, " ").slice(0, 220);
  return new Error(short);
}

export interface GenerationAction {
  type: "edit_file" | "delete_file" | "npm_install";
  path?: string;
  content?: string;
  package?: string;
}

export interface GenerationFile {
  path: string;
  content: string;
}

export interface GenerationResponse {
  thought: string;
  plan: string[];
  actions?: GenerationAction[];
  files: GenerationFile[];
  next_paths?: string[];
  /** Plan-mode extras (ignored during build) */
  summary?: string;
  productName?: string;
  approach?: string[];
  waves?: { title?: string; goals?: string[] }[];
  questions?: { id?: string; prompt?: string; question?: string; options?: string[] }[];
  risks?: string[];
  scale?: string;
  mood?: string;
  narration?: string;
  explanation?: string;
  /** Talk-mode only */
  reply?: string;
}

export type GenerationProgressEvent =
  | { type: "status"; message: string }
  | { type: "token"; text: string }
  | { type: "thought"; text: string }
  | { type: "file"; file: GenerationFile; index: number; total: number }
  | { type: "done"; response: GenerationResponse };

export type ProbeResult = {
  success: boolean;
  model?: string;
  models?: string[];
  error?: string;
};

export function parseJsonResponse(text: string): GenerationResponse {
  const { data, recovered, note } = parseModelJson(text);
  const response = normalizeResponse(data);
  if (recovered) {
    const suffix = note || "Partial JSON — applied complete files only.";
    response.thought = [response.thought, suffix].filter(Boolean).join(" ");
  }
  return response;
}

function normalizeResponse(data: any): GenerationResponse {
  const files: GenerationFile[] = Array.isArray(data.files)
    ? data.files
        .filter((f: any) => f && typeof f.path === "string")
        .map((f: any) => ({
          path: String(f.path).replace(/^\.\//, "").replace(/^\/+/, ""),
          content: typeof f.content === "string" ? f.content : "",
        }))
    : [];

  const actions: GenerationAction[] = Array.isArray(data.actions)
    ? data.actions.filter((a: any) => a && a.type)
    : [];

  for (const action of actions) {
    if (
      action.type === "edit_file" &&
      action.path &&
      typeof action.content === "string" &&
      !files.some((f) => f.path === action.path)
    ) {
      files.push({ path: action.path, content: action.content });
    }
  }

  return {
    thought: typeof data.thought === "string" ? data.thought : "Updated workspace.",
    plan: Array.isArray(data.plan) ? data.plan.map(String) : [],
    actions,
    files,
    next_paths: Array.isArray(data.next_paths)
      ? data.next_paths.map(String).filter(Boolean)
      : undefined,
    summary: typeof data.summary === "string" ? data.summary : undefined,
    productName: typeof data.productName === "string" ? data.productName : undefined,
    approach: Array.isArray(data.approach) ? data.approach.map(String) : undefined,
    waves: Array.isArray(data.waves) ? data.waves : undefined,
    questions: Array.isArray(data.questions) ? data.questions : undefined,
    risks: Array.isArray(data.risks) ? data.risks.map(String) : undefined,
    scale: typeof data.scale === "string" ? data.scale : undefined,
    mood: typeof data.mood === "string" ? data.mood : undefined,
    narration: typeof data.narration === "string" ? data.narration : undefined,
    explanation: typeof data.explanation === "string" ? data.explanation : undefined,
    reply: typeof data.reply === "string" ? data.reply : undefined,
  };
}

function extractPartialThought(buffer: string): string | null {
  // Prefer a fully closed JSON string
  const complete = buffer.match(/"thought"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (complete) {
    try {
      return JSON.parse(`"${complete[1]}"`);
    } catch {
      return complete[1].replace(/\\n/g, "\n").replace(/\\"/g, '"');
    }
  }
  // Incomplete — model is still writing the thought field (Cursor-style drip)
  const open = buffer.match(/"thought"\s*:\s*"((?:[^"\\]|\\.)*)/);
  if (!open) return null;
  const raw = open[1];
  try {
    return JSON.parse(`"${raw}"`);
  } catch {
    return raw
      .replace(/\\n/g, "\n")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\")
      .replace(/\\t/g, "\t");
  }
}

function createStreamTracker(onProgress?: (e: GenerationProgressEvent) => void) {
  let buffer = "";
  let lastThought = "";
  const emitted = new Set<string>();

  return {
    push(piece: string) {
      if (!piece) return buffer;
      buffer += piece;
      onProgress?.({ type: "token", text: piece });
      const thought = extractPartialThought(buffer);
      // Only emit when thought grows — avoids identical spam every token
      if (thought && thought.length > lastThought.length) {
        lastThought = thought;
        onProgress?.({ type: "thought", text: thought });
      }

      const partialFiles = extractCompletedFilesFromPartialJson(buffer);
      for (const file of partialFiles) {
        if (emitted.has(file.path)) continue;
        emitted.add(file.path);
        onProgress?.({
          type: "file",
          file,
          index: emitted.size - 1,
          total: Math.max(emitted.size + 1, partialFiles.length),
        });
      }
      return buffer;
    },
    get buffer() {
      return buffer;
    },
    get emitted() {
      return emitted;
    },
  };
}

/** Prompt builders live in @/lib/generation-prompt */

async function listGeminiModels(apiKey: string): Promise<string[]> {
  const res = await resilientFetch(
    "https://generativelanguage.googleapis.com/v1beta/models?pageSize=200",
    { headers: { "x-goog-api-key": apiKey }, retries: 3, timeoutMs: 20000 }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || `Gemini models list failed (${res.status})`);
  }
  return (data.models || [])
    .filter((m: any) => (m.supportedGenerationMethods || []).includes("generateContent"))
    .map((m: any) => String(m.name || "").replace(/^models\//, ""))
    .filter((n: string) => n && !/tts|image|embedding|aqa|robotics|lyria|deep-research/i.test(n));
}

async function resolveGeminiModel(apiKey: string, force = false): Promise<string> {
  if (!force) {
    const cached = getCachedModel("gemini");
    if (cached) return cached;
  }
  const models = await listGeminiModels(apiKey);
  const chosen = pickPreferred(models, PREFERRED_MODELS.gemini, "gemini-2.5-flash");
  setCachedModel("gemini", chosen);
  return chosen;
}

export function providerIdFromLabel(label: string): string {
  const n = String(label || "").toLowerCase();
  if (n.includes("gemini") || n.includes("google")) return "gemini";
  if (n.includes("claude") || n.includes("anthropic")) return "claude";
  if (n.includes("grok") || n.includes("xai")) return "grok";
  if (n.includes("deepseek")) return "deepseek";
  if (n.includes("openai") || n.includes("gpt")) return "openai";
  return n || "openai";
}

function isAuthError(msg: string): boolean {
  return /401|403|invalid.?api.?key|incorrect.?api.?key|authentication|unauthorized|permission.?denied|access_token/i.test(
    msg
  );
}

function isModelMissingError(msg: string): boolean {
  return /model.?not.?found|does not exist|no longer available|unknown model|404|not_found|invalid.?model/i.test(
    msg
  );
}

function candidateModels(preferred: string[], available: string[]): string[] {
  const avail = available.map((m) => m.replace(/^models\//, ""));
  const set = new Set(avail);
  const ordered: string[] = [];
  const push = (id: string) => {
    if (id && !ordered.includes(id)) ordered.push(id);
  };

  // Prefer live list hits first
  for (const p of preferred) {
    if (!set.size || set.has(p)) push(p);
  }
  for (const a of avail) push(a);
  // Always keep preferred as fallbacks (handles stale / partial catalogs)
  for (const p of preferred) push(p);

  return ordered;
}

async function probeOpenAICompatible(provider: string, cleanKey: string): Promise<ProbeResult> {
  const id = provider === "auto" ? "openai" : provider;
  const cfg = OPENAI_COMPAT[id];
  if (!cfg) return { success: false, error: `Unknown provider: ${provider}` };

  const client = new OpenAI({
    apiKey: cleanKey,
    baseURL: cfg.baseURL,
    dangerouslyAllowBrowser: true,
  });

  let models: string[] = [];
  try {
    const listed = await client.models.list();
    models = listed.data.map((m) => m.id);
  } catch (listErr: any) {
    const msg = String(listErr?.message || "");
    if (isAuthError(msg) || listErr?.status === 401) {
      return {
        success: false,
        error: `${PROVIDER_META[id]?.label || id} rejected this API key. Check the key and billing access.`,
      };
    }
    // Some accounts can't list models — still try preferred chat IDs
    models = [];
  }

  const preferred = PREFERRED_MODELS[id] || [];
  const candidates = candidateModels(preferred, models).slice(0, 8);
  let lastError = "No working chat model found.";

  for (const model of candidates) {
    try {
      await client.chat.completions.create({
        model,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 1,
      });
      setCachedModel(id, model);
      return { success: true, model, models: models.length ? models : candidates };
    } catch (error: any) {
      const msg = String(error?.message || error);
      lastError = msg;
      if (isAuthError(msg) || error?.status === 401) {
        return {
          success: false,
          error: `${PROVIDER_META[id]?.label || id} rejected this API key (401).`,
          models,
        };
      }
      if (!isModelMissingError(msg) && error?.status !== 404) {
        // Quota / other hard failures — don't spin forever
        if (/429|quota|billing|insufficient/i.test(msg)) {
          return { success: false, error: msg.slice(0, 220), models };
        }
      }
    }
  }

  return {
    success: false,
    error: lastError.replace(/\s+/g, " ").slice(0, 220),
    models: models.length ? models : candidates,
  };
}

async function probeClaude(cleanKey: string): Promise<ProbeResult> {
  const candidates = PREFERRED_MODELS.claude;
  let lastError = "Claude probe failed.";

  for (const model of candidates) {
    try {
      const res = await fetch("/api/claude", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": cleanKey,
        },
        body: JSON.stringify({
          model,
          max_tokens: 16,
          messages: [{ role: "user", content: "ping" }],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setCachedModel("claude", model);
        return { success: true, model, models: candidates };
      }
      const msg = String(data?.error?.message || data?.error || `Claude error (${res.status})`);
      lastError = msg;
      if (res.status === 401 || isAuthError(msg)) {
        return { success: false, error: "Claude rejected this API key (401)." };
      }
      if (!isModelMissingError(msg) && res.status !== 404) {
        if (/429|quota|billing/i.test(msg)) return { success: false, error: msg.slice(0, 220) };
      }
    } catch (error: any) {
      lastError =
        error?.message ||
        "Claude proxy unreachable. Use npm run dev (Vite proxy) or deploy /api/claude.";
      break;
    }
  }

  return { success: false, error: lastError.replace(/\s+/g, " ").slice(0, 220) };
}

/** Probe key + auto-select best available model for a provider */
export const probeProvider = async (provider: string, key: string): Promise<ProbeResult> => {
  const cleanKey = normalizeKey(key);
  if (!cleanKey) return { success: false, error: "Empty API key." };

  try {
    if (provider === "gemini") {
      const models = await listGeminiModels(cleanKey);
      if (!models.length) return { success: false, error: "No Gemini chat models available." };
      const candidates = candidateModels(PREFERRED_MODELS.gemini, models).slice(0, 8);
      let lastError = "Gemini probe failed.";
      for (const model of candidates) {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": cleanKey,
            },
            body: JSON.stringify({ contents: [{ parts: [{ text: "ping" }] }] }),
          }
        );
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          setCachedModel("gemini", model);
          return { success: true, model, models };
        }
        const msg = String(data?.error?.message || `Gemini probe failed (${res.status})`);
        lastError = msg;
        if (res.status === 401 || isAuthError(msg)) {
          return {
            success: false,
            error:
              "Gemini rejected this API key. Use an AI Studio key (AIza… or AQ.…) from aistudio.google.com/apikey.",
            models,
          };
        }
      }
      return { success: false, error: lastError.replace(/\s+/g, " ").slice(0, 220), models };
    }

    if (provider === "claude") {
      return await probeClaude(cleanKey);
    }

    return await probeOpenAICompatible(provider, cleanKey);
  } catch (error: any) {
    return { success: false, error: String(error?.message || "Probe failed.").slice(0, 220) };
  }
};

export const validateOpenAIKey = async (key: string) => probeProvider("openai", key);
export const validateGrokKey = async (key: string) => probeProvider("grok", key);
export const validateGeminiKey = async (key: string) => probeProvider("gemini", key);
export const validateClaudeKey = async (key: string) => probeProvider("claude", key);
export const validateDeepSeekKey = async (key: string) => probeProvider("deepseek", key);

async function generateWithClaude(
  apiKey: string,
  system: string,
  userContent: string,
  onProgress?: (e: GenerationProgressEvent) => void,
  attachments: ChatAttachment[] = []
): Promise<{ response: GenerationResponse; emitted: Set<string> }> {
  const cached = getCachedModel("claude");
  const candidates = candidateModels(PREFERRED_MODELS.claude, cached ? [cached] : []).slice(0, 5);
  let lastError: unknown = null;
  const tracker = createStreamTracker(onProgress);

  const contentBlocks: Array<Record<string, unknown>> = [{ type: "text", text: userContent }];
  for (const a of attachments) {
    if (a.kind !== "image" || !a.dataUrl?.startsWith("data:")) continue;
    const inline = dataUrlToInline(a.dataUrl);
    if (!inline) continue;
    contentBlocks.push({
      type: "image",
      source: {
        type: "base64",
        media_type: inline.mimeType,
        data: inline.data,
      },
    });
  }

  for (const model of candidates) {
    onProgress?.({ type: "status", message: agentProgressMessage("thinking") });
    try {
      const res = await resilientFetch("/api/claude", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({
          model,
          max_tokens: 8192,
          system,
          messages: [{ role: "user", content: contentBlocks }],
        }),
        retries: 3,
        timeoutMs: 120000,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = String(data?.error?.message || data?.error || `Claude failed (${res.status})`);
        lastError = new Error(msg);
        if (res.status === 401 || isAuthError(msg)) throw lastError;
        if (!isModelMissingError(msg) && res.status !== 404) throw lastError;
        continue;
      }
      setCachedModel("claude", model);
      const text =
        data?.content?.map((c: any) => c.text || "").join("") ||
        data?.content?.[0]?.text ||
        "";
      tracker.push(text);
      return { response: parseJsonResponse(text), emitted: tracker.emitted };
    } catch (error) {
      lastError = error;
      const msg = String((error as any)?.message || error);
      if (isAuthError(msg)) throw error;
      if (!isModelMissingError(msg)) throw error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Claude generation failed.");
}

function extractGeminiText(payload: any): string {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts.map((p: any) => p.text || "").join("");
}

async function generateWithGemini(
  apiKey: string,
  system: string,
  userContent: string,
  onProgress?: (e: GenerationProgressEvent) => void,
  creative = false,
  attachments: ChatAttachment[] = []
): Promise<{ response: GenerationResponse; emitted: Set<string> }> {
  const cleanKey = normalizeKey(apiKey);
  if (!cleanKey) {
    throw new Error(
      "Missing Gemini API key. Paste it in Settings → API Keys, or sign in to use platform credits."
    );
  }

  let model = await resolveGeminiModel(cleanKey);
  onProgress?.({ type: "status", message: agentProgressMessage("thinking") });
  const tracker = createStreamTracker(onProgress);

  const parts: any[] = [{ text: `${system}\n\n${userContent}` }];
  for (const a of attachments) {
    if (a.kind === "image" && a.dataUrl) {
      const inline = dataUrlToInline(a.dataUrl);
      if (inline) parts.push({ inlineData: { mimeType: inline.mimeType, data: inline.data } });
    }
  }

  const body = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: creative ? 0.85 : 0.4,
      responseMimeType: "application/json",
    },
  };

  const tryOnce = async (modelId: string) => {
    const streamUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:streamGenerateContent?alt=sse`;
    try {
      const res = await resilientFetch(streamUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": cleanKey,
        },
        body: JSON.stringify(body),
        retries: 3,
        timeoutMs: 90000,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || `Gemini stream failed (${res.status})`);
      }
      if (!res.body) throw new Error("No stream body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let sseBuf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        sseBuf += decoder.decode(value, { stream: true });
        const chunks = sseBuf.split("\n");
        sseBuf = chunks.pop() || "";
        for (const line of chunks) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const raw = trimmed.slice(5).trim();
          if (!raw || raw === "[DONE]") continue;
          try {
            const json = JSON.parse(raw);
            const piece = extractGeminiText(json);
            if (piece) tracker.push(piece);
          } catch {
            /* ignore partial SSE */
          }
        }
      }
      if (tracker.buffer.trim()) {
        return { response: parseJsonResponse(tracker.buffer), emitted: tracker.emitted };
      }
      throw new Error("Empty Gemini stream");
    } catch (streamErr: any) {
      if (/401|invalid authentication|API[_ ]?key|ACCESS_TOKEN/i.test(String(streamErr?.message || ""))) {
        throw streamErr;
      }
      onProgress?.({ type: "status", message: "Stream dropped — retrying once…" });
      const res = await resilientFetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": cleanKey,
          },
          body: JSON.stringify(body),
          retries: 2,
          timeoutMs: 90000,
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error?.message || `Gemini failed (${res.status})`);
      }
      const text = extractGeminiText(data);
      tracker.push(text);
      return { response: parseJsonResponse(text), emitted: tracker.emitted };
    }
  };

  try {
    return await tryOnce(model);
  } catch (error: any) {
    if (/no longer available|NOT_FOUND|404/i.test(String(error?.message || ""))) {
      onProgress?.({ type: "status", message: "Refreshing Gemini models…" });
      model = await resolveGeminiModel(cleanKey, true);
      onProgress?.({ type: "status", message: agentProgressMessage("thinking") });
      return await tryOnce(model);
    }
    throw error;
  }
}

async function generateWithOpenAICompatible(
  provider: string,
  apiKey: string,
  system: string,
  userContent: string,
  onProgress?: (e: GenerationProgressEvent) => void,
  creative = false,
  attachments: ChatAttachment[] = []
): Promise<{ response: GenerationResponse; emitted: Set<string> }> {
  const id = provider === "auto" ? "openai" : provider;
  const cfg = OPENAI_COMPAT[id];
  if (!cfg) throw new Error(`Unsupported provider: ${provider}`);

  const openai = new OpenAI({ apiKey, baseURL: cfg.baseURL, dangerouslyAllowBrowser: true });

  let listed: string[] = [];
  try {
    const res = await openai.models.list();
    listed = res.data.map((m) => m.id);
  } catch {
    listed = [];
  }

  const cached = getCachedModel(id);
  const preferred = PREFERRED_MODELS[id] || [];
  const seed = cached ? [cached, ...preferred] : preferred;
  const candidates = candidateModels(seed, listed).slice(0, 6);
  let lastError: unknown = null;

  const imageParts = attachments
    .filter((a) => a.kind === "image" && a.dataUrl)
    .map((a) => ({
      type: "image_url" as const,
      image_url: { url: a.dataUrl as string },
    }));

  const userMessage: OpenAI.Chat.ChatCompletionMessageParam =
    imageParts.length > 0
      ? {
          role: "user",
          content: [{ type: "text", text: userContent }, ...imageParts],
        }
      : { role: "user", content: userContent };

  for (const model of candidates) {
    onProgress?.({ type: "status", message: agentProgressMessage("thinking") });
    const tracker = createStreamTracker(onProgress);
    let attempt = 0;
    while (attempt < 3) {
      attempt++;
      try {
        const stream = await openai.chat.completions.create({
          model,
          messages: [
            { role: "system", content: system },
            userMessage,
          ],
          response_format: { type: "json_object" },
          temperature: creative ? 0.85 : 0.35,
          stream: true,
        });

        for await (const chunk of stream) {
          const piece = chunk.choices[0]?.delta?.content || "";
          if (piece) tracker.push(piece);
        }

        setCachedModel(id, model);
        return { response: parseJsonResponse(tracker.buffer), emitted: tracker.emitted };
      } catch (error: any) {
        lastError = error;
        const msg = String(error?.message || error);
        if (isAuthError(msg) || error?.status === 401) throw error;
        if (isModelMissingError(msg) || error?.status === 404) break;
        const transient =
          error?.status === 429 ||
          error?.status >= 500 ||
          /failed to fetch|timeout|network|ECONNRESET/i.test(msg);
        if (transient && attempt < 3) {
          onProgress?.({ type: "status", message: `Network blip — retry ${attempt}/3…` });
          await new Promise((r) => setTimeout(r, 600 * attempt));
          continue;
        }
        throw error;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`${id} generation failed — no working model.`);
}

async function emitFiles(
  response: GenerationResponse,
  onProgress?: (e: GenerationProgressEvent) => void,
  alreadyEmitted?: Set<string>
) {
  const files = response.files || [];
  const remaining = alreadyEmitted
    ? files.filter((f) => !alreadyEmitted.has(f.path))
    : files;
  const base = alreadyEmitted?.size || 0;
  for (let i = 0; i < remaining.length; i++) {
    onProgress?.({
      type: "file",
      file: remaining[i],
      index: base + i,
      total: files.length,
    });
    await new Promise((r) => setTimeout(r, 25));
  }
  onProgress?.({ type: "done", response });
}

/** Streaming generation with progressive file events */
export const generateArchitectureStream = async (
  prompt: string,
  vfs: Record<string, string>,
  currentErrors?: string,
  onProgress?: (e: GenerationProgressEvent) => void,
  options?: GenerationOptions
): Promise<GenerationResponse> => {
  const activeProvider = getActiveProvider();
  const byokKey = getByokKey(activeProvider);
  const envOrByok = getApiKey(activeProvider);

  let usePlatform = false;
  if (byokKey) {
    usePlatform = false;
  } else if (typeof window !== "undefined") {
    const { supabase } = await import("@/integrations/supabase/client");
    const {
      data: { session },
    } = await supabase.auth.getSession();
    // Signed-in users without BYOK → metered platform key (Lovable-style free credits)
    usePlatform = Boolean(session?.access_token);
    if (!usePlatform && !envOrByok) {
      throw new Error(
        "Sign in to use 5 free platform prompts, or add your own API key under Settings (BYOK)."
      );
    }
  }

  const apiKey = byokKey || (!usePlatform ? envOrByok : "");

  if (!usePlatform && !apiKey) {
    const meta = PROVIDER_META[activeProvider];
    throw new Error(
      `Missing ${meta?.label || activeProvider} API key. Add it under Settings → API Keys.`
    );
  }

  if (usePlatform) {
    onProgress?.({ type: "status", message: agentProgressMessage("using platform credits") });
  }

  const slot = STORAGE_KEYS[activeProvider];
  if (slot && typeof window !== "undefined" && byokKey) {
    localStorage.setItem(slot, byokKey);
  }

  const attachments = options?.attachments || [];
  const attachmentNote = options?.attachmentNote || attachmentPromptBlock(attachments);

  const scale =
    options?.scale ||
    classifyBuildScale(prompt, Object.keys(vfs).length);

  const { userContent, system, intent, replaceSeed } = buildUserContent(prompt, vfs, {
    projectName: options?.projectName,
    currentErrors: currentErrors || options?.currentErrors,
    attachmentNote,
    wave: options?.wave,
    targetPaths: options?.targetPaths,
    scale,
    workspacePurpose: options?.workspacePurpose,
    conversationContext: options?.conversationContext,
    terminalDigest: options?.terminalDigest,
    workspaceMemory: options?.workspaceMemory,
    priorFixNote: options?.priorFixNote,
    fixAttempt: options?.fixAttempt,
    diagnosis: options?.diagnosis,
  });

  const waveLabel =
    typeof options?.wave === "number"
      ? ` · step ${(options.wave || 0) + 1}`
      : "";

  onProgress?.({
    type: "status",
    message:
      intent === "create"
        ? `Designing a unique app${waveLabel}…`
        : intent === "fix"
          ? "Diagnosing preview errors…"
          : intent === "style"
            ? "Polishing visuals…"
            : `Planning edits${waveLabel}…`,
  });

  if (attachments.length) {
    onProgress?.({
      type: "status",
      message: `Reading ${attachments.length} attachment${attachments.length === 1 ? "" : "s"}…`,
    });
  }

  if (replaceSeed || isSeedWorkspace(vfs)) {
    onProgress?.({
      type: "status",
      message: "Replacing blank starter with a fresh build…",
    });
  }

  const creative = intent === "create";
  let packed: { response: GenerationResponse; emitted: Set<string> };

  try {
    if (usePlatform) {
      packed = await generateWithPlatformGemini(system, userContent, onProgress, creative, attachments);
    } else if (activeProvider === "claude") {
      packed = await generateWithClaude(apiKey, system, userContent, onProgress, attachments);
    } else if (activeProvider === "gemini") {
      packed = await generateWithGemini(
        apiKey,
        system,
        userContent,
        onProgress,
        creative,
        attachments
      );
    } else {
      packed = await generateWithOpenAICompatible(
        activeProvider,
        apiKey,
        system,
        userContent,
        onProgress,
        creative,
        attachments
      );
    }
  } catch (error) {
    throw friendlyProviderError(usePlatform ? "gemini" : activeProvider, error);
  }

  const { response, emitted } = packed;
  if (response.thought) onProgress?.({ type: "thought", text: response.thought });
  await emitFiles(response, onProgress, emitted);
  return response;
};

async function generateWithPlatformGemini(
  system: string,
  userContent: string,
  onProgress?: (e: GenerationProgressEvent) => void,
  creative = false,
  attachments: ChatAttachment[] = []
): Promise<{ response: GenerationResponse; emitted: Set<string> }> {
  const { supabase } = await import("@/integrations/supabase/client");
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Sign in to use your free platform prompts, or add your own API key (BYOK).");
  }

  onProgress?.({ type: "status", message: agentProgressMessage("thinking") });
  const tracker = createStreamTracker(onProgress);

  const inlineImages = attachments
    .filter((a) => a.kind === "image" && a.dataUrl)
    .map((a) => dataUrlToInline(a.dataUrl!))
    .filter(Boolean);

  const res = await resilientFetch("/api/ai/gemini", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      system,
      userContent,
      creative,
      inlineImages,
    }),
    retries: 2,
    timeoutMs: 120000,
  });

  const rawText = await res.text().catch(() => "");
  let data: any = {};
  try {
    data = rawText ? JSON.parse(rawText) : {};
  } catch {
    data = {};
  }
  if (res.status === 402 || data?.error === "NO_CREDITS") {
    throw new Error(
      data?.message ||
        "You’ve used your free platform prompts. Upgrade to Pro or add your own API key (BYOK)."
    );
  }
  if (!res.ok) {
    // nginx/static hosts return HTML 405 when /api/* is not proxied to Node
    if (
      res.status === 405 ||
      (/nginx|405 Not Allowed|<!doctype html/i.test(rawText) && res.status >= 400)
    ) {
      throw new Error(
        "Platform API is unreachable (HTTP 405). /api must be proxied to the Node API — static nginx alone cannot run generation. Use BYOK under Settings, or fix hosting (see HOW_TO_RUN)."
      );
    }
    throw new Error(data?.error || `Platform generation failed (${res.status})`);
  }

  const text = String(data.text || "");
  // Platform path is buffered server-side — drip the thought locally so the UI
  // doesn't sit blank then dump everything at once.
  const thoughtMatch = text.match(/"thought"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (thoughtMatch) {
    let decoded = thoughtMatch[1];
    try {
      decoded = JSON.parse(`"${thoughtMatch[1]}"`);
    } catch {
      decoded = thoughtMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"');
    }
    const step = Math.max(12, Math.ceil(decoded.length / 24));
    for (let i = step; i < decoded.length; i += step) {
      onProgress?.({ type: "thought", text: decoded.slice(0, i) });
      await new Promise((r) => setTimeout(r, 16));
    }
    onProgress?.({ type: "thought", text: decoded });
  }
  tracker.push(text);
  onProgress?.({
    type: "status",
    message:
      data.remaining != null
        ? agentProgressMessage(`${data.remaining} platform credits left`)
        : agentProgressMessage("reply ready"),
  });
  return { response: parseJsonResponse(text), emitted: tracker.emitted };
}

export const generateArchitecture = async (
  prompt: string,
  vfs: Record<string, string>,
  currentErrors?: string,
  options?: GenerationOptions
): Promise<GenerationResponse> =>
  generateArchitectureStream(prompt, vfs, currentErrors, undefined, options);

/** Lovable Plan mode — structured plan + questions, no code files. */
export const generateBuildPlan = async (
  prompt: string,
  vfs: Record<string, string>,
  onProgress?: (e: GenerationProgressEvent) => void,
  options?: GenerationOptions
): Promise<BuildPlan> => {
  const activeProvider = getActiveProvider();
  const byokKey = getByokKey(activeProvider);
  const envOrByok = getApiKey(activeProvider);

  let usePlatform = false;
  if (byokKey) {
    usePlatform = false;
  } else if (typeof window !== "undefined") {
    const { supabase } = await import("@/integrations/supabase/client");
    const {
      data: { session },
    } = await supabase.auth.getSession();
    usePlatform = Boolean(session?.access_token);
    if (!usePlatform && !envOrByok) {
      throw new Error(
        "Sign in to use platform credits, or add your own API key under Settings (BYOK)."
      );
    }
  }

  const apiKey = byokKey || (!usePlatform ? envOrByok : "");
  if (!usePlatform && !apiKey) {
    const meta = PROVIDER_META[activeProvider];
    throw new Error(
      `Missing ${meta?.label || activeProvider} API key. Add it under Settings → API Keys.`
    );
  }

  const attachments = options?.attachments || [];
  const attachmentNote = options?.attachmentNote || attachmentPromptBlock(attachments);
  const scale = options?.scale || classifyBuildScale(prompt, Object.keys(vfs).length);
  const { system, userContent } = buildPlanPrompt(prompt, vfs, {
    projectName: options?.projectName,
    attachmentNote,
    scale,
  });

  onProgress?.({ type: "status", message: "Drafting a build plan…" });

  const creative = false;
  let packed: { response: GenerationResponse; emitted: Set<string> };

  try {
    if (usePlatform) {
      packed = await generateWithPlatformGemini(system, userContent, onProgress, creative, attachments);
    } else if (activeProvider === "claude") {
      packed = await generateWithClaude(apiKey, system, userContent, onProgress, attachments);
    } else if (activeProvider === "gemini") {
      packed = await generateWithGemini(
        apiKey,
        system,
        userContent,
        onProgress,
        creative,
        attachments
      );
    } else {
      packed = await generateWithOpenAICompatible(
        activeProvider,
        apiKey,
        system,
        userContent,
        onProgress,
        creative,
        attachments
      );
    }
  } catch (error) {
    throw friendlyProviderError(usePlatform ? "gemini" : activeProvider, error);
  }

  const plan = parsePlanJson(
    {
      summary: packed.response.summary || packed.response.thought,
      productName: packed.response.productName,
      approach: packed.response.approach || packed.response.plan,
      waves: packed.response.waves,
      questions: packed.response.questions,
      risks: packed.response.risks,
      scale: packed.response.scale || scale,
    },
    scale
  );
  onProgress?.({ type: "thought", text: plan.summary });
  return plan;
};

export type TalkReply = { reply: string; mood?: string; thought?: string };

/** Talk mode — conversational answer, never emits files. */
export const generateTalkReply = async (
  prompt: string,
  vfs: Record<string, string>,
  onProgress?: (e: GenerationProgressEvent) => void,
  options?: GenerationOptions
): Promise<TalkReply> => {
  const activeProvider = getActiveProvider();
  const byokKey = getByokKey(activeProvider);
  const envOrByok = getApiKey(activeProvider);

  let usePlatform = false;
  if (byokKey) {
    usePlatform = false;
  } else if (typeof window !== "undefined") {
    const { supabase } = await import("@/integrations/supabase/client");
    const {
      data: { session },
    } = await supabase.auth.getSession();
    usePlatform = Boolean(session?.access_token);
    if (!usePlatform && !envOrByok) {
      throw new Error(
        "Sign in to use platform credits, or add your own API key under Settings (BYOK)."
      );
    }
  }

  const apiKey = byokKey || (!usePlatform ? envOrByok : "");
  if (!usePlatform && !apiKey) {
    const meta = PROVIDER_META[activeProvider];
    throw new Error(
      `Missing ${meta?.label || activeProvider} API key. Add it under Settings → API Keys.`
    );
  }

  const attachments = options?.attachments || [];
  const attachmentNote = options?.attachmentNote || attachmentPromptBlock(attachments);

  const { system, userContent } = buildTalkPrompt(prompt, vfs, {
    projectName: options?.projectName,
    workspacePurpose: options?.workspacePurpose,
    conversationContext: options?.conversationContext,
    terminalDigest: options?.terminalDigest,
    workspaceMemory: options?.workspaceMemory,
    discovery: options?.discovery,
    attachmentNote,
    attachments,
  });

  if (attachments.length) {
    onProgress?.({
      type: "status",
      message: `Reading ${attachments.length} attachment${attachments.length === 1 ? "" : "s"}…`,
    });
  }

  onProgress?.({
    type: "status",
    message: options?.discovery
      ? "Figuring out what you want (no plan/build yet)…"
      : "Thinking (Talk — no file writes)…",
  });

  let packed: { response: GenerationResponse; emitted: Set<string> };
  try {
    if (usePlatform) {
      packed = await generateWithPlatformGemini(
        system,
        userContent,
        onProgress,
        false,
        attachments
      );
    } else if (activeProvider === "claude") {
      packed = await generateWithClaude(apiKey, system, userContent, onProgress, attachments);
    } else if (activeProvider === "gemini") {
      packed = await generateWithGemini(
        apiKey,
        system,
        userContent,
        onProgress,
        false,
        attachments
      );
    } else {
      packed = await generateWithOpenAICompatible(
        activeProvider,
        apiKey,
        system,
        userContent,
        onProgress,
        false,
        attachments
      );
    }
  } catch (error) {
    throw friendlyProviderError(usePlatform ? "gemini" : activeProvider, error);
  }

  const r = packed.response as GenerationResponse & { reply?: string };
  const reply =
    (typeof r.reply === "string" && r.reply.trim()) ||
    r.explanation?.trim() ||
    r.narration?.trim() ||
    r.thought?.trim() ||
    "I’m here — ask me anything about the project. Switch to Build when you want file changes.";

  if (r.thought) onProgress?.({ type: "thought", text: r.thought });
  return { reply, mood: r.mood, thought: r.thought };
};

