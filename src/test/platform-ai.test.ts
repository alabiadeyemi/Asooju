import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolvePlatformAi } from "../../api/_lib/platform-ai";

const KEYS = [
  "PLATFORM_AI_PROVIDER",
  "PLATFORM_GEMINI_API_KEY",
  "GEMINI_API_KEY",
  "PLATFORM_DEEPSEEK_API_KEY",
  "DEEPSEEK_API_KEY",
] as const;

const saved: Partial<Record<(typeof KEYS)[number], string | undefined>> = {};

describe("resolvePlatformAi", () => {
  beforeEach(() => {
    for (const k of KEYS) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterEach(() => {
    for (const k of KEYS) {
      const v = saved[k];
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it("honors PLATFORM_AI_PROVIDER=deepseek when DeepSeek key exists", () => {
    process.env.PLATFORM_AI_PROVIDER = "deepseek";
    process.env.PLATFORM_DEEPSEEK_API_KEY = "sk-ds";
    process.env.PLATFORM_GEMINI_API_KEY = "gem";
    const r = resolvePlatformAi();
    expect(r?.provider).toBe("deepseek");
    expect(r?.apiKey).toBe("sk-ds");
  });

  it("honors PLATFORM_AI_PROVIDER=gemini when Gemini key exists", () => {
    process.env.PLATFORM_AI_PROVIDER = "gemini";
    process.env.PLATFORM_GEMINI_API_KEY = "gem";
    process.env.PLATFORM_DEEPSEEK_API_KEY = "sk-ds";
    const r = resolvePlatformAi();
    expect(r?.provider).toBe("gemini");
    expect(r?.apiKey).toBe("gem");
  });

  it("falls back to Gemini if deepseek preferred but only Gemini key set", () => {
    process.env.PLATFORM_AI_PROVIDER = "deepseek";
    process.env.PLATFORM_GEMINI_API_KEY = "gem";
    const r = resolvePlatformAi();
    expect(r?.provider).toBe("gemini");
  });

  it("uses Gemini for inline images even when deepseek is preferred", () => {
    process.env.PLATFORM_AI_PROVIDER = "deepseek";
    process.env.PLATFORM_DEEPSEEK_API_KEY = "sk-ds";
    process.env.PLATFORM_GEMINI_API_KEY = "gem";
    const r = resolvePlatformAi({ needsGemini: true });
    expect(r?.provider).toBe("gemini");
  });

  it("returns null when nothing is configured", () => {
    expect(resolvePlatformAi()).toBeNull();
  });
});
