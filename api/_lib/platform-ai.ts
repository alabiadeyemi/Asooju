/**
 * Resolve which server-held provider powers platform (non-BYOK) generation.
 * Honors PLATFORM_AI_PROVIDER, then falls back to whichever key is present.
 */

export type PlatformAiProvider = "gemini" | "deepseek";

export type PlatformAiConfig = {
  provider: PlatformAiProvider;
  apiKey: string;
  /** Why this provider was chosen (for logs / admin health). */
  reason: string;
};

function geminiKey(): string {
  return (
    process.env.PLATFORM_GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    ""
  ).trim();
}

function deepseekKey(): string {
  return (
    process.env.PLATFORM_DEEPSEEK_API_KEY ||
    process.env.DEEPSEEK_API_KEY ||
    ""
  ).trim();
}

export function preferredPlatformProvider(): PlatformAiProvider | null {
  const raw = String(process.env.PLATFORM_AI_PROVIDER || "")
    .toLowerCase()
    .trim();
  if (raw === "deepseek") return "deepseek";
  if (raw === "gemini") return "gemini";
  return null;
}

/**
 * Pick platform provider + key.
 * Prefer explicit PLATFORM_AI_PROVIDER when that key exists; otherwise use any configured key.
 * Returns null when nothing is configured.
 */
export function resolvePlatformAi(opts?: {
  /** Gemini-only features (inline images). Prefer Gemini when a key exists. */
  needsGemini?: boolean;
}): PlatformAiConfig | null {
  const preferred = preferredPlatformProvider();
  const gKey = geminiKey();
  const dKey = deepseekKey();

  if (opts?.needsGemini && gKey) {
    return {
      provider: "gemini",
      apiKey: gKey,
      reason: preferred === "deepseek"
        ? "inline images require gemini; using PLATFORM_GEMINI_API_KEY"
        : "gemini (images)",
    };
  }

  if (preferred === "deepseek" && dKey) {
    return { provider: "deepseek", apiKey: dKey, reason: "PLATFORM_AI_PROVIDER=deepseek" };
  }
  if (preferred === "gemini" && gKey) {
    return { provider: "gemini", apiKey: gKey, reason: "PLATFORM_AI_PROVIDER=gemini" };
  }

  // Preferred set but that key missing — fall back to the other if available.
  if (preferred === "deepseek" && gKey) {
    return {
      provider: "gemini",
      apiKey: gKey,
      reason: "PLATFORM_AI_PROVIDER=deepseek but no DeepSeek key; using Gemini",
    };
  }
  if (preferred === "gemini" && dKey) {
    return {
      provider: "deepseek",
      apiKey: dKey,
      reason: "PLATFORM_AI_PROVIDER=gemini but no Gemini key; using DeepSeek",
    };
  }

  // No preference: prefer DeepSeek if only that exists, else Gemini (historical default).
  if (dKey && !gKey) {
    return { provider: "deepseek", apiKey: dKey, reason: "only PLATFORM_DEEPSEEK_API_KEY set" };
  }
  if (gKey) {
    return { provider: "gemini", apiKey: gKey, reason: preferred ? "fallback gemini" : "default gemini" };
  }
  if (dKey) {
    return { provider: "deepseek", apiKey: dKey, reason: "fallback deepseek" };
  }
  return null;
}

export function platformAiNotConfiguredMessage(): string {
  return "Platform AI is not configured (set PLATFORM_AI_PROVIDER plus PLATFORM_GEMINI_API_KEY or PLATFORM_DEEPSEEK_API_KEY).";
}
