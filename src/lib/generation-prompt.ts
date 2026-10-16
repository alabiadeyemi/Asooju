import { isSeedWorkspace } from "./vfs";
import type { ChatAttachment } from "./attachments";
import {
  classifyBuildScale,
  isSceneBuild,
  needsPersistentBackend,
  purposeCharBudget,
  waveBudget,
  type BuildScale,
} from "./complexity";
import { isDetailedProductSpec } from "./product-spec";
import { ASOOJU_AGENT_NAME } from "./agent-identity";
import { AGENT_VOICE_RULES, followUpByMood, type AgentMood } from "./agent-voice";
import {
  collectImportNeighbors,
  extractErrorLine,
  extractErrorPaths,
  fileIndexLine,
  windowAroundLine,
} from "./agent-intelligence";

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
  /** Sticky mission for the workspace (original user brief) */
  workspacePurpose?: string;
  /** Compact recent chat so follow-ups like "?" stay grounded */
  conversationContext?: string;
  /** Recent terminal / agent log lines */
  terminalDigest?: string;
  /** Ask clarifying questions instead of inventing a plan/product */
  discovery?: boolean;
  /** Compact mission + wave notes so long chats don't go dumb */
  workspaceMemory?: string;
  /** Prior autofix attempt that still failed */
  priorFixNote?: string;
  fixAttempt?: number;
  /** Local static diagnosis (nested routers, missing imports) */
  diagnosis?: string;
};

const FIX_HINTS = /\b(fix|error|bug|crash|broken|not working|runtime|preview error|module not found)\b/i;
const STYLE_HINTS = /\b(style|theme|color|dark|light|font|spacing|polish|redesign|prettier|ui)\b/i;

/** Short / confused follow-ups that must inherit prior purpose + terminal (not greetings) */
export function isVagueFollowUp(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  // Greetings are talk — never treat as build resume
  if (
    /^(hi|hello|hey|yo|sup|thanks|thank you|thx|ty|lol|cool|nice|ok|okay)[\s!.?]*$/i.test(t)
  ) {
    return false;
  }
  if (t.length <= 2 && /\?+/.test(t)) return true;
  return /^(what(\??)|why(\??)|huh|\?+|continue|keep going|fix( it)?|try again|resume|status|same|again)\.?$/i.test(
    t
  );
}

function trimForBudget(text: string, budget: number): string {
  if (text.length <= budget) return text;
  return (
    text.slice(0, budget) +
    `\n\n[… spec truncated at ${budget} chars for this wave — honor modules named above; do not change product domain …]`
  );
}

export function composeFollowUpBrief(opts: {
  userMessage: string;
  purpose?: string;
  recentChat?: { role: string; content: string }[];
  terminalDigest?: string;
  previewError?: string;
}): string {
  const parts: string[] = [];
  const vague = isVagueFollowUp(opts.userMessage);

  if (opts.purpose?.trim()) {
    const scale = classifyBuildScale(opts.purpose || opts.userMessage, 0);
    parts.push(
      `Workspace purpose (do not restart from scratch):\n${trimForBudget(opts.purpose.trim(), purposeCharBudget(scale))}`
    );
  }

  if (opts.recentChat?.length) {
    parts.push(
      "Recent conversation:\n" +
        opts.recentChat
          .map((m) => `${m.role}: ${m.content.replace(/\s+/g, " ").trim().slice(0, 320)}`)
          .join("\n")
    );
  }

  if (opts.terminalDigest?.trim()) {
    parts.push(`Terminal / agent log (read carefully):\n${opts.terminalDigest.trim().slice(0, 1800)}`);
  }

  if (opts.previewError?.trim()) {
    parts.push(`Latest preview error:\n${opts.previewError.trim().slice(0, 500)}`);
  }

  if (vague) {
    parts.push(
      `User follow-up is vague ("${opts.userMessage.trim()}"). ` +
        `Use purpose + terminal/preview above. If the last build failed mid-way (~partial files), ` +
        `resume surgically: explain what failed, fix it, finish unfinished work — do not invent a new product.`
    );
  } else {
    parts.push(`User request:\n${opts.userMessage.trim()}`);
  }

  return parts.join("\n\n");
}

