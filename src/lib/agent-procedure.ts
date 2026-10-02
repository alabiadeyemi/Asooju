import { classifyBuildScale, waveBudget, type BuildScale } from "@/lib/complexity";
import { classifyIntent, type GenIntent } from "@/lib/generation-prompt";
import { isDetailedProductSpec } from "@/lib/product-spec";
import { isSeedWorkspace } from "@/lib/vfs";

export { isDetailedProductSpec } from "@/lib/product-spec";

/** Lovable-style Talk vs Plan vs Build */
export type AgentChatMode = "talk" | "plan" | "build";

export type ClarifyingQuestion = {
  id: string;
  prompt: string;
  options: string[];
};

export type PlanWave = {
  title: string;
  goals: string[];
};

export type BuildPlan = {
  summary: string;
  productName?: string;
  approach: string[];
  waves: PlanWave[];
  questions: ClarifyingQuestion[];
  risks?: string[];
  scale: BuildScale;
  mood?: string;
};

export type ProcedurePhase =
  | "idle"
  | "planning"
  | "awaiting_plan"
  | "building"
  | "awaiting_continue";

export type ProcedureSession = {
  phase: ProcedurePhase;
  mode: AgentChatMode;
  originalPrompt: string;
  plan: BuildPlan | null;
  answers: Record<string, string>;
  wave: number;
  maxWaves: number;
  nextPaths: string[];
  scale: BuildScale;
  lastFiles: string[];
  /** Compact running notes (waves, fixes) — fed back as memory, not raw chat */
  notes: string[];
  /** Seed / new workspace: no file writes until user approves the brief */
  briefApproved: boolean;
  /** Locked mission text after brief approval (or plan) */
  approvedBrief: string;
};

export function emptyProcedure(mode: AgentChatMode = "build"): ProcedureSession {
  return {
    phase: "idle",
    mode,
    originalPrompt: "",
    plan: null,
    answers: {},
    wave: 0,
    maxWaves: 1,
    nextPaths: [],
    scale: "simple",
    lastFiles: [],
    notes: [],
    briefApproved: false,
    approvedBrief: "",
  };
}

/** Enter Plan first only in Plan mode. Build mode is fully autonomous (Lovable Build). Talk never plans/builds here. */
export function shouldPlanFirst(
  mode: AgentChatMode,
  prompt: string,
  vfs: Record<string, string>,
  source: "user" | "autofix"
): { planFirst: boolean; intent: GenIntent; scale: BuildScale } {
  const intent = classifyIntent(prompt, vfs, false);
  const scale = classifyBuildScale(prompt, Object.keys(vfs).length);
  if (source === "autofix") return { planFirst: false, intent, scale };
  if (mode === "talk") return { planFirst: false, intent, scale };
  if (mode === "plan") return { planFirst: true, intent, scale };
  // Build = execute end-to-end; waves auto-continue (token-efficient vs re-planning)
  return { planFirst: false, intent, scale };
}

export function initSessionFromPrompt(
  prompt: string,
  vfs: Record<string, string>,
  mode: AgentChatMode,
  source: "user" | "autofix"
): ProcedureSession {
  if (mode === "talk") {
    return {
      ...emptyProcedure("talk"),
      originalPrompt: prompt,
      phase: "idle",
      scale: classifyBuildScale(prompt, Object.keys(vfs).length),
      maxWaves: 1,
      wave: 0,
    };
  }
  const { planFirst, scale } = shouldPlanFirst(mode, prompt, vfs, source);
  const maxWaves = waveBudget(scale).maxWaves;
  const seed = isSeedWorkspace(vfs);
  return {
    ...emptyProcedure(mode),
    originalPrompt: prompt,
    scale,
    maxWaves,
    phase: planFirst ? "planning" : "building",
    wave: 0,
    briefApproved: !seed || source === "autofix",
    approvedBrief: seed ? "" : prompt,
  };
}

