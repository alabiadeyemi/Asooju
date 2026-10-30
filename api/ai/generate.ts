import {
  applyCors,
  BodyTooLargeError,
  handleOptions,
  newGenerationId,
  readJsonBody,
  sendJson,
  userFromBearer,
} from "../_lib/http";
import { runLlmJson, parseModelJson } from "../_lib/llm";
import { agentProgressMessage } from "../../src/lib/agent-identity";
import {
  buildUserContent,
  type GenerationOptions,
} from "../../src/lib/generation-prompt";
import { classifyBuildScale, waveBudget } from "../../src/lib/complexity";
import { spendPlatformCredit, refundPlatformCredit } from "../_lib/credits";
import {
  assertGenerationRateLimit,
  beginGeneration,
  endGeneration,
  RateLimitError,
} from "../_lib/rate-limit";
import { GenerateRequestSchema, zodErrorMessage } from "../_lib/schemas";
import {
  platformAiNotConfiguredMessage,
  resolvePlatformAi,
} from "../_lib/platform-ai";

function normalizeFiles(data: any): { path: string; content: string }[] {
  const files: { path: string; content: string }[] = Array.isArray(data?.files)
    ? data.files
        .filter((f: any) => f && typeof f.path === "string")
        .map((f: any) => ({
          path: String(f.path).replace(/^\.\//, "").replace(/^\/+/, ""),
          content: typeof f.content === "string" ? f.content : "",
        }))
    : [];
  if (Array.isArray(data?.actions)) {
    for (const a of data.actions) {
      if (a?.type === "edit_file" && a.path && typeof a.content === "string") {
        if (!files.some((f) => f.path === a.path)) {
          files.push({ path: a.path, content: a.content });
        }
      }
    }
  }
  return files;
}

function writeNdjson(res: any, obj: unknown) {
  res.write(JSON.stringify(obj) + "\n");
}

/**
 * Unified backend generation (BYOK or platform).
 * Streams NDJSON: status | thought | file | done | error
 */
export default async function handler(req: any, res: any) {
  if (handleOptions(req, res)) return;
  if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" }, req);

  applyCors(req, res);
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");

  let consumed = false;
  let generationId = "";
  let auth: Awaited<ReturnType<typeof userFromBearer>> = null;
  let tracking = false;
  let trackingUserId = "";

  try {
    const raw = await readJsonBody(req);
    const parsed = GenerateRequestSchema.safeParse(raw);
    if (!parsed.success) {
      writeNdjson(res, { type: "error", message: zodErrorMessage(parsed.error) });
      res.end();
      return;
    }

    const body = parsed.data;
    const prompt = body.prompt;
    const vfs = (body.vfs || {}) as Record<string, string>;
    const currentErrors = body.currentErrors ? String(body.currentErrors) : "None";
    const projectName = body.projectName;
    const attachmentNote = body.attachmentNote;

    const provider = String(
      req.headers["x-provider"] || body.provider || "deepseek"
    ).toLowerCase();
    const byokKey = String(req.headers["x-api-key"] || body.apiKey || "").trim();

    let apiKey = byokKey;
    let usePlatform = false;
    let platformProvider = "";

    if (!apiKey) {
      auth = await userFromBearer(req.headers.authorization || req.headers.Authorization);
      if (!auth) {
        writeNdjson(res, {
          type: "error",
          message: "Sign in for platform credits, or send x-api-key for BYOK.",
        });
        res.end();
        return;
      }

      await assertGenerationRateLimit(auth.admin, auth.user.id);
      beginGeneration(auth.user.id);
      tracking = true;
      trackingUserId = auth.user.id;

      usePlatform = true;
      const platform = resolvePlatformAi();
      if (!platform) {
        writeNdjson(res, {
          type: "error",
          message: platformAiNotConfiguredMessage(),
        });
        res.end();
        return;
      }
      apiKey = platform.apiKey;
      platformProvider = platform.provider;

      generationId = newGenerationId(
        String(req.headers["x-generation-id"] || body.generationId || "")
      );

      const spend = await spendPlatformCredit(
        auth.admin,
        auth.user.id,
        generationId,
        "backend_generate"
      );
      if (!spend.ok) {
        writeNdjson(res, {
          type: "error",
          code: spend.code,
          message: spend.message,
        });
        res.end();
        return;
      }
      consumed = true;
      writeNdjson(res, {
        type: "status",
        message: `Platform credit used · ${spend.remaining} left`,
      });
    }

    const effectiveProvider = usePlatform ? platformProvider || "gemini" : provider;

    const scale = classifyBuildScale(prompt, Object.keys(vfs).length);
    const budget = waveBudget(scale);
    const singleWave = Boolean(body.singleWave);
    const startWave = Math.max(0, Number(body.wave) || 0);
    const wavesToRun = singleWave ? 1 : budget.maxWaves;
    const targetPathsIn = Array.isArray(body.targetPaths)
      ? body.targetPaths.map(String).filter(Boolean)
      : undefined;

    writeNdjson(res, {
      type: "status",
      message: singleWave
        ? agentProgressMessage(`building · ${scale} · wave ${startWave + 1}`)
        : agentProgressMessage(`building · ${scale} · ${budget.maxWaves} wave${budget.maxWaves > 1 ? "s" : ""}`),
    });

    let workingVfs = { ...vfs };
    const allFiles: { path: string; content: string }[] = [];
    const allActions: any[] = [];
    let thought = "";
    let plan: string[] = [];
    let nextPaths: string[] | undefined = targetPathsIn;

    for (let i = 0; i < wavesToRun; i++) {
      const wave = singleWave ? startWave : i;
      if (wave >= budget.maxWaves) break;

      writeNdjson(res, {
        type: "status",
        message: `Wave ${wave + 1}/${budget.maxWaves}…`,
      });

      const opts: GenerationOptions = {
        projectName,
        currentErrors: wave === 0 ? currentErrors : "None",
        attachmentNote,
        wave,
        scale,
        targetPaths: nextPaths,
      };
      const { userContent, system, intent } = buildUserContent(prompt, workingVfs, opts);

      const { text, model } = await runLlmJson({
        provider: effectiveProvider,
        apiKey,
        system,
        user: userContent,
        temperature: intent === "create" && wave === 0 ? 0.75 : 0.35,
      });

      writeNdjson(res, {
        type: "status",
        message: agentProgressMessage(`step ${wave + 1} complete`),
      });

      const { data, recovered, note } = parseModelJson(text);
      if (recovered && note) {
        writeNdjson(res, { type: "status", message: note });
      }
      if (typeof data.thought === "string" && data.thought) {
        thought = data.thought;
        writeNdjson(res, { type: "thought", text: data.thought });
      }
      if (Array.isArray(data.plan) && data.plan.length) {
        plan = data.plan.map(String);
      }
      if (Array.isArray(data.actions)) {
        for (const a of data.actions) {
          if (a?.type === "delete_file" && a.path) {
            delete workingVfs[a.path];
            allActions.push(a);
            writeNdjson(res, { type: "status", message: `Deleted ${a.path}` });
          }
        }
      }

      const files = normalizeFiles(data);
      for (let fi = 0; fi < files.length; fi++) {
        const f = files[fi];
        workingVfs[f.path] = f.content;
        const existing = allFiles.findIndex((x) => x.path === f.path);
        if (existing >= 0) allFiles[existing] = f;
        else allFiles.push(f);
        writeNdjson(res, {
          type: "file",
          file: f,
          index: allFiles.length - 1,
          total: allFiles.length,
        });
      }

      nextPaths = Array.isArray(data.next_paths)
        ? data.next_paths.map(String).filter(Boolean)
        : undefined;

      if (singleWave) break;
      if (wave > 0 && (!nextPaths || nextPaths.length === 0) && files.length === 0) break;
      if (wave > 0 && (!nextPaths || nextPaths.length === 0) && scale !== "enterprise") break;
      if (scale === "simple") break;
    }

    writeNdjson(res, {
      type: "done",
      response: {
        thought: thought || "Backend-integrated workspace updated.",
        plan,
        actions: allActions,
        files: allFiles,
        next_paths: nextPaths || [],
        generationId: generationId || undefined,
      },
    });
    res.end();
  } catch (e: any) {
    if (e instanceof BodyTooLargeError) {
      try {
        writeNdjson(res, { type: "error", code: "BODY_TOO_LARGE", message: e.message });
        res.end();
      } catch {
        /* closed */
      }
      return;
    }
    if (e instanceof RateLimitError) {
      try {
        writeNdjson(res, { type: "error", code: "RATE_LIMIT", message: e.message });
        res.end();
      } catch {
        /* closed */
      }
      return;
    }
    if (consumed && auth && generationId) {
      try {
        await refundPlatformCredit(
          auth.admin,
          auth.user.id,
          generationId,
          "backend_generate_failed"
        );
      } catch {
        /* ignore */
      }
    }
    console.error("[ai/generate]", e);
    try {
      writeNdjson(res, { type: "error", message: e.message || "Generation failed" });
      res.end();
    } catch {
      /* already closed */
    }
  } finally {
    if (tracking && trackingUserId) endGeneration(trackingUserId);
  }
}