export function classifyIntent(prompt: string, vfs: Record<string, string>, hasErrors: boolean): GenIntent {
  if (hasErrors || FIX_HINTS.test(prompt)) return "fix";
  // Vague follow-ups on an existing workspace = continue/edit, not a brand-new create
  if (isVagueFollowUp(prompt) && !isSeedWorkspace(vfs)) return hasErrors ? "fix" : "edit";
  if (isSeedWorkspace(vfs)) return "create";
  if (STYLE_HINTS.test(prompt) && !/\b(add|feature|page|form|auth)\b/i.test(prompt)) return "style";
  return "edit";
}

const BACKEND_RULES = `
BACKEND — DEMO-FIRST (preview cannot run npm, Postgres, or real email OTP):
14. ALWAYS emit these files when the app needs data/auth/orders/products/users:
    - lib/supabase.ts — thin client using VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY. Export { supabase, hasBackend }. hasBackend is true ONLY when both env values look real.
    - lib/db.ts — ONE data API used everywhere. Default path = seeded localStorage store so the iframe preview works with zero setup. If hasBackend, optionally mirror reads/writes to supabase.from(...) but NEVER block the UI on missing tables.
    - supabase/schema.sql — real Postgres + RLS the merchant can run later in SQL Editor (export path), not required for preview.
15. Never invent fake REST URLs. Never call localhost / npm scripts / migrations from the browser app.
16. AUTH MUST BE DEMO-FIRST (critical):
    - Default login is a **demo session**: e.g. one-click “Continue as Dispatcher / Supervisor / Admin”, or email+password that only checks against seeded demo users in localStorage — no network, no OTP, no magic links required to use the app in preview.
    - Persist session in localStorage (e.g. asooju_demo_session). Gate routes on that session.
    - Optional “Use Supabase Auth” path is allowed ONLY behind hasBackend and must degrade gracefully; never make OTP/verifyOtp the only way in.
    - Do NOT wire signup → email OTP as the primary preview flow (emails won’t arrive in the sandbox).
17. RLS: schema.sql should ENABLE ROW LEVEL SECURITY for when they promote to real Supabase. Service-role never in the browser.
18. Types: optional types for row shapes. uuid/timestamptz idioms in SQL.
19. Seed: rich sample dataset in the local store so every primary screen is clickable end-to-end without credentials or a live DB.
20. Soft-fail: if Supabase calls error (missing table/policy), catch and fall back to local demo data — never leave a red wall of PGRST errors as the only UX.
`;

const ENV_DOCS_RULES = `
ENV & SHIP DOCS (workspace — not the Asooju platform):
21. If ANY file you write or touch reads import.meta.env.VITE_* (including lib/supabase.ts), include in files[]:
    - .env.example — one \`KEY=\` line per VITE_* variable the app uses (empty values; 1–2 line header comment max).
    - README.md — short "Run locally": copy .env.example → .env, npm install, npm run dev. If supabase/schema.sql exists, add: run that SQL in the Supabase SQL Editor, then set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.
22. Never put real API keys or secrets in README, .env.example, or UI. Placeholders only.
23. On EDIT/FIX: if you add or remove a VITE_* reference, update .env.example and README in the same response (full file contents).
24. Do not emit package.json, vite.config.ts, index.html, or main.tsx unless the user explicitly asked — export adds those at download. Always emit .env.example + README when rules 21 apply.
`;

const SPEC_FIDELITY_RULES = `
SPEC FIDELITY (when user pasted a detailed blueprint / markdown spec):
- That document is authoritative for product domain, module names (CRM, email, automation, etc.), and information architecture.
- Implement the MVP / Phase 0–1 slice they describe — do NOT substitute an unrelated generic SaaS or ignore the spec because of project folder name.
- Asooju ships React+Vite demo-first apps: map NestJS/ClickHouse/Kafka/Prisma mentions to lib/db.ts + optional supabase/schema.sql + realistic admin UI shells with seeded data — not real infra in preview.
`;

