export type ChatAttachment = {
  id: string;
  name: string;
  mime: string;
  size: number;
  kind: "image" | "text" | "file" | "paste";
  /** data URL for images; empty for text-only */
  dataUrl?: string;
  /** Truncated text for code/docs/pastes */
  text?: string;
  /** Paste chip metadata (Claude / AI Studio style) */
  pasteIndex?: number;
  lineCount?: number;
};

const MAX_ATTACHMENTS = 6;
export { MAX_ATTACHMENTS };
const MAX_IMAGE_BYTES = 1_800_000;
const MAX_TEXT_CHARS = 12_000;
/** Collapse pastes at/above this size (Claude-like thresholds) */
export const PASTE_COLLAPSE_CHARS = 320;
export const PASTE_COLLAPSE_LINES = 3;

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = () => reject(new Error(`Could not read ${file.name}`));
    r.readAsDataURL(file);
  });
}

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = () => reject(new Error(`Could not read ${file.name}`));
    r.readAsText(file);
  });
}

/** Downscale large images client-side to keep tokens + upload size sane. */
async function compressImage(file: File, maxEdge = 1280, quality = 0.72): Promise<ChatAttachment> {
  const dataUrl = await readAsDataURL(file);
  if (!dataUrl.startsWith("data:image/")) {
    return {
      id: uid(),
      name: file.name,
      mime: file.type || "application/octet-stream",
      size: file.size,
      kind: "file",
      dataUrl,
    };
  }

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Image decode failed"));
      el.src = dataUrl;
    });
    const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas");
    ctx.drawImage(img, 0, 0, w, h);
    const out = canvas.toDataURL("image/jpeg", quality);
    const approx = Math.ceil((out.length * 3) / 4);
    return {
      id: uid(),
      name: file.name.replace(/\.\w+$/, "") + ".jpg",
      mime: "image/jpeg",
      size: approx,
      kind: "image",
      dataUrl: out,
    };
  } catch {
    if (file.size > MAX_IMAGE_BYTES) {
      throw new Error(`${file.name} is too large. Use an image under ~1.5MB.`);
    }
    return {
      id: uid(),
      name: file.name,
      mime: file.type || "image/png",
      size: file.size,
      kind: "image",
      dataUrl,
    };
  }
}

const TEXT_MIME =
  /^(text\/|application\/(json|javascript|typescript|xml|x-.*script))|\/(svg\+xml)$/i;
const TEXT_EXT = /\.(tsx?|jsx?|css|html?|md|txt|json|svg|yml|yaml|toml|env|csv)$/i;

export async function fileToAttachment(file: File): Promise<ChatAttachment> {
  const mime = file.type || "application/octet-stream";
  if (mime.startsWith("image/")) {
    return compressImage(file);
  }
  if (TEXT_MIME.test(mime) || TEXT_EXT.test(file.name)) {
    const raw = await readAsText(file);
    const text =
      raw.length > MAX_TEXT_CHARS
        ? raw.slice(0, MAX_TEXT_CHARS) + "\n/* … truncated for tokens … */"
        : raw;
    return {
      id: uid(),
      name: file.name,
      mime: mime || "text/plain",
      size: file.size,
      kind: "text",
      text,
    };
  }
  throw new Error(`Unsupported file type: ${file.name}. Attach images or text/code files.`);
}

export async function filesToAttachments(
  files: FileList | File[],
  existingCount = 0
): Promise<ChatAttachment[]> {
  const list = Array.from(files);
  const room = Math.max(0, MAX_ATTACHMENTS - existingCount);
  if (!room) throw new Error(`Max ${MAX_ATTACHMENTS} attachments per message.`);
  const slice = list.slice(0, room);
  const out: ChatAttachment[] = [];
  for (const f of slice) {
    out.push(await fileToAttachment(f));
  }
  return out;
}

export function attachmentPromptBlock(attachments: ChatAttachment[]): string {
  if (!attachments.length) return "";
  const lines: string[] = ["User attachments (use as design/spec reference):"];
  for (const a of attachments) {
    if (a.kind === "image") {
      lines.push(`- Image: ${a.name} (${a.mime}) — see attached image in this request.`);
    } else if ((a.kind === "text" || a.kind === "paste") && a.text) {
      const label = a.kind === "paste" ? `Pasted text #${a.pasteIndex || 1}` : a.name;
      lines.push(`- ${label}\n\`\`\`\n${a.text}\n\`\`\``);
    } else {
      lines.push(`- File: ${a.name} (${a.mime})`);
    }
  }
  return lines.join("\n");
}

/** Claude / AI Studio: long or multiline clipboard → chip, not raw composer dump */
export function shouldCollapsePaste(text: string): boolean {
  const t = text.replace(/\r\n/g, "\n");
  if (!t.trim()) return false;
  const lines = t.split("\n").length;
  return lines >= PASTE_COLLAPSE_LINES || t.length >= PASTE_COLLAPSE_CHARS;
}

export function textToPasteAttachment(
  text: string,
  pasteIndex: number
): ChatAttachment {
  const normalized = text.replace(/\r\n/g, "\n");
  const lineCount = normalized.split("\n").length;
  const body =
    normalized.length > MAX_TEXT_CHARS
      ? normalized.slice(0, MAX_TEXT_CHARS) + "\n/* … truncated for tokens … */"
      : normalized;
  return {
    id: uid(),
    name: `Pasted text #${pasteIndex}`,
    mime: "text/plain",
    size: body.length,
    kind: "paste",
    text: body,
    pasteIndex,
    lineCount,
  };
}

export function dataUrlToInline(dataUrl: string): { mimeType: string; data: string } | null {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  return { mimeType: m[1], data: m[2] };
}
