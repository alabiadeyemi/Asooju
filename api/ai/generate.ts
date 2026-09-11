import {
  handleOptions,
  readJsonBody,
  sendJson,
  userFromBearer,
} from "../_lib/http";
import { runLlmJson, parseJsonLoose } from "../_lib/llm";
import {
  buildUserContent,
  type GenerationOptions,
} from "../../src/lib/generation-prompt";
import { classifyBuildScale, waveBudget } from "../../src/lib/complexity";

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
 *
 * Headers:
 * - Authorization: Bearer <supabase jwt> (required for platform credits)
 * - x-provider: deepseek|openai|gemini|claude|grok
 * - x-api-key: BYOK key (optional — if absent, uses platform key + credits)
 */
export default async function handler(req: any, res: any) {
  if (handleOptions(req, res)) return;
  if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-api-key, x-provider");

  let consumed = false;
  let auth: Awaited<ReturnType<typeof userFromBearer>> = null;

  try {
    const body = await readJsonBody(req);
    const prompt = String(body.prompt || "");
    const vfs = (body.vfs && typeof body.vfs === "object" ? body.vfs : {}) as Record<
      string,
      string
    >;
    const currentErrors = body.currentErrors ? String(body.currentErrors) : "None";
    const projectName = body.projectName ? String(body.projectName) : undefined;
    const attachmentNote = body.attachmentNote ? String(body.attachmentNote) : undefined;

    if (!prompt.trim()) {
      writeNdjson(res, { type: "error", message: "Missing prompt" });
      res.end();
      return;
    }

    const provider = String(
      req.headers["x-provider"] || body.provider || "deepseek"
    ).toLowerCase();
    const byokKey = String(req.headers["x-api-key"] || body.apiKey || "").trim();

    let apiKey = byokKey;
    let usePlatform = false;

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
      usePlatform = true;
      apiKey =
        process.env.PLATFORM_GEMINI_API_KEY ||
        process.env.GEMINI_API_KEY ||
        process.env.PLATFORM_DEEPSEEK_API_KEY ||
        process.env.DEEPSEEK_API_KEY ||
        process.env.VITE_DEEPSEEK_API_KEY ||
        process.env.VITE_GEMINI_API_KEY ||
        "";
      if (!apiKey) {
        writeNdjson(res, {
          type: "error",
          message: "Platform AI not configured (PLATFORM_GEMINI_API_KEY or PLATFORM_DEEPSEEK_API_KEY).",
        });
        res.end();
        return;
      }

      // Spend credit
      await auth.admin.from("profiles").upsert({ id: auth.user.id, email: auth.user.email });
      const { data: profile } = await auth.admin
        .from("profiles")
        .select("credits_balance, credits_lifetime_used")
        .eq("id", auth.user.id)
        .maybeSingle();
      const bal = Number(profile?.credits_balance ?? 0);
      if (bal < 1) {
        writeNdjson(res, {
          type: "error",
          code: "NO_CREDITS",
          message:
            "No platform credits left. Upgrade to Pro or add your own API key (BYOK).",
        });
        res.end();
        return;
      }
      const { data: updated, error } = await auth.admin
        .from("profiles")
        .update({
          credits_balance: bal - 1,
          credits_lifetime_used: Number(profile?.credits_lifetime_used || 0) + 1,
        })
        .eq("id", auth.user.id)
        .eq("credits_balance", bal)
        .select("credits_balance")
        .maybeSingle();
      if (error || !updated) {
        writeNdjson(res, { type: "error", message: "Could not reserve a credit — retry." });
        res.end();
        return;
      }
      consumed = true;
      await auth.admin.from("usage_events").insert({
        user_id: auth.user.id,
        kind: "credit_spend",
        amount: 1,
        meta: { reason: "backend_generate", provider: usePlatform ? "platform" : provider },
      });
      writeNdjson(res, {
        type: "status",
        message: `Platform credit used · ${updated.credits_balance} left`,
      });
    }

    const effectiveProvider = usePlatform
      ? process.env.PLATFORM_AI_PROVIDER ||
        (process.env.PLATFORM_DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY
          ? "deepseek"
          : "gemini")
      : provider;

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
        ? `Backend generate · ${effectiveProvider} · ${scale} · wave ${startWave + 1}…`
        : `Backend generate · ${effectiveProvider} · ${scale} (${budget.maxWaves} wave${budget.maxWaves > 1 ? "s" : ""})…`,
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

      writeNdjson(res, { type: "status", message: `Model ${model} responded (wave ${wave + 1})` });

      const data = parseJsonLoose(text);
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
      // Stop early if model says done
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
      },
    });
    res.end();
  } catch (e: any) {
    if (consumed && auth) {
      try {
        const { data: p } = await auth.admin
          .from("profiles")
          .select("credits_balance")
          .eq("id", auth.user.id)
          .maybeSingle();
        await auth.admin
          .from("profiles")
          .update({ credits_balance: Number(p?.credits_balance || 0) + 1 })
          .eq("id", auth.user.id);
        await auth.admin.from("usage_events").insert({
          user_id: auth.user.id,
          kind: "credit_refund",
          amount: 1,
          meta: { reason: "backend_generate_failed" },
        });
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
  }
}