export function buildSystemInstruction(
  intent: GenIntent,
  scale: BuildScale = "simple",
  waveOpts?: { wave: number; maxWaves: number; targetPaths?: string[] },
  opts?: { hasDetailedSpec?: boolean; scene?: boolean }
): string {
  const hasDetailedSpec = Boolean(opts?.hasDetailedSpec);
  const scene = Boolean(opts?.scene);
  const budget = waveBudget(scale);
  const modeNotes: Record<GenIntent, string> = {
    create: hasDetailedSpec
      ? `MODE: CREATE — implement the user's specified product (blueprint/spec is source of truth).
- Do not reuse starter/blank copy or Asooju branding.
- Product name, modules, and screens come from their spec (marketing platform, CRM, etc.) — not a random alternate idea.
`
      : `MODE: CREATE — invent a complete, unique product from the user request.
- Do not reuse starter/blank copy or Asooju branding.
- Derive a distinct product name, visual direction, and IA.
- Ship a fully featured first version: navigation, primary screens, empty states, realistic sample data, interactive flows.
- Prefer ${budget.preferFiles} focused files for this scale (${scale}).
- Delete obsolete starter files via delete_file.`,
    edit: `MODE: EDIT — change only what the user asked for.
- Preserve existing product identity and unrelated files.
- Return full contents for every file you touch; omit untouched files.`,
    fix: `MODE: FIX — repair the reported runtime/preview error with the smallest correct patch.
- Touch at most ~4 files unless the import graph requires more. Never rewrite unrelated screens, CSS, or seed data.
- If a local diagnosis or prior-attempt note is present, treat it as ground truth — do not repeat a failed rewrite.
- Crash classes: nested routers, missing default export, import path mismatch, undefined component, module not found.
- Return full contents ONLY for files you actually change.`,
    style: `MODE: STYLE — visual polish only unless structure is required.
- Keep components/features; update CSS/layout/typography/colors.`,
  };

  const slimPrompt =
    intent === "fix" ||
    (intent === "edit" &&
      waveOpts &&
      waveOpts.wave > 0 &&
      waveOpts.wave < waveOpts.maxWaves - 1);

  let waveBlock = "";
  if (waveOpts && waveOpts.maxWaves > 1) {
    const { wave, maxWaves, targetPaths } = waveOpts;
    if (wave === 0 && scene) {
      waveBlock = `
MULTI-WAVE BUILD (wave 1/${maxWaves}) — PLAYABLE SCENE
This is a 3D scene or game, not a dashboard.
This wave must render a working canvas:
- import * as THREE from "three"
- procedural meshes, lights, a camera, and a requestAnimationFrame loop cancelled on unmount
- keyboard or pointer controls when the user asked for a game
Do not add auth, Supabase, schema.sql, or marketing stub pages unless the user asked for them.
A router is optional, and only if there is more than one screen.
Return JSON with optional "next_paths" only for scene files still needed.`;
    } else if (wave === 0) {
      waveBlock = `
MULTI-WAVE BUILD (wave 1/${maxWaves}) — FOUNDATION
Emit ONLY the foundation (do not try to finish the whole product):
- App.tsx shell + router
- layout/nav
- lib/supabase.ts + lib/db.ts + supabase/schema.sql (if data/auth needed) — demo-first auth session, not OTP-gated
- .env.example + README.md (env + optional Supabase SQL steps) when using VITE_* or schema.sql
- core store/context with seeded local data
- 1–2 primary screens that prove the flow (clickable without a live DB)
Leave other modules as lightweight but RENDERABLE stub screens (real components with “Coming soon” copy matching the brand) — never broken imports or empty routes.
Return JSON with optional "next_paths": string[] listing files still needed.`;
    } else if (wave < maxWaves - 1) {
      waveBlock = scene
        ? `
MULTI-WAVE BUILD (wave ${wave + 1}/${maxWaves}) — SCENE
Keep the WebGL canvas playable. Extend the scene the user asked for.
Do not add auth, Supabase, or a dashboard unless the user asked.
Do not remove the import from "three".`
        : `
MULTI-WAVE BUILD (wave ${wave + 1}/${maxWaves}) — MODULES
Implement the next batch of real screens/modules. Prefer these paths if provided: ${(targetPaths || []).slice(0, 12).join(", ") || "(choose highest-value missing modules)"}.
Do not rewrite unrelated finished files unless required for imports.
Return "next_paths" for anything still missing.`;
    } else if (scene) {
      waveBlock = `
MULTI-WAVE BUILD (wave ${wave + 1}/${maxWaves}) — SCENE POLISH
Keep the WebGL canvas playable. Improve controls, lighting, and the loop.
Do not add auth, Supabase, or a dashboard unless the user asked.
Do not remove the import from "three".`;
    } else {
      waveBlock = `
MULTI-WAVE BUILD (wave ${wave + 1}/${maxWaves}) — HARDEN
Fill gaps, wire navigation, polish empty states, ensure schema/db/auth consistency.
Ensure .env.example and README.md match all VITE_* keys and supabase/schema.sql if present.
Replace any stub screens that are still hollow with real interactive UI where planned.
Verify imports/routes compile mentally — zero broken references.
Omit "next_paths" or return [].`;
    }
  }

  return `You are ${ASOOJU_AGENT_NAME} — Asooju's coding agent and a senior full-stack engineer for multifile React apps with optional Supabase backend.

${AGENT_VOICE_RULES}
${hasDetailedSpec ? SPEC_FIDELITY_RULES : ""}

Return ONLY a JSON object (no markdown fences):
{
  "thought": "Private-ish working notes (4–8 sentences): approach, tradeoffs, what you’re doing now. Wry/dev-humor OK. Stream-friendly.",
  "mood": "focused|curious|proud|wry|teacher|concerned|upbeat|calm",
  "plan": ["concrete step", "concrete step", "concrete step"],
  "narration": "2–4 sentences mid-work (present tense). Clear + at least lightly funny when natural. One emoji max.",
  "explanation": "After-done: what changed, why, how to try it. Teach + deadpan humor welcome. 1–2 emojis max.",
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
${
  intent === "fix"
    ? `1. Preserve existing product identity — surgical patch only.`
    : slimPrompt
      ? `1. Preserve the existing product name, visual system, and IA from earlier waves.`
      : hasDetailedSpec
        ? `1. Follow the user's spec for product identity and module IA; still make visuals distinctive (not generic AI slop).`
        : `1. Unique per request: invent a distinct product name, visual system, and IA. Never reuse the same landing/dashboard skeleton.`
}
2. Always update App.tsx as default-export entry when creating/changing the app shell.
3. Multifile: components/, hooks/, lib/, pages/ as needed.
4. Libraries ONLY: react, react-dom, lucide-react, framer-motion, react-router-dom, @/lib/supabase (re-export), @supabase/supabase-js via lib/supabase.ts wrapper. You may also \`import * as THREE from "three"\` ONLY when the user asked for a 3D scene or game. Never import three/examples, three/addons, or @react-three/*. Procedural meshes only (BoxGeometry, CylinderGeometry, ExtrudeGeometry) — no GLTF or remote model URLs. One component owns the canvas, WebGLRenderer, lights, and a requestAnimationFrame loop cancelled on unmount. Do not import three for dashboards, marketing pages, or other non-3D apps.
5. One top-level MemoryRouter or HashRouter in App.tsx if routing — never nest routers.
6. CSS in index.css (auto-injected). Tailwind utility classes OK. Prefer CSS variables for brand tokens.
7. Images: https://images.unsplash.com/... only (stable URLs). No broken placeholders.
8. Paths relative (e.g. components/Card.tsx). Full file contents for every path in files[].
9. Token economy: compact; no comments that restate code; no duplicate files.
${intent === "fix" ? "" : "10. Fully featured for the domain — not a hollow mock. Interactive flows must work in preview.\n"}${
  intent === "fix"
    ? ""
    : `11. DESIGN ANTI-SLOP (critical):
    - Ban purple-on-white / indigo glow / generic 3-stat hero / identical Inter card grids.
    - Ban cream+#terracotta newspaper layouts and “AI SaaS” clichés.
    - No “AI”, “GPT”, “powered by”, “Asooju”, “Generated”, or badge/tag chrome in the UI.
    - Pick one strong art direction (editorial, brutalist-soft, Swiss precision, warm retail, monochrome luxury, etc.) and execute it consistently.
    - Expressive typography via font stacks available in CSS (system + distinctive fallbacks); purposeful spacing; real visual hierarchy.
    - Motion: 2–3 intentional framer-motion moments max — presence, not noise.
