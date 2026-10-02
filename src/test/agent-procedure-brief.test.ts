import { describe, it, expect } from "vitest";
import {
  assessBriefReadiness,
  isDetailedProductSpec,
  needsDiscoveryBrief,
  resolveSeedBriefForBuild,
  resolveSeedBriefForBuild,
  previewAllowsNextWave,
  requiresBriefApproval,
} from "@/lib/agent-procedure";
import { DEFAULT_VFS } from "@/lib/vfs";

const MARKETING_BLUEPRINT_SNIPPET =
  "# Digital Marketing Platform: Dev Blueprint\n\n## 1. Product scope\n\n| Module | Core job |\n|---|---|\n| **Contacts/CRM** | Unified profile |\n| **Email marketing** | Campaigns |\n".repeat(
    8
  );

describe("agent-procedure brief gate", () => {
  it("seed workspace requires discovery until brief approved", () => {
    expect(needsDiscoveryBrief("make an app", DEFAULT_VFS, "", false)).toBe(true);
    expect(needsDiscoveryBrief("make an app", DEFAULT_VFS, "", true)).toBe(false);
  });

  it("detailed blueprint skips discovery on seed canvas", () => {
    expect(isDetailedProductSpec(MARKETING_BLUEPRINT_SNIPPET)).toBe(true);
    expect(
      needsDiscoveryBrief("build this (# Digital Marketing Platform", DEFAULT_VFS, MARKETING_BLUEPRINT_SNIPPET, false)
    ).toBe(false);
  });

  it("assessBriefReadiness keeps full combined brief (no 1400 cap)", () => {
    const long = "x".repeat(5000);
    const r = assessBriefReadiness(long, DEFAULT_VFS);
    expect(r.summary.length).toBeGreaterThan(4000);
    expect(r.ready).toBe(true);
  });

  it("assessBriefReadiness rejects very vague seed prompts", () => {
    const vague = assessBriefReadiness("app", DEFAULT_VFS);
    expect(vague.ready).toBe(false);
  });

  it("requiresBriefApproval only on seed canvas", () => {
    expect(requiresBriefApproval(DEFAULT_VFS, false)).toBe(true);
    expect(requiresBriefApproval(DEFAULT_VFS, true)).toBe(false);
  });

  it("resolveSeedBriefForBuild auto-builds when brief is ready", () => {
    const prompt =
      "SaaS marketing platform for agencies: contacts CRM, email campaigns, audience SMB, must-have dashboard + segment builder";
    const r = resolveSeedBriefForBuild(prompt, DEFAULT_VFS, "", false);
    expect(r.action).toBe("build");
    expect(r.merged).toContain("marketing platform");
  });

  it("resolveSeedBriefForBuild waits for detail when vague", () => {
    const r = resolveSeedBriefForBuild("app", DEFAULT_VFS, "", false);
    expect(r.action).toBe("need_detail");
  });

  it("resolveSeedBriefForBuild auto-builds when brief is ready", () => {
    const prompt =
      "SaaS marketing platform for agencies: contacts CRM, email campaigns, audience SMB, must-have dashboard + segment builder";
    const r = resolveSeedBriefForBuild(prompt, DEFAULT_VFS, "", false);
    expect(r.action).toBe("build");
    expect(r.merged).toContain("marketing platform");
  });

  it("resolveSeedBriefForBuild waits for detail when vague", () => {
    const r = resolveSeedBriefForBuild("app", DEFAULT_VFS, "", false);
    expect(r.action).toBe("need_detail");
  });

  it("previewAllowsNextWave only when live", () => {
    expect(previewAllowsNextWave("live")).toBe(true);
    expect(previewAllowsNextWave("error")).toBe(false);
    expect(previewAllowsNextWave("timeout")).toBe(false);
  });
});
