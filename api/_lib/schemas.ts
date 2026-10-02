import { z } from "zod";

export const GenerateRequestSchema = z.object({
  prompt: z.string().trim().min(1).max(40_000),
  provider: z
    .enum(["openai", "gemini", "claude", "grok", "deepseek", "auto"])
    .optional(),
  projectName: z.string().max(120).optional(),
  currentErrors: z.string().max(30_000).optional(),
  attachmentNote: z.string().max(20_000).optional(),
  vfs: z
    .record(z.string().max(250_000))
    .refine((v) => Object.keys(v).length <= 250, "Too many files")
    .optional()
    .default({}),
  singleWave: z.boolean().optional(),
  wave: z.number().int().min(0).max(20).optional(),
  targetPaths: z.array(z.string().max(300)).max(100).optional(),
  apiKey: z.string().max(500).optional(),
  generationId: z.string().min(8).max(80).optional(),
});

export const GeminiPlatformRequestSchema = z.object({
  system: z.string().max(80_000).optional().default(""),
  userContent: z.string().trim().min(1).max(200_000),
  creative: z.boolean().optional(),
  model: z.string().max(80).optional(),
  generationId: z.string().min(8).max(80).optional(),
  inlineImages: z
    .array(
      z.object({
        mimeType: z.string().max(80),
        data: z.string().max(4_000_000),
      })
    )
    .max(8)
    .optional(),
});

export function zodErrorMessage(err: z.ZodError): string {
  const first = err.issues[0];
  if (!first) return "Invalid request";
  const path = first.path.length ? first.path.join(".") + ": " : "";
  return `${path}${first.message}`;
}