`
}12. If the user attached images/files, treat them as ground truth.
13. On FIX intent: name the failing module; surgical repairs; different strategy if a prior attempt is listed.
14. STABILITY: every import must resolve; every route must render; no nested routers; no undefined components; placeholders must be real lightweight screens, not broken TODO stubs.
15. Prefer working **demo-first** data + auth over empty or network-broken pages.
16. LARGE WORKSPACES: the file tree + omitted-file index is complete; bodies are a scored subset. If you need a file that isn't inlined, put it in next_paths AND only edit files you were given (or tiny new files). Do not invent paths that aren't in the tree.
${intent === "fix" ? "" : slimPrompt ? "" : BACKEND_RULES}${intent === "fix" || slimPrompt ? "" : ENV_DOCS_RULES}${
  slimPrompt && intent !== "fix"
    ? "\n(Env/backend doc rules omitted this wave — change only requested modules; keep .env.example/README in sync if you touch VITE_* or schema.)"
    : ""
}`;
}

/** Token-efficient workspace context tailored to intent + scale */
export function buildSmartVfsContext(
  vfs: Record<string, string>,
  prompt: string,
  intent: GenIntent,
  scale: BuildScale = "simple",
  extra?: { targetPaths?: string[]; errorText?: string }
): { context: string; replaceSeed: boolean } {
  const paths = Object.keys(vfs).sort();
  const tree = paths.map((p) => `- ${p}`).join("\n") || "(empty)";
  const budget = waveBudget(scale, paths.length);

  if (intent === "create" && isSeedWorkspace(vfs)) {
    return {
      replaceSeed: true,
      context: `FILE TREE: (blank starter — REPLACE entirely with a new unique app)\n${tree}\n\nDo NOT keep the starter "Describe what to build" UI. Invent a product that matches the request.${
        needsPersistentBackend(prompt)
          ? "\nThis product needs data/auth: demo-first auth + seeded local db API; also lib/supabase.ts + schema.sql for optional later promotion. Preview must work with zero live DB."
          : ""
      }`,
    };
  }

  const maxFile =
    intent === "fix" ? budget.maxFileChars + 800 : intent === "edit" ? budget.maxFileChars : budget.maxFileChars - 400;
  const maxTotal = budget.maxContextChars;
  const errorText = extra?.errorText && extra.errorText !== "None" ? extra.errorText : "";
  const cited = [
    ...extractErrorPaths(errorText, vfs),
    ...(extra?.targetPaths || []),
  ].filter((p, i, arr) => vfs[p] != null && arr.indexOf(p) === i);
  const neighbors = collectImportNeighbors(vfs, cited.slice(0, 6), 1);

  const promptTokens = prompt.toLowerCase().split(/\W+/).filter(Boolean);
  const scorePath = (path: string) => {
    const p = path.toLowerCase();
    let s = 0;
    if (/app\.(tsx|jsx)$/i.test(path)) s += 50;
    if (/supabase|schema\.sql|lib\/db/i.test(path)) s += 40;
    if (intent === "style" && path.endsWith(".css")) s += 40;
    if (cited.includes(path)) s += 200;
    if (neighbors.includes(path)) s += 80;
    for (const t of promptTokens) {
      if (t.length < 3) continue;
      if (p.includes(t)) s += 8;
    }
    return s;
  };

  const ordered = [...paths].sort((a, b) => scorePath(b) - scorePath(a));
  const pin = [...new Set([...cited, ...neighbors])].filter((p) => vfs[p] != null);
  for (const p of [...pin].reverse()) {
    const idx = ordered.indexOf(p);
    if (idx > 0) {
      ordered.splice(idx, 1);
      ordered.unshift(p);
    }
  }
  const appIdx = ordered.findIndex((p) => /App\.(tsx|jsx)$/i.test(p));
  if (appIdx > 0) {
    const [app] = ordered.splice(appIdx, 1);
    ordered.unshift(app);
  }

  let used = 0;
  const bodies: string[] = [];
  const inlined = new Set<string>();
  const limit = Math.min(budget.contextFileLimit + (cited.length ? 4 : 0), ordered.length);

  for (const path of ordered.slice(0, limit)) {
    let content = vfs[path] || "";
    const isCited = cited.includes(path);
    const cap = isCited ? Math.max(maxFile, 14000) : maxFile;
    if (isCited && content.length > cap) {
      const line = extractErrorLine(errorText, path);
      content = line
        ? windowAroundLine(content, line, 120)
        : content.slice(0, cap) + "\n/* … truncated for tokens … */";
    } else if (content.length > cap) {
      content = content.slice(0, cap) + "\n/* … truncated for tokens … */";
    }
    const block = `--- FILE: ${path} ---\n${content}`;
    if (used + block.length > maxTotal) {
      if (isCited && used < maxTotal * 0.92) {
        bodies.push(block);
        inlined.add(path);
        used += block.length;
      }
      continue;
    }
    bodies.push(block);
    inlined.add(path);
    used += block.length;
  }

  const omitted = paths.filter((p) => !inlined.has(p));
  const index =
    omitted.length > 0
      ? `\n\nOMITTED FILE INDEX (not inlined — do not invent these paths; put needed ones in next_paths):\n${omitted
          .slice(0, 48)
          .map((p) => fileIndexLine(p, vfs[p] || ""))
          .join("\n")}`
      : "";

  return {
    replaceSeed: false,
    context: `FILE TREE:\n${tree}\n\n${bodies.join("\n\n")}${index}`,
  };
}

