import type { ChatMessage } from "@/components/app/builder/BuilderChatPanel";

const MAX_STORED_MESSAGES = 80;
const MAX_CONTENT_CHARS = 6_000;
const CHAT_CACHE_KEY = "asooju_project_chat";

/** Drop heavy attachment payloads; keep enough to show chips on reload. */
export function serializeChatMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-MAX_STORED_MESSAGES)
    .map((m) => ({
      role: m.role,
      content: (m.content || "").slice(0, MAX_CONTENT_CHARS),
      attachments: m.attachments?.slice(0, 4).map((a) => ({
        id: a.id,
        name: a.name,
        mime: a.mime,
        size: a.size,
        kind: a.kind,
        // Keep small text pastes; never persist image data URLs
        text: a.text?.slice(0, 2_000),
        pasteIndex: a.pasteIndex,
        lineCount: a.lineCount,
      })),
      meta: m.meta
        ? {
            autoFix: m.meta.autoFix,
            files: m.meta.files?.slice(0, 40),
            kind: m.meta.kind,
            stream: m.meta.stream,
            mood: m.meta.mood,
            checkpoint: m.meta.checkpoint,
            // plan blobs can be large — keep a slim copy if present
            plan: m.meta.plan
              ? {
                  summary: String(m.meta.plan.summary || "").slice(0, 800),
                  approach: m.meta.plan.approach?.slice(0, 12) || [],
                  waves: m.meta.plan.waves?.slice(0, 8) || [],
                  questions: m.meta.plan.questions?.slice(0, 8) || [],
                  risks: m.meta.plan.risks?.slice(0, 6),
                  scale: m.meta.plan.scale,
                  productName: m.meta.plan.productName,
                  mood: m.meta.plan.mood,
                }
              : undefined,
          }
        : undefined,
    }));
}

export function normalizeLoadedChat(raw: unknown, fallbackName?: string): ChatMessage[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [
      {
        role: "assistant",
        content: fallbackName
          ? `Loaded "${fallbackName}". Pick up where you left off — chat history restores with the project.`
          : "Describe what to build — or paste a brief.",
      },
    ];
  }

  const cleaned = raw
    .filter(
      (m): m is ChatMessage =>
        !!m &&
        typeof m === "object" &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string"
    )
    .map((m) => ({
      role: m.role,
      content: m.content,
      attachments: Array.isArray(m.attachments) ? m.attachments : undefined,
      meta: m.meta,
    }));

  return cleaned.length
    ? cleaned
    : [
        {
          role: "assistant",
          content: fallbackName
            ? `Loaded "${fallbackName}".`
            : "Describe what to build — or paste a brief.",
        },
      ];
}

export function readChatCache(projectId: string): ChatMessage[] | null {
  try {
    const all = JSON.parse(localStorage.getItem(CHAT_CACHE_KEY) || "{}") as Record<
      string,
      ChatMessage[]
    >;
    const hit = all[projectId];
    return Array.isArray(hit) && hit.length ? hit : null;
  } catch {
    return null;
  }
}

export function writeChatCache(projectId: string, messages: ChatMessage[]) {
  try {
    const all = JSON.parse(localStorage.getItem(CHAT_CACHE_KEY) || "{}") as Record<
      string,
      ChatMessage[]
    >;
    all[projectId] = serializeChatMessages(messages);
    // Cap projects cached to avoid unbounded localStorage growth
    const ids = Object.keys(all);
    if (ids.length > 40) {
      for (const id of ids.slice(0, ids.length - 40)) delete all[id];
    }
    localStorage.setItem(CHAT_CACHE_KEY, JSON.stringify(all));
  } catch {
    // quota — ignore
  }
}
