import { classifyBuildScale, waveBudget, type BuildScale } from "@/lib/complexity";
import { classifyIntent, type GenIntent } from "@/lib/generation-prompt";

/** Lovable-style Plan vs Build */
export type AgentChatMode = "plan" | "build";

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
  };
}

/** Enter Plan first only in Plan mode. Build mode is fully autonomous (Lovable Build). */
export function shouldPlanFirst(
  mode: AgentChatMode,
  prompt: string,
  vfs: Record<string, string>,
  source: "user" | "autofix"
): { planFirst: boolean; intent: GenIntent; scale: BuildScale } {
  const intent = classifyIntent(prompt, vfs, false);
  const scale = classifyBuildScale(prompt, Object.keys(vfs).length);
  if (source === "autofix") return { planFirst: false, intent, scale };
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
  const { planFirst, scale } = shouldPlanFirst(mode, prompt, vfs, source);
  const maxWaves = waveBudget(scale).maxWaves;
  return {
    ...emptyProcedure(mode),
    originalPrompt: prompt,
    scale,
    maxWaves,
    phase: planFirst ? "planning" : "building",
    wave: 0,
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

export function isContinueIntent(text: string): boolean {
  return CONTINUE_RE.test(text.trim());
}

export function isPauseIntent(text: string): boolean {
  return PAUSE_RE.test(text.trim());
}

export function formatPlanChatIntro(plan: BuildPlan): string {
  const name = plan.productName ? `${plan.productName} — ` : "";
  return [
    `${name}${plan.summary}`,
    "",
    "I won’t touch code until you approve. Review the steps below — answer any questions, then Approve & build, or reply with changes.",
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