export function parsePlanJson(data: unknown, fallbackScale: BuildScale): BuildPlan {
  const d = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  const wavesRaw = Array.isArray(d.waves) ? d.waves : [];
  const questionsRaw = Array.isArray(d.questions) ? d.questions : [];
  const approach = Array.isArray(d.approach)
    ? d.approach.map(String)
    : Array.isArray(d.plan)
      ? d.plan.map(String)
      : [];

  const waves: PlanWave[] =
    wavesRaw.length > 0
      ? wavesRaw.slice(0, 6).map((w: any, i: number) => ({
          title: String(w?.title || `Step ${i + 1}`),
          goals: Array.isArray(w?.goals) ? w.goals.map(String).slice(0, 6) : [String(w || "")],
        }))
      : approach.slice(0, 4).map((g, i) => ({
          title: `Step ${i + 1}`,
          goals: [g],
        }));

  const questions: ClarifyingQuestion[] = questionsRaw.slice(0, 4).map((q: any, i: number) => ({
    id: String(q?.id || `q${i + 1}`),
    prompt: String(q?.prompt || q?.question || "Preference?"),
    options: Array.isArray(q?.options)
      ? q.options.map(String).slice(0, 4)
      : ["Yes", "No", "You decide"],
  }));

  const scale =
    d.scale === "enterprise" || d.scale === "standard" || d.scale === "simple"
      ? d.scale
      : fallbackScale;

  return {
    summary: String(d.summary || d.thought || "Here’s a structured build plan."),
    productName: d.productName ? String(d.productName) : undefined,
    approach: approach.length ? approach : waves.flatMap((w) => w.goals).slice(0, 8),
    waves,
    questions,
    risks: Array.isArray(d.risks) ? d.risks.map(String).slice(0, 4) : undefined,
    scale,
    mood: typeof d.mood === "string" ? d.mood : undefined,
  };
}

export function planToApprovedBrief(plan: BuildPlan, answers: Record<string, string>): string {
  const lines = [
    plan.productName ? `Product: ${plan.productName}` : "",
    `Summary: ${plan.summary}`,
    "Approach:",
    ...plan.approach.map((a, i) => `${i + 1}. ${a}`),
    "Waves:",
    ...plan.waves.map(
      (w, i) => `Wave ${i + 1} — ${w.title}: ${w.goals.join("; ")}`
    ),
  ].filter(Boolean);

  const answered = Object.entries(answers);
  if (answered.length) {
    lines.push("User decisions:");
    for (const [id, val] of answered) {
      const q = plan.questions.find((x) => x.id === id);
      lines.push(`- ${q?.prompt || id}: ${val}`);
    }
  }
  return lines.join("\n");
}

const CONTINUE_RE =
  /^(yes|y|ok|okay|sure|continue|next|go|proceed|keep going|do it|build|approve|lgtm|ship it)\b/i;
