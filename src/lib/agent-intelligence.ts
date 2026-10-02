/**
 * Local (zero-token) agent smarts: error → files, import graph, diagnosis,
 * deterministic preview repairs, and compact workspace memory.
 */
import { classifyBuildScale, type BuildScale } from "./complexity";

const KNOWN_PACKAGES =
  /^(react|react-dom|react-router-dom|lucide-react|framer-motion|@supabase\/supabase-js|@\/lib\/supabase)$/;

const ROUTER_OPEN =
  /<(MemoryRouter|BrowserRouter|HashRouter|Router)\b[^>]*>/g;
const ROUTER_CLOSE =
  /<\/(MemoryRouter|BrowserRouter|HashRouter|Router)>/g;

export type FixAttempt = {
  error: string;
  files: string[];
  thought: string;
  wroteAny: boolean;
};

export type WorkspaceDiagnosis = {
  issues: string[];
  errorPaths: string[];
  missingImports: { from: string; spec: string }[];
  nestedRouterFiles: string[];
};

/** Stable-ish signature so identical preview crashes don't burn extra attempts. */
export function errorSignature(err: string): string {
  return err
    .replace(/\s+/g, " ")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\d{2,}/g, "#")
    .trim()
    .slice(0, 180)
    .toLowerCase();
}

export function pickFixScale(
  sessionScale: BuildScale | undefined,
  vfsFileCount: number
): BuildScale {
  const fromVfs = classifyBuildScale("fix preview", vfsFileCount);
  const rank: Record<BuildScale, number> = { simple: 0, standard: 1, enterprise: 2 };
  const session = sessionScale || "simple";
  return rank[fromVfs] >= rank[session] ? fromVfs : session;
}

