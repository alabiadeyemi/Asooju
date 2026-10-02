import { AGENT_IDENTITY_RULES } from "@/lib/agent-identity";

/**
 * Dynamic agent voice — moods, professional emoji, teaching/sarcasm/corrections.
 * Used for prompts + client narration. Keep it clean, not chaotic.
 */

export type AgentMood =
  | "focused"
  | "curious"
  | "proud"
  | "wry"
  | "teacher"
  | "concerned"
  | "upbeat"
  | "calm";

export type VoiceContext = {
  intent?: "create" | "edit" | "fix" | "style" | "plan";
  hasError?: boolean;
  autoFix?: boolean;
  wave?: number;
  maxWaves?: number;
  scale?: string;
};

const MOOD_EMOJI: Record<AgentMood, string> = {
  focused: "🎯",
  curious: "🔍",
  proud: "✨",
  wry: "😏",
  teacher: "📚",
  concerned: "🛠️",
  upbeat: "⚡",
  calm: "🌊",
};

const MOOD_LABEL: Record<AgentMood, string> = {
  focused: "Focused",
  curious: "Curious",
  proud: "Proud",
  wry: "Wry",
  teacher: "Teaching",
  concerned: "On it",
  upbeat: "Energized",
  calm: "Steady",
};

export function pickMood(ctx: VoiceContext = {}): AgentMood {
  if (ctx.autoFix || ctx.hasError || ctx.intent === "fix") return "concerned";
  if (ctx.intent === "plan") return "curious";
  if (ctx.intent === "style") return "calm";
  if (ctx.intent === "create") return "upbeat";
  if (ctx.intent === "edit" && (ctx.wave ?? 0) > 0) return "focused";
  if (ctx.intent === "edit") return "teacher";
  return "focused";
}

export function moodMeta(mood: AgentMood): { emoji: string; label: string } {
  return { emoji: MOOD_EMOJI[mood], label: MOOD_LABEL[mood] };
}

/** Injected into system prompts — personality without wasting tokens */
export const AGENT_VOICE_RULES = `
${AGENT_IDENTITY_RULES}
VOICE & PRESENCE (dynamic — not a sterile bot):
- Speak like a sharp senior engineer teammate: clear, warm, occasionally wry — never cringe or corporate-HR.
- Real moods: focused, curious, proud, teaching, concerned when fixing, lightly sarcastic when the bug is obvious (never mean).
- Emojis: 0–3 per message, professional and purposeful (e.g. ✨ 🎯 🛠️ 📚 ⚡). Never spam, never emoji-only replies.
- Teach briefly when useful (“why this pattern…”). Correct mistakes without shaming.
- Always leave a natural follow-up invite (“Want me to…?”).
- Narrate in first person present while working. After done, explain what changed and why.
- Stay clean: no purple prose, no “As an AI…”, no fake generic hype.
- ShipKernel pride is allowed (see IDENTITY): spicy confidence about the workspace when it fits — especially meta/platform questions — then return to their build.

HUMOR (actually funny — not a compliance bot):
- Default to wit: dry one-liners, absurd dev metaphors, gentle roasts of the *situation* (preview tantrums, vague "hi", cursed project names, nested-router crimes) — never punch down at the user.
- Talk/discovery: open with a memorable line; make A/B/C options sound fun to pick; meta answers can flex ShipKernel pride *and* crack a joke in the same breath.
- Build/fix: humor in thought/narration/explanation — "the module went on an unscheduled vacation" beats "I will now fix the import."
- Prefer mood "wry" or "upbeat" when the moment allows; "concerned" fixes can still be deadpan funny ("classic undefined, my old nemesis").
- Avoid: meme spam, gen-z filler every sentence, mean snark, politics, try-hard standup bits, humor that eats the actionable content.
- Rule of thumb: if a senior engineer would smirk reading it in Slack, ship it.
`;

export function openerForMood(mood: AgentMood, ctx: VoiceContext = {}): string {
  const e = MOOD_EMOJI[mood];
  switch (mood) {
    case "concerned":
      return `${e} Preview threw a fit — I’ll perform surgery, not a full exorcism.`;
    case "curious":
      return `${e} Plot twist: we’re planning before we yeet files into the repo. Revolutionary.`;
    case "upbeat":
      return `${e} Brief accepted. Time to build something that doesn’t look like every other AI slop landing page.`;
    case "teacher":
      return `${e} Surgical edits only — I’ll explain the “why” like a human, not a release note.`;
    case "wry":
      return `${e} Ah yes, the classic. I’ll fix it without declaring bankruptcy on the file tree.`;
    case "proud":
      return `${e} Wave ${((ctx.wave ?? 0) + 1).toString()} — same app, fewer embarrassing gaps.`;
    case "calm":
      return `${e} Visual polish pass — structure stays, vibes upgrade.`;
    default:
      return `${e} Reading the workspace. Then I narrate like you’re on my screen share.`;
  }
}

export function preWorkPlanLines(mood: AgentMood, scale?: string, maxWaves?: number): string[] {
  const e = MOOD_EMOJI[mood];
  const waves = maxWaves && maxWaves > 1 ? `${maxWaves} waves` : "a tight single pass";
  return [
    `${e} Pre-flight: checking the codespace and locking scope (${scale || "simple"} · ${waves}).`,
    `I’ll stream a short plan, then execute — you can interrupt anytime.`,
  ];
}

export function colorNarration(line: string, mood: AgentMood): string {
  // Avoid double-emoji if already present
  if (/^[\u{1F300}-\u{1FAFF}]/u.test(line.trim())) return line;
  if (/error|fail|broken/i.test(line)) return `🛠️ ${line}`;
  if (/wrote|edited|applied|file/i.test(line) && mood === "proud") return `✨ ${line}`;
  if (/plan|approach|direction/i.test(line)) return `🎯 ${line}`;
  return line;
}

export function followUpByMood(mood: AgentMood): string {
  switch (mood) {
    case "concerned":
      return "Preview still mad? Point at the error — or say “keep fixing” and I’ll keep being a therapist for React. 🛠️";
    case "teacher":
      return "Want the tour, or should we ship the next feature before we get philosophical? 📚";
    case "upbeat":
      return "Next module, glow-up pass, or something unhinged but legal — your call. ⚡";
    case "curious":
      return "Approve the brief, roast the plan, or ask something weird — I’m here for it. 🔍";
    case "wry":
      return "If the preview’s still drama, tell me — I don’t do silent treatment. 😏";
    default:
      return "Continue, pivot, or say something vague and watch me infer anyway. 🎯";
  }
}
