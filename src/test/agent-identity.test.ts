import { describe, it, expect } from "vitest";
import {
  AGENT_IDENTITY_RULES,
  SHIPKERNEL_AGENT_NAME,
  agentProgressMessage,
} from "@/lib/agent-identity";
import { AGENT_VOICE_RULES } from "@/lib/agent-voice";
import { buildTalkPrompt } from "@/lib/generation-prompt";

describe("agent-identity", () => {
  it("defines ShipKernel AI as the public agent name", () => {
    expect(SHIPKERNEL_AGENT_NAME).toBe("ShipKernel AI");
  });

  it("forbids vendor cosplay but allows ShipKernel pride", () => {
    expect(AGENT_IDENTITY_RULES).toMatch(/ShipKernel AI/);
    expect(AGENT_IDENTITY_RULES).toMatch(/Do NOT claim to be Claude/);
    expect(AGENT_IDENTITY_RULES).toMatch(/DeepSeek/);
    expect(AGENT_IDENTITY_RULES).toMatch(/SHIPKERNEL PRIDE/);
  });

  it("injects identity into voice rules", () => {
    expect(AGENT_VOICE_RULES).toContain(AGENT_IDENTITY_RULES.trim());
  });

  it("expects humor in voice rules", () => {
    expect(AGENT_VOICE_RULES).toMatch(/HUMOR/);
    expect(AGENT_VOICE_RULES).toMatch(/actually funny/i);
  });

  it("talk prompt uses ShipKernel AI and meta guidance", () => {
    const { system } = buildTalkPrompt("hi", { "App.tsx": "" }, { discovery: true });
    expect(system).toContain("ShipKernel AI");
    expect(system).toMatch(/not Claude\/Gemini\/DeepSeek/i);
  });

  it("progress messages hide vendor names", () => {
    expect(agentProgressMessage("thinking")).toBe("ShipKernel AI — thinking…");
    expect(agentProgressMessage("thinking")).not.toMatch(/Claude|DeepSeek|Gemini/i);
  });
});
