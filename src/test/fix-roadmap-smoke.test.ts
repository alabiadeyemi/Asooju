/**
 * Fast smoke checks for incremental fix roadmap (Steps 1–5).
 * Run: npm run test:fixes  (~1s, no browser, no Supabase network)
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  readProjectPreviewEnv,
  resolveProjectPreviewEnv,
  resolveProjectPreviewEnvFromSources,
  writeProjectPreviewEnv,
} from "@/lib/project-preview-env";
import {
  prepareExportBundle,
  collectViteEnvKeys,
  validateRunnableExportBundle,
} from "@/lib/export-bundle";
import { buildSystemInstruction } from "@/lib/generation-prompt";
import { previewAllowsNextWave } from "@/lib/agent-procedure";
import { runPreviewPreflight } from "@/lib/agent-intelligence";
import { mergeWaveNextPaths } from "@/lib/wave-completeness";

describe("Fix roadmap smoke", () => {
  beforeEach(() => localStorage.clear());

  it("Step 1 — preview Supabase persists per projectId in localStorage", () => {
    writeProjectPreviewEnv("proj-a", "https://a.supabase.co", "key-a");
    writeProjectPreviewEnv("proj-b", "https://b.supabase.co", "key-b");
    expect(readProjectPreviewEnv("proj-a")?.url).toBe("https://a.supabase.co");
    expect(readProjectPreviewEnv("proj-b")?.anonKey).toBe("key-b");
  });

  it("Step 2 — unsaved project gets empty preview env (no platform VITE_* fallback)", () => {
    expect(resolveProjectPreviewEnv("brand-new-id")).toEqual({ url: "", anonKey: "" });
  });

  it("Step 3 — export adds README, .env.example, and Vite scaffold without overwriting agent files", () => {
    const vfs = { "App.tsx": "export default function App(){return null}", "package.json": '{"custom":true}' };
    const out = prepareExportBundle(vfs, { projectName: "Smoke" });
    expect(out["README.md"]).toContain("Run locally");
    expect(out[".env.example"]).toMatch(/VITE_SUPABASE_URL=/);
    expect(out["vite.config.ts"]).toContain("defineConfig");
    const pkg = JSON.parse(out["package.json"]);
    expect(pkg.custom).toBe(true);
    expect(pkg.dependencies?.react).toBeDefined();
    expect(out[".gitignore"]).toContain(".env");
  });

  it("Step 7c — export merges missing npm deps into agent package.json", () => {
    const vfs = {
      "App.tsx": `import { motion } from "framer-motion"; export default function App(){return null}`,
      "package.json": '{"name":"x","dependencies":{"react":"^18.3.1"}}',
    };
    const out = prepareExportBundle(vfs, { projectName: "x" });
    const pkg = JSON.parse(out["package.json"]);
    expect(pkg.dependencies["framer-motion"]).toBeDefined();
    expect(pkg.dependencies.react).toBe("^18.3.1");
  });

  it("GitHub/ZIP parity — bundled export is runnable-shaped (env still user-supplied)", () => {
    const vfs = {
      "App.tsx": "export default function App(){return null}",
      "lib/supabase.ts": "export const hasBackend = false",
    };
    const out = prepareExportBundle(vfs, { projectName: "GitHubParity" });
    const report = validateRunnableExportBundle(out);
    expect(report.ok).toBe(true);
    expect(out["README.md"]).toContain("From GitHub");
  });

  it("Step 4 — generation system prompt requires .env.example and README when using VITE_*", () => {
    const sys = buildSystemInstruction("create", "simple");
    expect(sys).toContain(".env.example");
    expect(sys).toContain("README.md");
    expect(sys).toMatch(/import\.meta\.env\.VITE_/);
  });

  it("Step 6d — mergeWaveNextPaths unions model queue with missing modules", () => {
    const vfs = {
      "App.tsx": `import X from "./pages/X"; export default function App(){return <X/>}`,
    };
    const paths = mergeWaveNextPaths([], vfs, { wave: 0, maxWaves: 2 });
    expect(paths).toContain("pages/X.tsx");
  });

  it("Step 6a — pre-flight repairs nested routers before LLM", () => {
    const vfs = {
      "App.tsx": `import { MemoryRouter } from "react-router-dom";
export default function App(){return <MemoryRouter><div/></MemoryRouter>;}`,
      "pages/Home.tsx": `import { MemoryRouter } from "react-router-dom";
export default function Home(){return <MemoryRouter><div/></MemoryRouter>;}`,
    };
    const pre = runPreviewPreflight(vfs, "");
    expect(pre.changed).toBe(true);
    expect(pre.vfs["pages/Home.tsx"]).not.toMatch(/<MemoryRouter/);
  });

  it("Step 6c — auto-continue only when preview is live", () => {
    expect(previewAllowsNextWave("live")).toBe(true);
    expect(previewAllowsNextWave("error")).toBe(false);
    expect(previewAllowsNextWave("timeout")).toBe(false);
  });

  it("Step 5 — cloud project row wins over localStorage for preview env", () => {
    writeProjectPreviewEnv("p1", "https://stale.local", "stale");
    expect(
      resolveProjectPreviewEnvFromSources("p1", {
        preview_supabase_url: "https://from-db.supabase.co",
        preview_supabase_anon_key: "from-db",
      })
    ).toEqual({ url: "https://from-db.supabase.co", anonKey: "from-db" });
    expect(collectViteEnvKeys({ "lib/supabase.ts": "x" })).toContain("VITE_SUPABASE_URL");
  });
});
