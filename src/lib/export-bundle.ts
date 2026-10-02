/** Post-process VFS at export time — additive only; never overwrites agent files. */

import { mergeExportPackageJson } from "./export-deps";

export type ExportBundleOptions = {
  projectName?: string;
};

/** Paths a clone-from-GitHub / ZIP export needs to run locally (env is always user-supplied). */
export const RUNNABLE_EXPORT_PATHS = [
  "package.json",
  "vite.config.ts",
  "index.html",
  "main.tsx",
  "README.md",
  ".env.example",
  ".gitignore",
] as const;

export type RunnableExportReport = {
  ok: boolean;
  missing: string[];
  warnings: string[];
};

export function validateRunnableExportBundle(bundled: Record<string, string>): RunnableExportReport {
  const missing: string[] = [];
  const warnings: string[] = [];

  const hasPath = (name: string) =>
    Object.keys(bundled).some((p) => p.toLowerCase() === name.toLowerCase());

  for (const req of RUNNABLE_EXPORT_PATHS) {
    if (req === "main.tsx" && !hasPath("main.tsx") && !hasPath("src/main.tsx")) {
      missing.push("main.tsx (or src/main.tsx)");
      continue;
    }
    if (req === "main.tsx") continue;
    if (!hasPath(req)) missing.push(req);
  }

  const hasApp =
    bundled["App.tsx"] != null ||
    bundled["App.jsx"] != null ||
    Object.keys(bundled).some((p) => /(^|\/)app\.tsx$/i.test(p));
  if (!hasApp) missing.push("App.tsx (entry component)");

  let pkg: { scripts?: Record<string, string> } = {};
  const pkgRaw = bundled["package.json"];
  if (pkgRaw) {
    try {
      pkg = JSON.parse(pkgRaw);
    } catch {
      warnings.push("package.json is not valid JSON");
    }
  }
  if (!pkg.scripts?.dev) warnings.push('package.json missing script "dev"');
  if (!pkg.scripts?.build) warnings.push('package.json missing script "build"');

  if (!bundled[".env.example"]?.includes("VITE_")) {
    warnings.push(".env.example has no VITE_* keys (OK if app has no env vars)");
  }

  return { ok: missing.length === 0, missing, warnings };
}

const DEFAULT_ENV_KEYS = ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"] as const;

const ENV_KEY_RE = /import\.meta\.env\.(VITE_[A-Z0-9_]+)/g;

export function collectViteEnvKeys(vfs: Record<string, string>): string[] {
  const keys = new Set<string>();
  for (const content of Object.values(vfs)) {
    if (!content) continue;
    let m: RegExpExecArray | null;
    ENV_KEY_RE.lastIndex = 0;
    while ((m = ENV_KEY_RE.exec(content))) keys.add(m[1]);
  }
  if (vfs["lib/supabase.ts"] || vfs["supabase/schema.sql"]) {
    for (const k of DEFAULT_ENV_KEYS) keys.add(k);
  }
  return [...keys].sort();
}

function findPath(vfs: Record<string, string>, name: string): string | undefined {
  const lower = name.toLowerCase();
  return Object.keys(vfs).find((p) => p.toLowerCase() === lower);
}

function hasPath(vfs: Record<string, string>, name: string): boolean {
  return findPath(vfs, name) != null;
}

function mergeEnvExample(existing: string, keys: string[]): string {
  const missing = keys.filter((k) => !new RegExp(`^\\s*${k}\\s*=`, "m").test(existing));
  if (missing.length === 0) return existing;
  const block =
    (existing.trimEnd() ? existing.trimEnd() + "\n\n" : "") +
    missing.map((k) => `${k}=`).join("\n") +
    "\n";
  return block;
}

function buildEnvExample(keys: string[]): string {
  const lines = [
    "# Copy to .env in this folder (same level as package.json).",
    "# Vite exposes only variables prefixed with VITE_.",
    "",
  ];
  for (const k of keys.length ? keys : [...DEFAULT_ENV_KEYS]) {
    lines.push(`${k}=`);
  }
  return lines.join("\n") + "\n";
}

function buildGitignore(): string {
  return [
    "node_modules/",
    "dist/",
    ".env",
    ".env.local",
    ".env.*.local",
    "*.log",
    ".DS_Store",
  ].join("\n") + "\n";
}

