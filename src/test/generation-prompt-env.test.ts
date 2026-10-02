import { describe, it, expect } from "vitest";
import { buildSystemInstruction } from "@/lib/generation-prompt";

describe("generation-prompt env docs contract (Step 4)", () => {
  it("requires .env.example and README for create (not slim fix prompts)", () => {
    const create = buildSystemInstruction("create", "standard");
    expect(create).toContain(".env.example");
    expect(create).toContain("README.md");
    const fix = buildSystemInstruction("fix", "standard");
    expect(fix).not.toContain("ENV & SHIP DOCS");
    expect(fix).toMatch(/surgical patch/i);
  });

  it("slims middle edit waves but keeps env on final harden wave", () => {
    const mid = buildSystemInstruction("edit", "standard", { wave: 1, maxWaves: 3 });
    expect(mid).not.toContain("ENV & SHIP DOCS");
    const harden = buildSystemInstruction("edit", "standard", { wave: 2, maxWaves: 3 });
    expect(harden).toContain(".env.example");
  });

  it("mentions env docs in multi-wave foundation", () => {
    const sys = buildSystemInstruction("create", "standard", {
      wave: 0,
      maxWaves: 2,
    });
    expect(sys).toContain(".env.example");
  });
});