const PAUSE_RE = /^(stop|pause|wait|hold|enough|done for now|that's enough)\b/i;
/** Pure social / acknowledgment — never starts a build or plan */
const CHITCHAT_RE =
  /^(hi|hello|hey|yo|sup|hiya|howdy|thanks|thank you|thx|ty|cheers|lol|haha|hehe|cool|nice|great|awesome|sweet|np|no problem|good morning|good afternoon|good evening|gm|gn|bye|cya|see ya|whats up|what's up)[\s!.?]*$/i;
/** Explicit resume / status after a mid-build — Build mode only */
const RESUME_RE =
  /^(what(\??)|why(\??)|huh|\?+|continue|keep going|fix( it)?|try again|resume|status|same|again)\.?$/i;

export function isContinueIntent(text: string): boolean {
  return CONTINUE_RE.test(text.trim());
}

export function isPauseIntent(text: string): boolean {
  return PAUSE_RE.test(text.trim());
}

export function isChitchat(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (t.length > 48) return false;
  return CHITCHAT_RE.test(t);
}

/** User wants to resume/inspect work — not a new product brief */
export function isResumeFollowUp(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (isChitchat(t)) return false;
  if (t.length <= 2 && /\?+/.test(t)) return true;
  return RESUME_RE.test(t);
}

export function localTalkReply(userText: string, opts?: { purpose?: string; mode?: AgentChatMode }): string {
  const purpose = opts?.purpose?.trim();
  const mode = opts?.mode || "talk";
  if (isChitchat(userText)) {
    if (purpose) {
      return [
        `Hey — we’re still on **${purpose.slice(0, 120)}${purpose.length > 120 ? "…" : ""}**.`,
        "",
        "Before I plan or write files, tell me what you want next:",
        "• keep polishing this product?",
        "• add a specific feature?",
        "• or start something new?",
        "",
        mode === "talk"
          ? "You’re in **Talk** — I’ll only chat until you switch to Plan/Build (or say “build it”)."
          : "I’ll stay in discovery until the brief is clear — then Plan/Build when you want code.",
      ].join("\n");
    }
    return [
      "Hey! Let’s figure out what we’re making before any plan or code.",
      "",
      "Quick ones:",
      "1. What kind of product? (SaaS, store, portfolio, internal tool…)",
      "2. Who’s it for?",
      "3. What’s the one must-have screen or action?",
      "",
      "Answer in plain language — I’ll only move to Plan/Build once that’s clear.",
    ].join("\n");
  }
  return "";
}

export function isExplicitBuildBypass(prompt: string): boolean {
  const t = prompt.trim();
  if (!t) return false;
  if (/^(skip discovery|build now|just build|go ahead|start building|approve(&| and)? build)\b/i.test(t)) {
    return true;
  }
  if (/\bbuild this\b/i.test(t) && t.length > 150) return true;
  return isDetailedProductSpec(t);
}

/** Whether codegen is allowed on this workspace (seed canvas needs explicit approval). */
export function requiresBriefApproval(
  vfs: Record<string, string>,
  briefApproved: boolean
): boolean {
  return isSeedWorkspace(vfs) && !briefApproved;
}

export type BriefReadiness = { ready: boolean; summary: string };

/** Heuristic: is there enough product context to approve a build brief? */
export function assessBriefReadiness(
  prompt: string,
  vfs: Record<string, string>,
  existingPurpose?: string
): BriefReadiness {
  const t = prompt.trim();
  const purpose = (existingPurpose || "").trim();
  const combined = [purpose, t].filter(Boolean).join("\n\n").trim();

  if (isExplicitBuildBypass(t)) {
    return { ready: true, summary: combined || t };
  }
  if (!isSeedWorkspace(vfs)) {
    return { ready: true, summary: combined };
  }

  let score = 0;
  if (combined.length >= 55) score += 1;
  if (combined.length >= 120) score += 1;
  if (/\b(for|audience|users?|customers?|team|client)\b/i.test(combined)) score += 1;
  if (/\b(must|need|should|feature|screen|page|flow|auth|checkout|dashboard|booking)\b/i.test(combined))
    score += 1;
  if (/\b(app|saas|store|shop|tool|platform|site|portal|marketplace|crm)\b/i.test(combined)) score += 1;

  const ready = score >= 4 || isDetailedProductSpec(combined);
  return { ready, summary: combined };
}

/** Underspecified asks — talk/discover first, don’t dump a plan or start building */
export function needsDiscoveryBrief(
  prompt: string,
  vfs: Record<string, string>,
  existingPurpose?: string,
  briefApproved = false
): boolean {
  const t = prompt.trim();
  if (briefApproved) return false;
  if (isExplicitBuildBypass(t)) return false;
  if (!t) return true;
  if (isChitchat(t)) return true;
  if (isResumeFollowUp(t) || isContinueIntent(t) || isPauseIntent(t)) return false;

  const purpose = (existingPurpose || "").trim();
  if (isSeedWorkspace(vfs)) {
    if (isDetailedProductSpec(t) || isDetailedProductSpec(purpose) || isDetailedProductSpec(`${purpose}\n\n${t}`)) {
      return false;
    }
    if (t.length >= 400) return false;
    return true;
  }

  if (
    purpose.length > 40 &&
    /\b(add|fix|change|update|remove|rename|style|dark|light|bug|error|page|auth|cart|checkout)\b/i.test(
      t
    ) &&
    t.length >= 24
  ) {
    return false;
  }

  if (t.length < 48) return true;
  if (
    /^(help|what can you do|i want (an? )?app|make (me )?something|build something|new project|let'?s (build|start)|start (a |an )?project)\b/i.test(
      t
    )
  ) {
    return true;
  }
  if (Object.keys(vfs).length <= 2 && t.length < 100) return true;
  return false;
}

/** Step 6c — only auto-continue waves when preview confirmed live. */
export function previewAllowsNextWave(settled: "live" | "error" | "timeout"): boolean {
  return settled === "live";
}

export function briefApprovalHint(agentMode: AgentChatMode): string {
  return agentMode === "build"
    ? "Build mode decides on its own — I’ll start when the brief is clear enough, or ask for one sharper detail if not."
    : "I’ll clarify the product first. When the brief is clear, use **Approve brief & build**.";
}

/** Build mode on seed canvas: auto-build vs one more detail (no manual approve required). */
export function resolveSeedBriefForBuild(
  prompt: string,
  vfs: Record<string, string>,
  existingPurpose: string,
  briefApproved: boolean
): { action: "build" | "need_detail"; merged: string; readiness: BriefReadiness } {
  if (!requiresBriefApproval(vfs, briefApproved)) {
    const merged = (existingPurpose || prompt).trim();
    return { action: "build", merged, readiness: { ready: true, summary: merged } };
  }
  const merged = existingPurpose
    ? `${existingPurpose}\n\n${prompt.trim()}`.trim()
    : prompt.trim();
  const readiness = assessBriefReadiness(prompt, vfs, merged);
  if (
    readiness.ready ||
    isExplicitBuildBypass(prompt) ||
    isDetailedProductSpec(merged) ||
    isDetailedProductSpec(prompt)
  ) {
    return { action: "build", merged, readiness: { ...readiness, ready: true } };
  }
  return { action: "need_detail", merged, readiness };
}

export function formatPlanChatIntro(plan: BuildPlan): string {
  const name = plan.productName ? `${plan.productName} — ` : "";
  return [
    `🔍 ${name}${plan.summary}`,
    "",
    "I won’t touch code until you approve. Review the steps below — answer any questions, then Approve & build, or reply with changes.",
    "",
    "Approve to build, tweak the plan in chat, or ask me anything before we commit. 🔍",
  ].join("\n");
}

export function formatWaveCompleteChat(
  wave: number,
  maxWaves: number,
  thought: string,
  files: string[],
  nextPaths: string[]
): string {
  const step = wave + 1;
  const more = step < maxWaves && (nextPaths.length > 0 || maxWaves > 1);
  const parts = [
    `Step ${step}/${maxWaves} is in the workspace.`,
    (thought || "Foundation and wiring updated.").trim(),
  ];
  if (files.length) {
    parts.push("");
    parts.push("Files");
    for (const f of files.slice(0, 14)) parts.push(`• ${f}`);
  }
  parts.push("");
  if (more) {
    parts.push(
      nextPaths.length
        ? `Next up I’d tackle: ${nextPaths.slice(0, 5).join(", ")}.`
        : "There’s more to ship in the next step."
    );
    parts.push("Continue to the next step, pause here, or tell me what to prioritize.");
  } else {
    parts.push("That completes this build plan. Tell me what to refine next — or try the preview.");
  }
  return parts.join("\n");
}
