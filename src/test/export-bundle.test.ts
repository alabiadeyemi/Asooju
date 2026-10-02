import { describe, it, expect } from "vitest";
import {
  collectViteEnvKeys,
  prepareExportBundle,
  validateRunnableExportBundle,
} from "@/lib/export-bundle";

describe("export-bundle", () => {
  it("collects VITE_ keys from source and supabase files", () => {
    const keys = collectViteEnvKeys({
      "lib/foo.ts": 'const u = import.meta.env.VITE_API_BASE;',
      "lib/supabase.ts": "export {}",
    });
    expect(keys).toContain("VITE_API_BASE");
    expect(keys).toContain("VITE_SUPABASE_URL");
    expect(keys).toContain("VITE_SUPABASE_PUBLISHABLE_KEY");
  });

  it("adds scaffold files without overwriting existing agent paths", () => {
    const vfs = {
      "App.tsx": "export default function App(){return null}",
      "index.css": "body{}",
      "package.json": '{"name":"custom"}',
    };
    const out = prepareExportBundle(vfs, { projectName: "My App" });
    const pkg = JSON.parse(out["package.json"]);
    expect(pkg.name).toBe("custom");
    expect(pkg.dependencies?.react).toBeDefined();
    expect(out["README.md"]).toContain("My App");
    expect(out[".env.example"]).toContain("VITE_SUPABASE_URL=");
    expect(out["vite.config.ts"]).toContain("defineConfig");
    expect(out["index.html"]).toContain("main.tsx");
    expect(out["main.tsx"]).toContain('./App');
    expect(out["tsconfig.json"]).toContain("compilerOptions");
    expect(out[".gitignore"]).toContain("node_modules");
    expect(out[".gitignore"]).toContain(".env");
    expect(out["vercel.json"]).toContain("dist");
    const report = validateRunnableExportBundle(out);
    expect(report.ok).toBe(true);
    expect(report.missing).toEqual([]);
  });

  it("validateRunnableExportBundle fails when scaffold is incomplete", () => {
    const report = validateRunnableExportBundle({ "App.tsx": "export default function App(){return null}" });
    expect(report.ok).toBe(false);
    expect(report.missing.length).toBeGreaterThan(0);
  });

  it("merges missing keys into existing .env.example", () => {
    const out = prepareExportBundle({
      "App.tsx": 'void import.meta.env.VITE_STRIPE_KEY',
      ".env.example": "VITE_SUPABASE_URL=\n",
    });
    expect(out[".env.example"]).toMatch(/VITE_SUPABASE_URL=/);
    expect(out[".env.example"]).toMatch(/VITE_STRIPE_KEY=/);
  });
});
