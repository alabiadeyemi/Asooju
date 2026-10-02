/**
 * Export-time package.json merge — fill missing deps/scripts without stripping agent choices.
 */

export const EXPORT_RUNTIME_DEPS: Record<string, string> = {
  react: "^18.3.1",
  "react-dom": "^18.3.1",
  "react-router-dom": "^6.30.0",
  "framer-motion": "^11.0.0",
  "lucide-react": "^0.462.0",
  "@supabase/supabase-js": "^2.95.3",
};

export const EXPORT_DEV_DEPS: Record<string, string> = {
  "@types/react": "^18.3.23",
  "@types/react-dom": "^18.3.7",
  "@vitejs/plugin-react-swc": "^3.11.0",
  typescript: "^5.8.3",
  vite: "^5.4.19",
};

const DEFAULT_SCRIPTS = {
  dev: "vite",
  build: "vite build",
  preview: "vite preview",
};

function npmPackageName(spec: string): string | null {
  if (!spec || spec.startsWith(".") || spec.startsWith("@/") || spec.startsWith("http")) {
    return null;
  }
  if (spec.startsWith("@")) {
    const parts = spec.split("/");
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : null;
  }
  return spec.split("/")[0] || null;
}

/** npm package names referenced by import/export in the VFS. */
export function collectNpmPackageImports(vfs: Record<string, string>): string[] {
  const specs = new Set<string>();
  const re = /(?:import|export)\s+(?:type\s+)?(?:[\w*{}\s,]*\sfrom\s*)?['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  for (const content of Object.values(vfs)) {
    if (!content) continue;
    let m: RegExpExecArray | null;
    re.lastIndex = 0;
    while ((m = re.exec(content))) {
      const raw = m[1] || m[2];
      const pkg = npmPackageName(raw);
      if (pkg) specs.add(pkg);
    }
  }
  return [...specs].sort();
}

function defaultPackageObject(projectName: string, vfs: Record<string, string>) {
  const deps: Record<string, string> = {
    react: EXPORT_RUNTIME_DEPS.react,
    "react-dom": EXPORT_RUNTIME_DEPS["react-dom"],
    "react-router-dom": EXPORT_RUNTIME_DEPS["react-router-dom"],
    "framer-motion": EXPORT_RUNTIME_DEPS["framer-motion"],
    "lucide-react": EXPORT_RUNTIME_DEPS["lucide-react"],
  };
  if (vfs["lib/supabase.ts"]) {
    deps["@supabase/supabase-js"] = EXPORT_RUNTIME_DEPS["@supabase/supabase-js"];
  }
  return {
    name: projectName.replace(/\s+/g, "-").toLowerCase().slice(0, 64) || "shipkernel-app",
    private: true,
    version: "0.0.1",
    type: "module",
    scripts: { ...DEFAULT_SCRIPTS },
    dependencies: deps,
    devDependencies: { ...EXPORT_DEV_DEPS },
    engines: { node: ">=18" },
  };
}

/** Merge scanned + default deps into existing package.json (never remove agent deps). */
export function mergeExportPackageJson(
  projectName: string,
  vfs: Record<string, string>,
  existingRaw?: string
): string {
  const base = defaultPackageObject(projectName, vfs);
  const imports = collectNpmPackageImports(vfs);

  const requiredRuntime: Record<string, string> = { ...base.dependencies };
  for (const pkg of imports) {
    if (EXPORT_RUNTIME_DEPS[pkg]) requiredRuntime[pkg] = EXPORT_RUNTIME_DEPS[pkg];
  }
  if (vfs["lib/supabase.ts"]) {
    requiredRuntime["@supabase/supabase-js"] = EXPORT_RUNTIME_DEPS["@supabase/supabase-js"];
  }

  if (!existingRaw?.trim()) {
    base.dependencies = requiredRuntime;
    return JSON.stringify(base, null, 2);
  }

  try {
    const parsed = JSON.parse(existingRaw) as Record<string, unknown>;
    const agentDeps = (parsed.dependencies as Record<string, string>) || {};
    const mergedDeps = { ...agentDeps };
    for (const [name, version] of Object.entries(requiredRuntime)) {
      if (!mergedDeps[name]) mergedDeps[name] = version;
    }
    const agentDev = (parsed.devDependencies as Record<string, string>) || {};
    const mergedDev = { ...EXPORT_DEV_DEPS, ...agentDev };
    for (const [name, version] of Object.entries(EXPORT_DEV_DEPS)) {
      if (!mergedDev[name]) mergedDev[name] = version;
    }
    const scripts = {
      ...DEFAULT_SCRIPTS,
      ...((parsed.scripts as Record<string, string>) || {}),
    };
    if (!scripts.dev) scripts.dev = DEFAULT_SCRIPTS.dev;
    if (!scripts.build) scripts.build = DEFAULT_SCRIPTS.build;

    return JSON.stringify(
      {
        ...base,
        ...parsed,
        name: typeof parsed.name === "string" ? parsed.name : base.name,
        scripts,
        dependencies: mergedDeps,
        devDependencies: mergedDev,
        type: parsed.type || base.type,
        engines: parsed.engines || base.engines,
      },
      null,
      2
    );
  } catch {
    base.dependencies = { ...requiredRuntime, ...(base.dependencies as object) };
    return JSON.stringify(base, null, 2);
  }
}
