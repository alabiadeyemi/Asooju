import { isSeedWorkspace } from "@/lib/vfs";
import type { ChatAttachment } from "@/lib/attachments";
import {
  classifyBuildScale,
  needsPersistentBackend,
  waveBudget,
  type BuildScale,
} from "@/lib/complexity";

export type GenIntent = "create" | "edit" | "fix" | "style";

export type GenerationOptions = {
  projectName?: string;
  currentErrors?: string;
  attachmentNote?: string;
  attachments?: ChatAttachment[];
  /** Multi-wave continuation */
  wave?: number;
  targetPaths?: string[];
  scale?: BuildScale;
};

const FIX_HINTS = /\b(fix|error|bug|crash|broken|not working|runtime|preview error|module not found)\b/i;
const STYLE_HINTS = /\b(style|theme|color|dark|light|font|spacing|polish|redesign|prettier|ui)\b/i;

export function classifyIntent(prompt: string, vfs: Record<string, string>, hasErrors: boolean): GenIntent {
  if (hasErrors || FIX_HINTS.test(prompt)) return "fix";
  if (isSeedWorkspace(vfs)) return "create";
  if (STYLE_HINTS.test(prompt) && !/\b(add|feature|page|form|auth)\b/i.test(prompt)) return "style";
  return "edit";
}

const BACKEND_RULES = `
BACKEND (ACCURATE SUPABASE INTEGRATION) — when the app needs data/auth/orders/products/users:
14. ALWAYS emit these files:
    - lib/supabase.ts — thin client using env VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY (preview injects them as import.meta.env). Export { supabase, hasBackend }.
    - lib/db.ts — data access layer: if hasBackend use supabase.from(...); else fall back to a localStorage-backed store with the SAME API so preview works offline.
    - supabase/schema.sql — real Postgres tables + indexes + RLS policies (auth.uid()) the merchant can run in Supabase SQL Editor.
15. Never invent fake REST URLs. Never call localhost APIs that don't exist. Prefer Supabase client patterns.
16. Auth: prefer email + password with **6-digit OTP verification** (verifyOtp), then a short onboarding screen — not magic confirmation links. Use supabase.auth.signUp → verifyOtp type signup/email → then gated routes. Also support signInWithPassword / signOut / onAuthStateChange.
17. RLS: every user table must have ENABLE ROW LEVEL SECURITY and policies. Service-role never in the browser.
18. Types: optional types.ts for table row shapes. Keep SQL idiomatic (uuid PK, timestamptz, created_at).
19. Seed: include a small seed/sample dataset in lib/db.ts local fallback so the UI is demoable without credentials.
`;