function normalizePath(p: string): string {
  return p.replace(/^\.\//, "").replace(/^\/+/, "").replace(/\\/g, "/");
}

function vfsLookup(vfs: Record<string, string>, guess: string): string | null {
  const n = normalizePath(guess);
  if (vfs[n] != null) return n;
  const lower = n.toLowerCase();
  const keys = Object.keys(vfs);
  const exact = keys.find((k) => k.toLowerCase() === lower);
  if (exact) return exact;
  const noExt = n.replace(/\.(tsx?|jsx?|css)$/i, "");
  const withExt = keys.find((k) => {
    const b = k.replace(/\.(tsx?|jsx?|css)$/i, "");
    return b.toLowerCase() === noExt.toLowerCase() || k.toLowerCase().endsWith("/" + lower);
  });
  return withExt || null;
}

function basename(path: string): string {
  return path.split("/").pop()?.replace(/\.(tsx?|jsx?)$/i, "") || path;
}

/** Pull likely workspace paths / component names out of a sandbox stack. */
export function extractErrorPaths(
  errorText: string,
  vfs: Record<string, string>
): string[] {
  const text = errorText || "";
  const found: string[] = [];
  const push = (raw: string) => {
    const hit = vfsLookup(vfs, raw);
    if (hit && !found.includes(hit)) found.push(hit);
  };

  const pathRe =
    /(?:^|[\s"'`(])((?:src\/)?(?:components|pages|hooks|lib|layouts|utils|ui|app)\/[\w./-]+(?:\.(?:tsx?|jsx?|css))?)/gi;
  let m: RegExpExecArray | null;
  while ((m = pathRe.exec(text))) push(m[1]);

  const fileRe = /(?:^|[\s"'`])([\w./-]+\.(?:tsx?|jsx?|css))/g;
  while ((m = fileRe.exec(text))) {
    if (!KNOWN_PACKAGES.test(m[1]) && !m[1].startsWith("http")) push(m[1]);
  }

  const lineRe = /([\w./-]+\.(?:tsx?|jsx?)):(\d+)/g;
  while ((m = lineRe.exec(text))) push(m[1]);

  const componentRe =
    /(?:render method of|in |of |from |Check the render method of )\s*[`'"“]?([A-Z][A-Za-z0-9]+)[`'"”]?/g;
  while ((m = componentRe.exec(text))) {
    const name = m[1];
    for (const k of Object.keys(vfs)) {
      if (basename(k).toLowerCase() === name.toLowerCase()) push(k);
    }
  }

  if (/app\.tsx|entry|root component/i.test(text)) {
    if (vfs["App.tsx"]) push("App.tsx");
    else if (vfs["App.jsx"]) push("App.jsx");
  }

  return found;
}

/** Parse line number from `Foo.tsx:42` / `Foo.tsx:42:10` for the given path. */
export function extractErrorLine(errorText: string, path: string): number | null {
  const base = path.split("/").pop() || path;
  const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`${escaped}:(\\d+)(?::\\d+)?`);
  const m = errorText.match(re);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function windowAroundLine(content: string, line: number, radius = 90): string {
  const lines = content.split("\n");
  if (line > lines.length) return content;
  const start = Math.max(0, line - 1 - radius);
  const end = Math.min(lines.length, line + radius);
  const head = start > 0 ? `/* … lines 1–${start} omitted … */\n` : "";
  const tail = end < lines.length ? `\n/* … lines ${end + 1}–${lines.length} omitted … */` : "";
  return head + lines.slice(start, end).join("\n") + tail;
}

function parseImportSpecs(content: string): string[] {
  const specs: string[] = [];
  const re =
    /(?:import|export)\s+(?:type\s+)?[\s\S]*?from\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) {
    const spec = m[1] || m[2];
    if (spec) specs.push(spec);
  }
  return specs;
}

function dirOf(path: string): string {
  const i = path.lastIndexOf("/");
  return i === -1 ? "" : path.slice(0, i);
}

function joinPath(dir: string, rel: string): string {
  const parts = (dir ? dir.split("/") : []).concat(rel.split("/"));
  const out: string[] = [];
  for (const p of parts) {
    if (!p || p === ".") continue;
    if (p === "..") out.pop();
    else out.push(p);
  }
  return out.join("/");
}

export function resolveImport(
  fromPath: string,
  spec: string,
  vfs: Record<string, string>
): string | null {
  if (KNOWN_PACKAGES.test(spec) || spec.startsWith("http")) return null;
  let raw = spec;
  if (raw.startsWith("@/")) raw = raw.slice(2);
  if (raw.startsWith(".")) raw = joinPath(dirOf(fromPath), raw);
  raw = normalizePath(raw);

  const guesses = [
    raw,
    `${raw}.tsx`,
    `${raw}.ts`,
    `${raw}.jsx`,
    `${raw}.js`,
    `${raw}.css`,
    `${raw}/index.tsx`,
    `${raw}/index.ts`,
  ];
  for (const g of guesses) {
    const hit = vfsLookup(vfs, g);
    if (hit) return hit;
  }
  return null;
}

export function collectImportNeighbors(
  vfs: Record<string, string>,
  seeds: string[],
  depth = 1
): string[] {
  const out: string[] = [];
  let frontier = seeds.filter((p) => vfs[p] != null);
  for (let d = 0; d < depth; d++) {
    const next: string[] = [];
    for (const path of frontier) {
      for (const spec of parseImportSpecs(vfs[path] || "")) {
        const resolved = resolveImport(path, spec, vfs);
        if (resolved && !seeds.includes(resolved) && !out.includes(resolved)) {
          out.push(resolved);
          next.push(resolved);
        }
      }
      // reverse: files that import this seed
      for (const [other, content] of Object.entries(vfs)) {
        if (other === path || seeds.includes(other) || out.includes(other)) continue;
        for (const spec of parseImportSpecs(content)) {
          if (resolveImport(other, spec, vfs) === path) {
            out.push(other);
            next.push(other);
            break;
          }
        }
      }
    }
    frontier = next;
  }
  return out;
}

function filesWithRouters(vfs: Record<string, string>): string[] {
  return Object.keys(vfs).filter((p) =>
    /<(MemoryRouter|BrowserRouter|HashRouter)\b/.test(vfs[p] || "")
  );
}

export function diagnoseWorkspace(
  vfs: Record<string, string>,
  errorText: string
): WorkspaceDiagnosis {
  const issues: string[] = [];
  const errorPaths = extractErrorPaths(errorText, vfs);
  const nestedRouterFiles = filesWithRouters(vfs);
  const missingImports: { from: string; spec: string }[] = [];

  if (nestedRouterFiles.length > 1) {
    issues.push(
      `Nested routers: ${nestedRouterFiles.join(", ")} each mount a Router. Keep a single top-level MemoryRouter or HashRouter in App.tsx.`
    );
  } else if (
    /cannot render a <Router> inside another <Router>|you cannot render a <router>/i.test(
      errorText
    )
  ) {
    issues.push(
      "React Router: nested <Router> detected by preview. Unwrap inner MemoryRouter/BrowserRouter/HashRouter; keep Routes/Route."
    );
  }

  const scanFiles = errorPaths.length
    ? [...new Set([...errorPaths, "App.tsx", "App.jsx"].filter((p) => vfs[p] != null))]
    : Object.keys(vfs).slice(0, 24);

  for (const from of scanFiles) {
    for (const spec of parseImportSpecs(vfs[from] || "")) {
      if (KNOWN_PACKAGES.test(spec) || spec.startsWith("http")) continue;
      if (!resolveImport(from, spec, vfs)) {
        missingImports.push({ from, spec });
      }
    }
  }

  if (missingImports.length) {
    const shown = missingImports
      .slice(0, 8)
      .map((x) => `${x.from} → "${x.spec}"`)
      .join("; ");
    issues.push(`Unresolved imports: ${shown}. Create the missing file or fix the path.`);
  }

  for (const path of errorPaths) {
    const content = vfs[path] || "";
    const importedAsDefault = Object.entries(vfs).some(([other, src]) => {
      if (other === path) return false;
      return new RegExp(
        `import\\s+\\w+\\s+from\\s+['"][^'"]*${basename(path).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}['"]`
      ).test(src);
    });
    if (importedAsDefault && !/export\s+default/.test(content)) {
      issues.push(`${path} is default-imported elsewhere but has no \`export default\`.`);
    }
  }

  if (/module not found|cannot find module|failed to resolve/i.test(errorText)) {
    issues.push("Module-not-found: fix the import path or add the missing file — do not rewrite unrelated screens.");
  }
  if (/is not defined|cannot read propert/i.test(errorText)) {
    issues.push("Undefined binding / null access: add the missing import or guard the value. Tiny patch.");
  }
  if (/element type is invalid/i.test(errorText)) {
    issues.push("Element type is invalid: a component is undefined (wrong import, missing default export, or typo).");
  }

  return { issues, errorPaths, missingImports, nestedRouterFiles };
}

function unwrapSingleRouter(content: string): string | null {
  const opens = [...content.matchAll(ROUTER_OPEN)];
  const closes = [...content.matchAll(ROUTER_CLOSE)];
  if (opens.length !== 1 || closes.length !== 1) return null;
  const open = opens[0];
  const close = closes[0];
  if (open.index == null || close.index == null) return null;
  if (close.index < open.index) return null;
  const before = content.slice(0, open.index);
  const inner = content.slice(open.index + open[0].length, close.index);
  const after = content.slice(close.index + close[0].length);
  return stripUnusedRouterImports(`${before}<>${inner}</>${after}`);
}

function stripUnusedRouterImports(content: string): string {
  if (/<(MemoryRouter|BrowserRouter|HashRouter|Router)\b/.test(content)) return content;
  let next = content
    .replace(/,\s*(MemoryRouter|BrowserRouter|HashRouter)\b/g, "")
    .replace(/\b(MemoryRouter|BrowserRouter|HashRouter)\s*,\s*/g, "");
  next = next.replace(
    /import\s*\{\s*(?:MemoryRouter|BrowserRouter|HashRouter)\s*\}\s*from\s*['"]react-router-dom['"];?\s*\n?/g,
    ""
  );
  next = next.replace(/import\s*\{\s*\}\s*from\s*['"]react-router-dom['"];?\s*\n?/g, "");
  return next;
}

/**
 * Cheap local repairs for crash classes the model otherwise loops on.
 * Conservative: only apply when the match is unambiguous.
 */
export function applyDeterministicPreviewFixes(
  vfs: Record<string, string>,
  errorText: string
): { vfs: Record<string, string>; notes: string[] } {
  const notes: string[] = [];
  let next = { ...vfs };
  const nested =
    /cannot render a <Router> inside another <Router>|you cannot render a <router>/i.test(
      errorText
    ) || filesWithRouters(vfs).length > 1;

  if (nested) {
    const routers = filesWithRouters(next);
    const inner = routers.filter((p) => !/^App\.(tsx|jsx)$/i.test(p));
    for (const path of inner) {
      const patched = unwrapSingleRouter(next[path] || "");
      if (patched && patched !== next[path]) {
        next[path] = patched;
        notes.push(`Unwrapped nested Router in ${path}`);
      }
    }
  }

  return { vfs: next, notes };
}

function pascalFromPath(path: string): string {
  const base = basename(path).replace(/[^a-zA-Z0-9]+/g, " ");
  const parts = base.split(/\s+/).filter(Boolean);
  if (!parts.length) return "Placeholder";
  return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("");
}

/** Resolve import spec to a likely workspace path (for stubs / wave queue). */
export function guessNewModulePath(from: string, spec: string): string | null {
  if (KNOWN_PACKAGES.test(spec) || spec.startsWith("http")) return null;
  let raw = spec;
  if (raw.startsWith("@/")) raw = raw.slice(2);
  if (raw.startsWith(".")) raw = joinPath(dirOf(from), raw);
  raw = normalizePath(raw);
  if (!raw) return null;
  if (/\.(tsx?|jsx?|css)$/i.test(raw)) return raw;
  return `${raw}.tsx`;
}

/** Add `export default` when a module is default-imported but only named exports exist. */
export function applyDeterministicDefaultExportFixes(
  vfs: Record<string, string>,
  diagnosis: WorkspaceDiagnosis
): { vfs: Record<string, string>; notes: string[] } {
  const notes: string[] = [];
  let next = { ...vfs };
  const targets = new Set(diagnosis.errorPaths);

  for (const issue of diagnosis.issues) {
    const m = issue.match(/^([\w./-]+\.(?:tsx?|jsx?)) is default-imported/);
    if (m) targets.add(m[1]);
  }

  for (const path of targets) {
    const content = next[path];
    if (content == null || /export\s+default/.test(content)) continue;

    const fn = content.match(/export\s+function\s+(\w+)/);
    const cn = content.match(/export\s+const\s+(\w+)\s*=/);
    const name = fn?.[1] || cn?.[1];
    if (!name) continue;

    next[path] = `${content.replace(/\s*$/, "")}\n\nexport default ${name};\n`;
    notes.push(`Added missing default export in ${path}`);
  }

  return { vfs: next, notes };
}

/** Minimal placeholder modules for unresolved imports tied to a module-not-found crash. */
export function applyDeterministicMissingModuleStubs(
  vfs: Record<string, string>,
  diagnosis: WorkspaceDiagnosis,
  errorText: string,
  maxStubs = 2
): { vfs: Record<string, string>; notes: string[] } {
  const notes: string[] = [];
  let next = { ...vfs };

  if (!diagnosis.missingImports.length) return { vfs: next, notes };
  if (!/module not found|cannot find module|failed to resolve/i.test(errorText || "")) {
    return { vfs: next, notes };
  }

  const errorPaths = new Set(diagnosis.errorPaths);
  let created = 0;

  for (const { from, spec } of diagnosis.missingImports) {
    if (created >= maxStubs) break;
    if (errorPaths.size && !errorPaths.has(from)) continue;
    if (resolveImport(from, spec, next)) continue;

    const path = guessNewModulePath(from, spec);
    if (!path || next[path] != null) continue;

    const name = pascalFromPath(path);
    next[path] = `export default function ${name}() {\n  return <div />;\n}\n`;
    notes.push(`Stubbed missing module ${path} (import from ${from})`);
    created += 1;
  }

  return { vfs: next, notes };
}

export type PreviewPreflightResult = {
  vfs: Record<string, string>;
  diagnosis: WorkspaceDiagnosis;
  notes: string[];
  changed: boolean;
};

/**
 * Zero-token pre-flight before preview verify or LLM auto-fix.
 * Order: diagnose → router unwrap → default export → guarded missing-module stubs.
 */
export function runPreviewPreflight(
  vfs: Record<string, string>,
  errorText = ""
): PreviewPreflightResult {
  const diagnosis = diagnoseWorkspace(vfs, errorText);
  const notes: string[] = [];
  let next = { ...vfs };

  const router = applyDeterministicPreviewFixes(next, errorText);
  next = router.vfs;
  notes.push(...router.notes);

  const defaults = applyDeterministicDefaultExportFixes(next, {
    ...diagnosis,
    errorPaths: extractErrorPaths(errorText, next).length
      ? [...new Set([...diagnosis.errorPaths, ...extractErrorPaths(errorText, next)])]
      : diagnosis.errorPaths,
  });
  next = defaults.vfs;
  notes.push(...defaults.notes);

  const stubs = applyDeterministicMissingModuleStubs(next, diagnosis, errorText);
  next = stubs.vfs;
  notes.push(...stubs.notes);

  const changed = notes.length > 0;
  return { vfs: next, diagnosis, notes, changed };
}

export function composeFixPrompt(opts: {
  error: string;
  attempt: number;
  maxAttempts: number;
  diagnosis?: WorkspaceDiagnosis;
  prior?: FixAttempt | null;
}): string {
  const parts: string[] = [
    `Fix this runtime/preview error surgically (minimal diffs, max ~4 files): "${opts.error.slice(0, 500)}"`,
    "Prefer a single top-level MemoryRouter or HashRouter in App.tsx — never nest routers.",
    "Keep product identity. Do not rewrite unrelated screens, CSS, or sample data.",
    `Attempt ${opts.attempt}/${opts.maxAttempts}.`,
  ];

  if (opts.diagnosis?.issues.length) {
    parts.push("Local diagnosis (treat as ground truth):\n- " + opts.diagnosis.issues.join("\n- "));
  }
  if (opts.diagnosis?.errorPaths.length) {
    parts.push("Likely files: " + opts.diagnosis.errorPaths.slice(0, 8).join(", "));
  }

  if (opts.prior && opts.attempt > 1) {
    parts.push(
      `Previous attempt FAILED. Files touched: ${opts.prior.files.join(", ") || "(none)"}. ` +
        (opts.prior.thought ? `Prior thought: ${opts.prior.thought.slice(0, 400)}. ` : "") +
        (opts.prior.wroteAny
          ? "The same error came back — do NOT repeat that rewrite. Pick a different root cause."
          : "No files changed — you must actually edit the failing module.")
    );
  }

  parts.push("Explain what failed and what you changed.");
  return parts.join("\n");
}

/** Drop no-op rewrites; on autofix keep the blast radius small. */
export function limitFixPayload(
  files: { path: string; content: string }[],
  vfs: Record<string, string>,
  errorPaths: string[],
  maxFiles = 8
): { files: { path: string; content: string }[]; dropped: string[] } {
  const changed = files.filter((f) => {
    const path = f.path.replace(/^\.\//, "").replace(/^\/+/, "");
    return (vfs[path] ?? "") !== f.content;
  });
  if (changed.length <= maxFiles) return { files: changed, dropped: [] };

  const pin = new Set(errorPaths.map(normalizePath));
  pin.add("App.tsx");
  pin.add("App.jsx");
  const keep: typeof changed = [];
  const rest: typeof changed = [];
  for (const f of changed) {
    const p = normalizePath(f.path);
    if (pin.has(p) || [...pin].some((x) => p.endsWith("/" + x) || x.endsWith("/" + p))) {
      keep.push(f);
    } else {
      rest.push(f);
    }
  }
  const selected = [...keep, ...rest].slice(0, maxFiles);
  const dropped = changed
    .filter((f) => !selected.some((s) => s.path === f.path))
    .map((f) => f.path);
  return { files: selected, dropped };
}

export function buildWorkspaceMemory(opts: {
  purpose?: string;
  notes?: string[];
  lastFiles?: string[];
  nextPaths?: string[];
}): string {
  const lines: string[] = [];
  if (opts.purpose?.trim()) {
    lines.push(`Mission: ${opts.purpose.trim().replace(/\s+/g, " ").slice(0, 500)}`);
  }
  if (opts.notes?.length) {
    lines.push("Running notes:");
    for (const n of opts.notes.slice(-8)) lines.push(`- ${n.slice(0, 200)}`);
  }
  if (opts.lastFiles?.length) {
    lines.push(`Last files written: ${opts.lastFiles.slice(0, 12).join(", ")}`);
  }
  if (opts.nextPaths?.length) {
    lines.push(`Queued next_paths: ${opts.nextPaths.slice(0, 10).join(", ")}`);
  }
  return lines.join("\n").slice(0, 1400);
}

export function compactConversation(
  messages: { role: string; content: string }[],
  opts?: { maxMessages?: number }
): { digest: string; olderHint: string } {
  const max = opts?.maxMessages ?? 12;
  const usable = messages.filter((m) => m.role === "user" || m.role === "assistant");
  const older = usable.slice(0, Math.max(0, usable.length - max));
  const recent = usable.slice(-max);
  const digest = recent
    .map((m) => {
      const cap = m.role === "user" ? 420 : 220;
      return `${m.role}: ${m.content.replace(/\s+/g, " ").trim().slice(0, cap)}`;
    })
    .join("\n");

  let olderHint = "";
  if (older.length) {
    const firstUser = older.find((m) => m.role === "user")?.content.replace(/\s+/g, " ").trim().slice(0, 220);
    const lastAsst = [...older].reverse().find((m) => m.role === "assistant")?.content.replace(/\s+/g, " ").trim().slice(0, 180);
    olderHint = [
      firstUser ? `Earlier user: ${firstUser}` : "",
      lastAsst ? `Earlier assistant: ${lastAsst}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }
  return { digest, olderHint };
}

export function fileIndexLine(path: string, content: string): string {
  const exp =
    content.match(/export\s+default\s+(?:function\s+)?(\w+)/)?.[0] ||
    content.match(/export\s+(?:function|const|class)\s+\w+/)?.[0] ||
    "";
  return `- ${path} (${content.length} chars)${exp ? ` · ${exp.slice(0, 64)}` : ""}`;
}
