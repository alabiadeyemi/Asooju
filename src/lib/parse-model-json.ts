/**
 * Parse / recover agent JSON responses (truncated streams, markdown fences).
 */
import { extractCompletedFilesFromPartialJson } from "@/lib/generation-prompt";

export type ParseModelJsonResult = {
  data: Record<string, unknown>;
  recovered: boolean;
  note?: string;
};

export function cleanModelJsonText(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  }
  return cleaned;
}

function parseBalancedObject(cleaned: string): Record<string, unknown> {
  const start = cleaned.indexOf("{");
  if (start === -1) throw new Error("Model did not return JSON.");
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
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
        return JSON.parse(cleaned.slice(start, i + 1)) as Record<string, unknown>;
      }
    }
  }
  throw new Error("Could not parse model JSON.");
}

function extractJsonStringField(buffer: string, key: string): string | undefined {
  const re = new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`);
  const m = buffer.match(re);
  if (!m) return undefined;
  try {
    return JSON.parse(`"${m[1]}"`);
  } catch {
    return m[1].replace(/\\n/g, "\n").replace(/\\"/g, '"');
  }
}

function extractStringArrayField(buffer: string, key: string): string[] | undefined {
  const re = new RegExp(`"${key}"\\s*:\\s*\\[([^\\]]*)\\]`);
  const m = buffer.match(re);
  if (!m) return undefined;
  const inner = m[1];
  const items: string[] = [];
  const strRe = /"((?:[^"\\]|\\.)*)"/g;
  let sm: RegExpExecArray | null;
  while ((sm = strRe.exec(inner))) {
    try {
      items.push(JSON.parse(`"${sm[1]}"`));
    } catch {
      items.push(sm[1]);
    }
  }
  return items.length ? items : undefined;
}

function recoverPartialModelJson(raw: string): ParseModelJsonResult {
  const files = extractCompletedFilesFromPartialJson(raw);
  if (!files.length) {
    throw new Error("Could not parse model JSON response.");
  }
  const cleaned = cleanModelJsonText(raw);
  const data: Record<string, unknown> = { files };
  const thought = extractJsonStringField(cleaned, "thought");
  if (thought) data.thought = thought;
  const narration = extractJsonStringField(cleaned, "narration");
  if (narration) data.narration = narration;
  const explanation = extractJsonStringField(cleaned, "explanation");
  if (explanation) data.explanation = explanation;
  const mood = extractJsonStringField(cleaned, "mood");
  if (mood) data.mood = mood;
  const nextPaths = extractStringArrayField(cleaned, "next_paths");
  if (nextPaths) data.next_paths = nextPaths;
  const plan = extractStringArrayField(cleaned, "plan");
  if (plan) data.plan = plan;

  return {
    data,
    recovered: true,
    note: `Recovered ${files.length} complete file object(s) from truncated JSON`,
  };
}

/** Full parse with balanced-object fallback and truncated `files[]` salvage. */
export function parseModelJson(text: string): ParseModelJsonResult {
  const cleaned = cleanModelJsonText(text);
  try {
    return { data: JSON.parse(cleaned) as Record<string, unknown>, recovered: false };
  } catch {
    try {
      return { data: parseBalancedObject(cleaned), recovered: false };
    } catch {
      return recoverPartialModelJson(text);
    }
  }
}

/** @deprecated name kept for API routes — prefer parseModelJson */
export function parseJsonLoose(text: string): Record<string, unknown> {
  return parseModelJson(text).data;
}