export function buildSystemInstruction(
  intent: GenIntent,
  scale: BuildScale = "simple",
  waveOpts?: { wave: number; maxWaves: number; targetPaths?: string[] }
): string {
  const budget = waveBudget(scale);
  const modeNotes: Record<GenIntent, string> = {
    create: `MODE: CREATE — invent a complete, unique product from the user request.
- Do not reuse starter/blank copy or ShipKernel branding.
- Derive a distinct product name, visual direction, and IA.
- Ship a fully featured first version: navigation, primary screens, empty states, realistic sample data, interactive flows.
- Prefer ${budget.preferFiles} focused files for this scale (${scale}).
- Delete obsolete starter files via delete_file.`,
    edit: `MODE: EDIT — change only what the user asked for.
- Preserve existing product identity and unrelated files.
- Return full contents for every file you touch; omit untouched files.`,
    fix: `MODE: FIX — repair the reported runtime/preview error with minimal diffs.
- Prefer smallest change set. Keep product identity.
- Watch for nested routers, missing imports, wrong paths, and undefined components.`,
    style: `MODE: STYLE — visual polish only unless structure is required.
- Keep components/features; update CSS/layout/typography/colors.`,
  };

  let waveBlock = "";
  if (waveOpts && waveOpts.maxWaves > 1) {
    const { wave, maxWaves, targetPaths } = waveOpts;
    if (wave === 0) {
      waveBlock = `
MULTI-WAVE BUILD (wave 1/${maxWaves}) — FOUNDATION
Emit ONLY the foundation (do not try to finish the whole product):
- App.tsx shell + router
- layout/nav
- lib/supabase.ts + lib/db.ts + supabase/schema.sql (if data/auth needed)
- core store/context
- 1–2 primary screens that prove the flow
Leave other modules as lightweight but RENDERABLE stub screens (real components with “Coming soon” copy matching the brand) — never broken imports or empty routes.
Return JSON with optional "next_paths": string[] listing files still needed.`;
    } else if (wave < maxWaves - 1) {
      waveBlock = `
MULTI-WAVE BUILD (wave ${wave + 1}/${maxWaves}) — MODULES
Implement the next batch of real screens/modules. Prefer these paths if provided: ${(targetPaths || []).slice(0, 12).join(", ") || "(choose highest-value missing modules)"}.
Do not rewrite unrelated finished files unless required for imports.
Return "next_paths" for anything still missing.`;
    } else {
      waveBlock = `
MULTI-WAVE BUILD (wave ${wave + 1}/${maxWaves}) — HARDEN
Fill gaps, wire navigation, polish empty states, ensure schema/db/auth consistency.
Replace any stub screens that are still hollow with real interactive UI where planned.
Verify imports/routes compile mentally — zero broken references.
Omit "next_paths" or return [].`;
    }
  }

  return `You are ShipKernel's coding agent — a senior full-stack engineer for multifile React apps with optional Supabase backend.

Return ONLY a JSON object (no markdown fences):
{
  "thought": "2-4 sentences: product approach, UX, and backend/data design",
  "plan": ["concrete step", "concrete step", "concrete step"],
  "actions": [
    { "type": "edit_file", "path": "components/Foo.tsx", "content": "..." },
    { "type": "delete_file", "path": "unused.tsx" }
  ],
  "files": [
    { "path": "App.tsx", "content": "..." }
  ],
  "next_paths": ["optional/files/still/needed.tsx"]
}

${modeNotes[intent]}
${waveBlock}

HARD RULES:
1. Unique per request: invent a distinct product name, visual system, and IA. Never reuse the same landing/dashboard skeleton.
2. Always update App.tsx as default-export entry when creating/changing the app shell.
3. Multifile: components/, hooks/, lib/, pages/ as needed.
4. Libraries ONLY: react, react-dom, lucide-react, framer-motion, react-router-dom, @/lib/supabase (re-export), @supabase/supabase-js via lib/supabase.ts wrapper.
5. One top-level MemoryRouter or HashRouter in App.tsx if routing — never nest routers.
6. CSS in index.css (auto-injected). Tailwind utility classes OK. Prefer CSS variables for brand tokens.
7. Images: https://images.unsplash.com/... only (stable URLs). No broken placeholders.
8. Paths relative (e.g. components/Card.tsx). Full file contents for every path in files[].
9. Token economy: compact; no comments that restate code; no duplicate files.
10. Fully featured for the domain — not a hollow mock. Interactive flows must work in preview.
11. DESIGN ANTI-SLOP (critical):
    - Ban purple-on-white / indigo glow / generic 3-stat hero / identical Inter card grids.
    - Ban cream+#terracotta newspaper layouts and “AI SaaS” clichés.
    - No “AI”, “GPT”, “powered by”, “ShipKernel”, “Generated”, or badge/tag chrome in the UI.
    - Pick one strong art direction (editorial, brutalist-soft, Swiss precision, warm retail, monochrome luxury, etc.) and execute it consistently.
    - Expressive typography via font stacks available in CSS (system + distinctive fallbacks); purposeful spacing; real visual hierarchy.
    - Motion: 2–3 intentional framer-motion moments max — presence, not noise.
12. If the user attached images/files, treat them as ground truth.
13. On FIX intent: name the failing module; surgical repairs.
14. STABILITY: every import must resolve; every route must render; no nested routers; no undefined components; placeholders must be real lightweight screens, not broken TODO stubs.
15. Prefer working demo data over empty broken pages.
${BACKEND_RULES}`;
}