function buildVercelJson(): string {
  return JSON.stringify(
    {
      buildCommand: "npm run build",
      outputDirectory: "dist",
      installCommand: "npm install",
      framework: "vite",
      rewrites: [{ source: "/((?!assets/).*)", destination: "/index.html" }],
    },
    null,
    2
  );
}

function buildReadme(projectName: string, hasSchema: boolean): string {
  const lines = [
    `# ${projectName}`,
    "",
    "App source exported from ShipKernel.",
    "",
    "## Run locally",
    "",
    "1. Copy `.env.example` to `.env` and fill in any values your app reads.",
    "2. `npm install`",
    "3. `npm run dev`",
    "",
    "## From GitHub",
    "",
    "GitHub stores **source only** — not Node modules, not secrets, not a hosted URL.",
    "After clone: same steps as above (`.env` is never committed; use `.env.example` as the template).",
    "For production, import this repo in Vercel (or similar) and set the same `VITE_*` variables in the host dashboard.",
    "",
  ];
  if (hasSchema) {
    lines.push(
      "## Supabase (optional)",
      "",
      "1. Create a Supabase project.",
      "2. Run `supabase/schema.sql` in the SQL Editor.",
      "3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env`.",
      "",
      "If env vars are empty, the app may use demo/local data (see `lib/db.ts`).",
      ""
    );
  } else {
    lines.push(
      "If the app supports Supabase, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env`.",
      ""
    );
  }
  return lines.join("\n");
}


function buildViteConfig(): string {
  return `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
`;
}

function buildIndexHtml(title: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title.replace(/</g, "")}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/main.tsx"></script>
  </body>
</html>
`;
}

function buildMainTsx(hasCss: boolean): string {
  return `import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
${hasCss ? 'import "./index.css";\n' : ""}
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;
}

function buildTsConfig(): string {
  return JSON.stringify(
    {
      compilerOptions: {
        target: "ES2020",
        useDefineForClassFields: true,
        lib: ["ES2020", "DOM", "DOM.Iterable"],
        module: "ESNext",
        skipLibCheck: true,
        moduleResolution: "bundler",
        allowImportingTsExtensions: true,
        isolatedModules: true,
        moduleDetection: "force",
        noEmit: true,
        jsx: "react-jsx",
        strict: true,
        noUnusedLocals: false,
        noUnusedParameters: false,
        baseUrl: ".",
        paths: { "@/*": ["./*"] },
      },
      include: ["**/*.ts", "**/*.tsx"],
    },
    null,
    2
  );
}

/**
 * Returns a new VFS map with export artifacts added when absent.
 * Existing paths are never replaced.
 */
export function prepareExportBundle(
  vfs: Record<string, string>,
  options: ExportBundleOptions = {}
): Record<string, string> {
  const out = { ...vfs };
  const projectName = (options.projectName || "shipkernel-app").trim() || "shipkernel-app";
  const envKeys = collectViteEnvKeys(out);
  const hasSchema = Boolean(out["supabase/schema.sql"]);

  const envExamplePath = findPath(out, ".env.example");
  if (envExamplePath) {
    out[envExamplePath] = mergeEnvExample(out[envExamplePath], envKeys);
  } else {
    out[".env.example"] = buildEnvExample(envKeys);
  }

  if (!hasPath(out, "README.md")) {
    out["README.md"] = buildReadme(projectName, hasSchema);
  }

  const pkgPath = findPath(out, "package.json") ?? "package.json";
  out[pkgPath] = mergeExportPackageJson(projectName, out, out[pkgPath]);

  if (!hasPath(out, "vite.config.ts")) {
    out["vite.config.ts"] = buildViteConfig();
  }

  if (!hasPath(out, "index.html")) {
    out["index.html"] = buildIndexHtml(projectName);
  }

  const hasApp =
    out["App.tsx"] != null || out["App.jsx"] != null || out["app.tsx"] != null;
  if (hasApp && !hasPath(out, "main.tsx") && !hasPath(out, "src/main.tsx")) {
    out["main.tsx"] = buildMainTsx(Boolean(out["index.css"]));
  }

  if (!hasPath(out, "tsconfig.json")) {
    out["tsconfig.json"] = buildTsConfig();
  }

  if (!hasPath(out, ".gitignore")) {
    out[".gitignore"] = buildGitignore();
  }

  if (!hasPath(out, "vercel.json")) {
    out["vercel.json"] = buildVercelJson();
  }

  return out;
}
