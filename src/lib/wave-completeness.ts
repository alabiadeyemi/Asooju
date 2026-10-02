/**
 * Step 6d/6e — local wave queue + hollow stub detection (zero tokens).
 * Merges model next_paths with unresolved imports and placeholder screens.
 */
import { diagnoseWorkspace, guessNewModulePath } from "./agent-intelligence";

export type WorkspaceCompletenessAudit = {
  /** Paths to implement or fix in upcoming waves */
  nextPaths: string[];
  hollowStubs: string[];
  missingModulePaths: string[];
  notes: string[];
};

const HOLLOW_STUB_RE =
  /coming soon|under construction|placeholder screen|not implemented yet|todo:|fixme:|stub page|lorem ipsum/i;

const ROUTE_COMPONENT_RE =
  /<Route\b[^>]*\belement=\{?\s*(?:<(\w+)[\s/>]|(\w+)\s*\/?>)/g;

function normalizePath(p: string): string {
  return p.replace(/^\.\//, "").replace(/^\/+/, "").replace(/\\/g, "/");
}

function basename(path: string): string {
  return path.split("/").pop()?.replace(/\.(tsx?|jsx?)$/i, "") || path;
}

function vfsLookup(vfs: Record<string, string>, guess: string): string | null {
  const n = normalizePath(guess);
  if (vfs[n] != null) return n;
  const lower = n.toLowerCase();
  const hit = Object.keys(vfs).find((k) => k.toLowerCase() === lower);
  return hit || null;
}

function pathForComponentName(vfs: Record<string, string>, name: string): string | null {
  const lower = name.toLowerCase();
  for (const k of Object.keys(vfs)) {
    if (!/\.(tsx|jsx)$/i.test(k)) continue;
    if (basename(k).toLowerCase() === lower) return k;
  }
  return null;
}

/** True when a screen is a renderable but intentionally hollow placeholder. */
export function isHollowStubContent(content: string): boolean {
  if (!content || !/export\s+default/.test(content)) return false;
  if (content.length > 1400) return false;
  if (HOLLOW_STUB_RE.test(content)) return true;
  if (/useState|useEffect|onClick|onSubmit|fetch\(|supabase|framer-motion/i.test(content)) {
    return false;
  }
  const jsxBody = content.match(/return\s*\([\s\S]*?\)\s*;?\s*\}/);
  if (!jsxBody) return false;
  const inner = jsxBody[0];
  if (inner.length > 420) return false;
  const tagCount = (inner.match(/<\w+/g) || []).length;
  return tagCount > 0 && tagCount <= 4;
}

function collectRoutedScreenPaths(vfs: Record<string, string>): string[] {
  const names = new Set<string>();
  for (const content of Object.values(vfs)) {
    if (!content.includes("<Route")) continue;
    let m: RegExpExecArray | null;
    ROUTE_COMPONENT_RE.lastIndex = 0;
    while ((m = ROUTE_COMPONENT_RE.exec(content))) {
      const name = m[1] || m[2];
      if (name && /^[A-Z]/.test(name)) names.add(name);
    }
  }
  const paths: string[] = [];
  for (const name of names) {
    const hit = pathForComponentName(vfs, name);
    if (hit) paths.push(hit);
  }
  return paths;
}

export function auditWorkspaceCompleteness(vfs: Record<string, string>): WorkspaceCompletenessAudit {
  const diagnosis = diagnoseWorkspace(vfs, "");
  const missingModulePaths: string[] = [];
  for (const { from, spec } of diagnosis.missingImports) {
    const path = guessNewModulePath(from, spec);
    if (path && vfs[path] == null && !missingModulePaths.includes(path)) {
      missingModulePaths.push(path);
    }
  }

  const hollowCandidates = [
    ...Object.keys(vfs).filter((p) => /\.(tsx|jsx)$/i.test(p)),
    ...collectRoutedScreenPaths(vfs),
  ];
  const hollowStubs = [...new Set(hollowCandidates)].filter((p) => {
    const c = vfs[p];
    return c != null && isHollowStubContent(c);
  });

  const nextPaths = [...new Set([...missingModulePaths, ...hollowStubs])];
  const notes: string[] = [];
  if (missingModulePaths.length) {
    notes.push(`Unresolved imports → create: ${missingModulePaths.slice(0, 6).join(", ")}`);
  }
  if (hollowStubs.length) {
    notes.push(`Hollow stub screens: ${hollowStubs.slice(0, 6).join(", ")}`);
  }

  return { nextPaths, hollowStubs, missingModulePaths, notes };
}

export function mergeWaveNextPaths(
  modelPaths: string[] | undefined,
  vfs: Record<string, string>,
  opts: { wave: number; maxWaves: number }
): string[] {
  const audit = auditWorkspaceCompleteness(vfs);
  const out: string[] = [];
  const push = (raw: string) => {
    const p = normalizePath(raw);
    if (!p || out.includes(p)) return;
    const hit = vfsLookup(vfs, p);
    if (hit && !audit.hollowStubs.includes(hit) && !audit.missingModulePaths.includes(p)) {
      return;
    }
    out.push(hit || p);
  };

  for (const p of modelPaths || []) push(p);
  for (const p of audit.missingModulePaths) push(p);
  if (opts.wave + 1 < opts.maxWaves) {
    for (const p of audit.hollowStubs) push(p);
  }

  return out.slice(0, 20);
}

/** Target paths for the current wave (session queue + audit, 6e prioritizes stubs on final wave). */
export function buildWaveTargetPaths(opts: {
  vfs: Record<string, string>;
  sessionNextPaths: string[];
  wave: number;
  maxWaves: number;
}): string[] {
  const audit = auditWorkspaceCompleteness(opts.vfs);
  const out: string[] = [];
  const push = (raw: string) => {
    const p = normalizePath(raw);
    if (p && !out.includes(p)) out.push(p);
  };

  for (const p of opts.sessionNextPaths) push(p);
  for (const p of audit.missingModulePaths) push(p);

  const onFinalWave = opts.wave >= opts.maxWaves - 1;
  if (onFinalWave || opts.wave > 0) {
    for (const p of audit.hollowStubs) push(p);
  }

  return out.slice(0, 16);
}

export function formatWaveQueueHint(targets: string[]): string {
  if (!targets.length) return "";
  return [
    "Priority paths for this wave (queued from last step + workspace audit):",
    ...targets.slice(0, 12).map((p) => `- ${p}`),
  ].join("\n");
}

export function hasRemainingStubWork(vfs: Record<string, string>): boolean {
  const audit = auditWorkspaceCompleteness(vfs);
  return audit.hollowStubs.length > 0 || audit.missingModulePaths.length > 0;
}