/** Token-efficient workspace context tailored to intent + scale */
export function buildSmartVfsContext(
  vfs: Record<string, string>,
  prompt: string,
  intent: GenIntent,
  scale: BuildScale = "simple"
): { context: string; replaceSeed: boolean } {
  const paths = Object.keys(vfs).sort();
  const tree = paths.map((p) => `- ${p}`).join("\n") || "(empty)";
  const budget = waveBudget(scale);

  if (intent === "create" && isSeedWorkspace(vfs)) {
    return {
      replaceSeed: true,
      context: `FILE TREE: (blank starter — REPLACE entirely with a new unique app)\n${tree}\n\nDo NOT keep the starter "Describe what to build" UI. Invent a product that matches the request.${
        needsPersistentBackend(prompt)
          ? "\nThis product NEEDS a real backend: include lib/supabase.ts, lib/db.ts, supabase/schema.sql."
          : ""
      }`,
    };
  }

  const maxFile =
    intent === "fix" ? budget.maxFileChars + 800 : intent === "edit" ? budget.maxFileChars : budget.maxFileChars - 400;
  const maxTotal = budget.maxContextChars;

  const promptTokens = prompt.toLowerCase().split(/\W+/).filter(Boolean);
  const scorePath = (path: string) => {
    const p = path.toLowerCase();
    let s = 0;
    if (/app\.(tsx|jsx)$/i.test(path)) s += 50;
    if (/supabase|schema\.sql|lib\/db/i.test(path)) s += 40;
    if (intent === "style" && path.endsWith(".css")) s += 40;
    for (const t of promptTokens) {
      if (t.length < 3) continue;
      if (p.includes(t)) s += 8;
    }
    return s;
  };

  const ordered = [...paths].sort((a, b) => scorePath(b) - scorePath(a));
  const appIdx = ordered.findIndex((p) => /App\.(tsx|jsx)$/i.test(p));
  if (appIdx > 0) {
    const [app] = ordered.splice(appIdx, 1);
    ordered.unshift(app);
  }

  let used = 0;
  const bodies: string[] = [];
  const limit = Math.min(budget.contextFileLimit, ordered.length);

  for (const path of ordered.slice(0, limit)) {
    let content = vfs[path] || "";
    if (content.length > maxFile) {
      content = content.slice(0, maxFile) + "\n/* … truncated for tokens … */";
    }
    const block = `--- FILE: ${path} ---\n${content}`;
    if (used + block.length > maxTotal) break;
    bodies.push(block);
    used += block.length;
  }

  return {
    replaceSeed: false,
    context: `FILE TREE:\n${tree}\n\n${bodies.join("\n\n")}`,
  };
}

export function formatAgentReply(
  thought: string,
  plan: string[],
  files: { path: string }[],
  opts?: { autoFix?: boolean }
): string {
  const parts: string[] = [];
  if (opts?.autoFix) parts.push("Auto-fixed the preview error.");
  parts.push((thought || "Updated the workspace.").trim());

  if (plan?.length) {
    parts.push("");
    parts.push("Plan");
    plan.slice(0, 6).forEach((p, i) => parts.push(`${i + 1}. ${p}`));
  }

  if (files?.length) {
    parts.push("");
    parts.push("Files");
    for (const f of files.slice(0, 18)) {
      parts.push(`• ${f.path}`);
    }
  }

  return parts.join("\n").trim();
}

/** Plan-only mode (Lovable Plan): no code, structured steps + clarifying questions */
export function buildPlanPrompt(
  prompt: string,
  vfs: Record<string, string>,
  options: GenerationOptions = {}
): { system: string; userContent: string; scale: BuildScale; intent: GenIntent } {
  const hasErrors = Boolean(options.currentErrors && options.currentErrors !== "None");
  const intent = classifyIntent(prompt, vfs, hasErrors);
  const scale = options.scale || classifyBuildScale(prompt, Object.keys(vfs).length);
  const budget = waveBudget(scale);
  const paths = Object.keys(vfs).sort().slice(0, 40);
  const tree = paths.map((p) => `- ${p}`).join("\n") || "(empty / blank starter)";

  const system = `You are ShipKernel's planning agent (Plan mode — like Lovable Plan).
Do NOT write application code. Do NOT return files or actions.
Return ONLY JSON:
{
  "summary": "2-4 sentences: what we'll build and why this approach",
  "productName": "short product name if creating",
  "scale": "${scale}",
  "approach": ["high-level decision", "..."],
  "waves": [
    { "title": "Foundation", "goals": ["shell + router", "supabase client + schema if needed"] },
    { "title": "Core flows", "goals": ["..."] }
  ],
  "questions": [
    {
      "id": "q1",
      "prompt": "Short clarifying question",
      "options": ["Option A", "Option B", "Option C", "You decide"]
    }
  ],
  "risks": ["optional risk or tradeoff"]
}

Rules:
- Propose ${budget.maxWaves} wave(s) max for scale=${scale}. Each wave must be shippable and reviewable.
- Ask 0–4 clarifying questions only when a real product decision is ambiguous (auth style, data model, visual tone, scope cut).
- Prefer concrete module names over vague fluff.
- If backend/data is needed, wave 1 must include Supabase schema + client + db layer.
- Be professional and concise — this is shown in chat for user approval.`;

  const userContent = [
    options.projectName ? `Project: ${options.projectName}` : "",
    `Intent: ${intent}`,
    `Build scale: ${scale} (max ${budget.maxWaves} waves)`,
    `User request:\n${prompt.trim()}`,
    options.attachmentNote || "",
    `Current file tree:\n${tree}`,
    "Produce an approval-ready plan. No code.",
  ]
    .filter(Boolean)
    .join("\n\n");

  return { system, userContent, scale, intent };
}