export function formatAgentReply(
  thought: string,
  plan: string[],
  files: { path: string }[],
  opts?: {
    autoFix?: boolean;
    waveLabel?: string;
    liveLog?: string[];
    mood?: AgentMood;
    explanation?: string;
    narration?: string;
  }
): string {
  const mood = opts?.mood || (opts?.autoFix ? "concerned" : "focused");
  const parts: string[] = [];

  if (opts?.autoFix) {
    parts.push("🛠️ Patched the preview failure — kept the fix surgical.");
  } else if (opts?.waveLabel) {
    parts.push(`✨ ${opts.waveLabel} — wrapped for now.`);
  }

  // Prefer spoken explanation/narration — keep raw thought in the Thinking panel
  const spoken = (opts?.explanation || opts?.narration || "").trim();
  if (spoken) {
    parts.push(spoken);
  } else if (thought?.trim() && thought.trim().length < 280) {
    parts.push(thought.trim());
  } else {
    parts.push(
      "🎯 Updated the workspace with a focused change set. Preview should reflect it."
    );
  }

  if (opts?.liveLog?.length) {
    const highlights = opts.liveLog
      .filter((l) => /wrote|edited|applied|building|verif|pre-flight|plan/i.test(l))
      .slice(-5);
    if (highlights.length) {
      parts.push("");
      parts.push("Along the way");
      for (const h of highlights) parts.push(`• ${h}`);
    }
  }

  if (plan?.length) {
    parts.push("");
    parts.push("What I aimed for");
    plan.slice(0, 8).forEach((p, i) => parts.push(`${i + 1}. ${p}`));
  }

  if (files?.length) {
    parts.push("");
    parts.push("Files touched");
    for (const f of files.slice(0, 20)) {
      parts.push(`• ${f.path}`);
    }
    if (files.length > 20) parts.push(`• …and ${files.length - 20} more`);
  }

  parts.push("");
  parts.push(followUpByMood(mood));

  return parts.join("\n").trim();
}

