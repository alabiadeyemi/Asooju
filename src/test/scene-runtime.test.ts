import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";
import { diagnoseWorkspace } from "@/lib/agent-intelligence";
import { classifyBuildScale, needsPersistentBackend } from "@/lib/complexity";
import { mergeExportPackageJson } from "@/lib/export-deps";
import { buildSystemInstruction } from "@/lib/generation-prompt";

describe("three.js scene runtime", () => {
  it("gives a driving-game brief more room without forcing a backend", () => {
    expect(classifyBuildScale("low-poly browser driving game")).toBe("standard");
    expect(needsPersistentBackend("low-poly browser driving game")).toBe(false);
  });

  it("does not treat ordinary copy as a 3D scene", () => {
    expect(classifyBuildScale("three pricing tiers on a landing page")).toBe("simple");
    expect(classifyBuildScale("a tiny landing page")).toBe("simple");
    expect(needsPersistentBackend("a tiny landing page")).toBe(false);
  });

  it("still opts a game into a backend when the brief asks for accounts", () => {
    expect(needsPersistentBackend("browser game with login")).toBe(true);
  });

  it("adds three to an export only when the app imports it", () => {
    const game = JSON.parse(
      mergeExportPackageJson("Game", {
        "App.tsx": `import * as THREE from "three"; export default function App(){return null}`,
      })
    );
    expect(game.dependencies.three).toBe("0.160.1");

    const dash = JSON.parse(
      mergeExportPackageJson("Dash", {
        "App.tsx": `import React from "react"; export default function App(){return null}`,
      })
    );
    expect(dash.dependencies.three).toBeUndefined();
  });

  it("tells the agent three is opt-in and subpath imports are banned", () => {
    const sys = buildSystemInstruction("create", "simple");
    expect(sys).toContain('import * as THREE from "three"');
    expect(sys).toContain("three/examples");
    expect(sys).toMatch(/non-3D apps/);
  });

  it("asks a game wave for a canvas instead of a dashboard foundation", () => {
    const scene = buildSystemInstruction("create", "standard", { wave: 0, maxWaves: 2 }, { scene: true });
    expect(scene).toContain("PLAYABLE SCENE");
    expect(scene).not.toContain("Coming soon");
    const app = buildSystemInstruction("create", "standard", { wave: 0, maxWaves: 2 });
    expect(app).toContain("FOUNDATION");
    expect(app).not.toContain("PLAYABLE SCENE");
  });

  it("treats the three package as known and three/examples as a missing file", () => {
    const core = diagnoseWorkspace(
      {
        "App.tsx": `import * as THREE from "three";\nexport default function App(){return null}`,
      },
      ""
    );
    expect(core.missingImports.some((m) => m.spec === "three")).toBe(false);

    const sub = diagnoseWorkspace(
      {
        "App.tsx": `import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";\nexport default function App(){return null}`,
      },
      ""
    );
    expect(sub.missingImports.some((m) => m.spec.includes("three/examples"))).toBe(true);
  });

  it("keeps Three off the preview boot path and vendors the UMD build", () => {
    const html = readFileSync(resolve("public/preview-sandbox.html"), "utf8");
    expect(html).toContain("function vfsImportsThree");
    expect(html).toContain("from\\s*");
    expect(html).toContain("tsx?|jsx?");
    expect(html).toContain('s.src = "/vendor/three.min.js"');
    expect(html).not.toMatch(/<script[^>]+src="\/vendor\/three\.min\.js"/);

    const vendor = readFileSync(resolve("public/vendor/three.min.js"), "utf8");
    expect(vendor).toContain("WebGLRenderer");
    expect(vendor).toContain(".THREE={}");
    expect(vendor.startsWith("/**")).toBe(true);
    // Leading `!` keeps the UMD wrapper an expression. A bare `function(` is a syntax error.
    expect(vendor).toContain("*/\n!function(");
    expect(vendor.length).toBeGreaterThan(100_000);
  });
});