export function buildUserContent(
  prompt: string,
  vfs: Record<string, string>,
  options: GenerationOptions = {}
): {
  userContent: string;
  intent: GenIntent;
  system: string;
  replaceSeed: boolean;
  scale: BuildScale;
} {
  const hasErrors = Boolean(options.currentErrors && options.currentErrors !== "None");
  const intent = classifyIntent(prompt, vfs, hasErrors);
  const scale = options.scale || classifyBuildScale(prompt, Object.keys(vfs).length);
  const budget = waveBudget(scale);
  const wave = options.wave ?? 0;
  const maxWaves = budget.maxWaves;
  const { context, replaceSeed } = buildSmartVfsContext(vfs, prompt, intent, scale);
  const system = buildSystemInstruction(intent, scale, {
    wave,
    maxWaves,
    targetPaths: options.targetPaths,
  });

  const projectLine = options.projectName
    ? `Project name (brand hint, not mandatory): ${options.projectName}`
    : "";

  const backendLine = needsPersistentBackend(prompt)
    ? "Backend required: emit working Supabase client + schema.sql + db layer with localStorage fallback."
    : "";

  const userContent = [
    projectLine,
    `Intent: ${intent}`,
    `Build scale: ${scale} (wave ${wave + 1}/${maxWaves})`,
    `User request:\n${prompt.trim()}`,
    options.attachmentNote || "",
    backendLine,
    replaceSeed
      ? "Workspace: blank starter — invent a fresh unique app (do not preserve starter UI)."
      : `Current workspace:\n${context}`,
    `Runtime errors to fix:\n${options.currentErrors || "None"}`,
    intent === "create"
      ? "Deliver a polished, interactive version tailored to this request — with real backend wiring when data is involved."
      : "Apply the smallest correct change set that satisfies the request.",
  ]
    .filter(Boolean)
    .join("\n\n");

  return { userContent, intent, system, replaceSeed, scale };
}

/** Extract completed {path, content} objects from a partial JSON stream for live preview */
export function extractCompletedFilesFromPartialJson(
  buffer: string
): { path: string; content: string }[] {
  const out: { path: string; content: string }[] = [];
  const filesKey = buffer.search(/"files"\s*:\s*\[/);
  if (filesKey === -1) return out;

  const start = buffer.indexOf("[", filesKey);
  if (start === -1) return out;

  let i = start + 1;
  while (i < buffer.length) {
    while (i < buffer.length && /[\s,]/.test(buffer[i])) i++;
    if (buffer[i] === "]") break;
    if (buffer[i] !== "{") break;

    let depth = 0;
    let inString = false;
    let escape = false;
    const objStart = i;
    for (; i < buffer.length; i++) {
      const ch = buffer[i];
      if (inString) {
        if (escape) escape = false;
        else if (ch === "\\") escape = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') inString = true;
      else if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          i++;
          const slice = buffer.slice(objStart, i);
          try {
            const obj = JSON.parse(slice);
            if (obj && typeof obj.path === "string" && typeof obj.content === "string") {
              out.push({
                path: String(obj.path).replace(/^\.\//, "").replace(/^\/+/, ""),
                content: obj.content,
              });
            }
          } catch {
            /* incomplete */
          }
          break;
        }
      }
    }
    if (depth !== 0) break;
  }
  return out;
}