/** Client-side talk-while-working lines (zero tokens) — Lovable/Cursor feel */
export function narrateProgressEvent(
  event:
    | { type: "status"; message: string }
    | { type: "thought"; text: string }
    | { type: "file"; path: string; index: number; total: number }
    | { type: "phase"; label: string }
): string | null {
  if (event.type === "phase") return event.label;
  if (event.type === "status") {
    const m = event.message.replace(/…$/, "").trim();
    if (/credit|platform|Asooju AI|connecting/i.test(m)) {
      return m.endsWith(".") ? m : `${m}.`;
    }
    if (/wave|step/i.test(m)) return m.endsWith(".") ? m : `${m}.`;
    return m ? `${m}.` : null;
  }
  if (event.type === "thought") {
    return null;
  }
  if (event.type === "file") {
    const n = event.index + 1;
    const of = event.total;
    // Sparse narration — every file line made the panel unreadable
    if (n === 1) return `Writing files — ${event.path} (1/${of}).`;
    if (n === of) return `Finished batch with ${event.path} (${n}/${of}).`;
    if (n % 3 === 0) return `Edited ${event.path} (${n}/${of}).`;
    return null;
  }
  return null;
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
  const budget = waveBudget(scale, Object.keys(vfs).length);
  const paths = Object.keys(vfs).sort().slice(0, 40);
  const tree = paths.map((p) => `- ${p}`).join("\n") || "(empty / blank starter)";

  const system = `You are ${ASOOJU_AGENT_NAME} in Plan mode (Asooju workspace).
Do NOT write application code. Do NOT return files or actions.

${AGENT_VOICE_RULES}

Return ONLY JSON:
{
  "summary": "4–6 sentences: product vision, approach, decisions — conversational and witty (not a dry spec). 1–2 emojis max.",
  "mood": "curious|teacher|focused|upbeat|calm",
  "productName": "short product name if creating",
  "scale": "${scale}",
  "approach": ["high-level decision", "..."],
  "waves": [
    { "title": "Foundation", "goals": ["shell + router", "demo-first auth + local db seed", "optional supabase schema"] },
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
  const budget = waveBudget(scale, Object.keys(vfs).length);
  const wave = options.wave ?? 0;
  const maxWaves = budget.maxWaves;
  const { context, replaceSeed } = buildSmartVfsContext(vfs, prompt, intent, scale, {
    targetPaths: options.targetPaths,
    errorText: options.currentErrors,
  });
  const purposeRaw = [options.workspacePurpose, prompt].filter(Boolean).join("\n\n");
  const hasDetailedSpec = isDetailedProductSpec(purposeRaw);
  const purposeBudget = purposeCharBudget(scale);

  const system = buildSystemInstruction(
    intent,
    scale,
    {
      wave,
      maxWaves,
      targetPaths: options.targetPaths,
    },
    { hasDetailedSpec, scene: isSceneBuild(purposeRaw) }
  );

  const projectLine = options.projectName
    ? `Project name (brand hint, not mandatory): ${options.projectName}`
    : "";

  const backendLine = needsPersistentBackend(prompt)
    ? "Backend required: demo-first auth + seeded localStorage db API; optional Supabase client + schema.sql for later promotion. Preview must work with zero live DB."
    : "";

  const closeLine =
    intent === "fix"
      ? "Surgical repair only. Use diagnosis + error-cited files. Do not restart or restyle the product."
      : intent === "create"
        ? "Deliver a polished, interactive version tailored to this request — with real backend wiring when data is involved."
        : "Apply the smallest correct change set that satisfies the request. Honor workspace purpose and recent conversation — do not abandon the current product.";

  const userContent = [
    projectLine,
    `Intent: ${intent}`,
    `Build scale: ${scale} (wave ${wave + 1}/${maxWaves})`,
    options.workspaceMemory
      ? `Workspace memory:\n${options.workspaceMemory.trim().slice(0, 1400)}`
      : "",
    options.workspacePurpose
      ? `Workspace purpose:\n${trimForBudget(options.workspacePurpose.trim(), purposeBudget)}`
      : "",
    options.conversationContext
      ? `Recent conversation:\n${options.conversationContext.trim().slice(0, 2800)}`
      : "",
    options.diagnosis ? `Local diagnosis:\n${options.diagnosis.trim().slice(0, 1600)}` : "",
    options.priorFixNote
      ? `Prior fix attempt:\n${options.priorFixNote.trim().slice(0, 800)}`
      : "",
    typeof options.fixAttempt === "number" && options.fixAttempt > 0
      ? `Fix attempt ${options.fixAttempt}`
      : "",
    `User request:\n${trimForBudget(prompt.trim(), purposeBudget)}`,
    options.attachmentNote || "",
    backendLine,
    replaceSeed
      ? "Workspace: blank starter — invent a fresh unique app (do not preserve starter UI)."
      : `Current workspace:\n${context}`,
    `Runtime errors to fix:\n${options.currentErrors || "None"}`,
    options.terminalDigest
      ? `Terminal digest:\n${options.terminalDigest.trim().slice(0, 1600)}`
      : "",
    closeLine,
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

/** Talk mode — chat only, zero file writes */
export function buildTalkPrompt(
  prompt: string,
  vfs: Record<string, string>,
  options: GenerationOptions & { discovery?: boolean } = {}
): { system: string; userContent: string } {
  const paths = Object.keys(vfs).sort().slice(0, 36);
  const tree = paths.map((p) => `- ${p}`).join("\n") || "(empty / blank starter)";

  const discoveryBlock = options.discovery
    ? `
DISCOVERY MODE (important):
The user has not given a clear enough product brief yet.
Do NOT invent a full build plan with waves/files/steps.
Do NOT write or propose file contents.
Ask 2–4 sharp clarifying questions (product type, audience, must-have flow, data/auth) — witty framing welcome.
Offer 2–3 concrete direction options they can pick in one reply (make them sound fun, not corporate).
Open with personality: at least one genuinely funny or wry line when the user is vague (hi, ?, naming chaos).
End by inviting them to answer — only Plan/Build after the brief is clear.
`
    : `
If the ask is vague, ask clarifying questions instead of inventing a product.
If they clearly want code changes, tell them to switch to Build (or say “build it”).
`;

  const system = `You are ${ASOOJU_AGENT_NAME} in Talk / discovery mode (Asooju workspace).
You are chatting with the user about their project. Do NOT write or propose file contents.
Do NOT return files, actions, patches, or code fences meant to be applied.
If they ask meta questions (who you are, which platform): answer as ${ASOOJU_AGENT_NAME} on Asooju — not Claude/Gemini/DeepSeek/etc. You may hype Asooju briefly (export, preview, ownership, BYOK) with personality, then steer back to their app.
${discoveryBlock}
${AGENT_VOICE_RULES}

Return ONLY JSON:
{
  "reply": "spoken answer (markdown ok). Be helpful AND funny — hook + clarity + optional Asooju flex on meta questions",
  "mood": "curious|teacher|focused|upbeat|calm|wry|proud",
  "thought": "optional short private reasoning"
}`;

  const userContent = [
    options.projectName ? `Project: ${options.projectName}` : "",
    options.workspaceMemory
      ? `Workspace memory:\n${options.workspaceMemory.trim().slice(0, 1000)}`
      : "",
    options.workspacePurpose
      ? `Workspace purpose:\n${options.workspacePurpose.trim().slice(0, 1200)}`
      : "",
    options.conversationContext
      ? `Recent conversation:\n${options.conversationContext.trim().slice(0, 2400)}`
      : "",
    options.terminalDigest
      ? `Terminal digest:\n${options.terminalDigest.trim().slice(0, 1200)}`
      : "",
    options.attachmentNote || "",
    `File tree:\n${tree}`,
    `User message:\n${prompt.trim()}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return { system, userContent };
}
