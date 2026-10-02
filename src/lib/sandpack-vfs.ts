import { collectNpmPackageImports, EXPORT_RUNTIME_DEPS } from "@/lib/export-deps";

/** Files that must stay on Sandpack's vite-react-ts template (vite 4 + esbuild-wasm). */
const TEMPLATE_LOCKED = new Set([
  "package.json",
  "main.tsx",
  "index.html",
  "tsconfig.node.json",
  "index.tsx",
]);

/** Sandpack vite-react-ts ships React 19 — never override via export-deps (React 18 breaks react-dom). */
const SANDPACK_TEMPLATE_REACT = new Set(["react", "react-dom"]);

/** Export-only artifacts — not needed in preview bundler. */
const PREVIEW_SKIP = new Set([
  "vercel.json",
  "README.md",
  ".env.example",
  ".gitignore",
]);

/** Vite config aligned with Sandpack nodebox (plugin-react + vite 4), not export scaffold (SWC + vite 5). */
const SANDPACK_VITE_CONFIG = `import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
`;

const SANDPACK_TSCONFIG = JSON.stringify(
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

function normalizeKey(path: string): string {
  const norm = path.replace(/^\.\//, "").replace(/^\/+/, "");
  return norm.startsWith("/") ? norm : `/${norm}`;
}

/**
 * Preview file map: workspace sources only — never overwrite Sandpack's package.json / vite 5 export bundle.
 */
export function prepareSandpackPreviewFiles(vfs: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};

  for (const [path, content] of Object.entries(vfs)) {
    const norm = path.replace(/^\.\//, "").replace(/^\/+/, "");
    if (PREVIEW_SKIP.has(norm) || TEMPLATE_LOCKED.has(norm)) continue;
    if (norm === "vite.config.ts") continue;
    out[normalizeKey(norm)] = content;
  }

  if (vfs["index.css"] && !out["/styles.css"]) {
    out["/styles.css"] = vfs["index.css"];
  }

  out["/vite.config.ts"] = SANDPACK_VITE_CONFIG;
  if (!out["/tsconfig.json"]) {
    out["/tsconfig.json"] = SANDPACK_TSCONFIG;
  }

  return out;
}

/** Runtime deps from imports — merged into Sandpack template via customSetup.dependencies. */
export function sandpackRuntimeDependencies(vfs: Record<string, string>): Record<string, string> {
  const deps: Record<string, string> = {};
  for (const pkg of collectNpmPackageImports(vfs)) {
    if (SANDPACK_TEMPLATE_REACT.has(pkg)) continue;
    const ver = EXPORT_RUNTIME_DEPS[pkg];
    if (ver) deps[pkg] = ver;
  }
  if (vfs["lib/supabase.ts"] && !deps["@supabase/supabase-js"]) {
    deps["@supabase/supabase-js"] = EXPORT_RUNTIME_DEPS["@supabase/supabase-js"];
  }
  return deps;
}

/** Map workspace VFS to Sandpack file keys (leading `/`). */
export function vfsToSandpackFiles(
  vfs: Record<string, string>,
  _projectName?: string
): Record<string, string> {
  return prepareSandpackPreviewFiles(vfs);
}
