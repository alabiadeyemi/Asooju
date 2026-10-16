const STARTER_PROMPT =
  /blank canvas|blank shipkernel starter|invent a unique app from the user's first prompt|describe what to build/i;

type ChatLike = { role?: string; content?: string; meta?: { autoFix?: boolean } };

/** Card subtitle. The stored prompt is often the Blank Start template label, not the app. */
export function projectSummary(project: {
  prompt?: string | null;
  chat_messages?: unknown;
}): string {
  const chat = Array.isArray(project.chat_messages) ? project.chat_messages : [];
  for (const raw of chat) {
    if (!raw || typeof raw !== "object") continue;
    const message = raw as ChatLike;
    if (message.role !== "user" || message.meta?.autoFix) continue;
    const text = (message.content || "").replace(/\s+/g, " ").trim();
    if (text.length < 8 || STARTER_PROMPT.test(text)) continue;
    return text;
  }
  const prompt = (project.prompt || "").replace(/\s+/g, " ").trim();
  if (prompt && !STARTER_PROMPT.test(prompt)) return prompt;
  return "Saved workspace";
}
