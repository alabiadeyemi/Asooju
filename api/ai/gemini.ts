import {
  BodyTooLargeError,
  handleOptions,
  newGenerationId,
  readJsonBody,
  sendJson,
  userFromBearer,
} from "../_lib/http";
import { spendPlatformCredit, refundPlatformCredit } from "../_lib/credits";
import {
  assertGenerationRateLimit,
  beginGeneration,
  endGeneration,
  RateLimitError,
} from "../_lib/rate-limit";
import { GeminiPlatformRequestSchema, zodErrorMessage } from "../_lib/schemas";
import {
  platformAiNotConfiguredMessage,
  resolvePlatformAi,
} from "../_lib/platform-ai";
import { runLlmJson } from "../_lib/llm";

/**
 * Platform generation (server-held key). Auth required.
 * URL kept as /api/ai/gemini for compatibility; upstream follows PLATFORM_AI_PROVIDER
 * (gemini | deepseek). Same auth, credits, rate limits, and { text, model, ... } response.
 */
export default async function handler(req: any, res: any) {
  if (handleOptions(req, res)) return;
  if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" }, req);

  let consumed = false;
  let generationId = "";
  let auth: Awaited<ReturnType<typeof userFromBearer>> = null;
  let tracking = false;

  try {
    auth = await userFromBearer(req.headers.authorization || req.headers.Authorization);
    if (!auth) return sendJson(res, 401, { error: "Sign in to use platform credits." }, req);

    await assertGenerationRateLimit(auth.admin, auth.user.id);
    beginGeneration(auth.user.id);
    tracking = true;

    const raw = await readJsonBody(req);
    const parsed = GeminiPlatformRequestSchema.safeParse(raw);
    if (!parsed.success) {
      return sendJson(res, 400, { error: zodErrorMessage(parsed.error) }, req);
    }
    const body = parsed.data;
    const system = body.system || "";
    const userContent = body.userContent;
    const creative = Boolean(body.creative);
    const hasImages = Array.isArray(body.inlineImages) && body.inlineImages.length > 0;

    const platform = resolvePlatformAi({ needsGemini: hasImages });
    if (!platform) {
      return sendJson(res, 503, { error: platformAiNotConfiguredMessage() }, req);
    }

    generationId = newGenerationId(
      String(req.headers["x-generation-id"] || body.generationId || "")
    );

    const spend = await spendPlatformCredit(
      auth.admin,
      auth.user.id,
      generationId,
      "platform_generation"
    );
    if (!spend.ok) {
      const status = spend.code === "NO_CREDITS" ? 402 : 409;
      return sendJson(
        res,
        status,
        {
          error: spend.code,
          message: spend.message,
          remaining: spend.remaining ?? 0,
        },
        req
      );
    }
    consumed = true;

    const temperature = creative ? 0.85 : 0.4;
    let text = "";
    let model = "";

    if (platform.provider === "gemini" && hasImages) {
      const modelHint = body.model || "gemini-2.5-flash";
      const tryModels = [modelHint, "gemini-2.5-flash", "gemini-flash-latest", "gemini-2.0-flash"];
      let lastErr = "Platform Gemini failed";
      const parts: any[] = [{ text: `${system}\n\n${userContent}` }];
      for (const img of body.inlineImages!) {
        if (img?.mimeType && img?.data) {
          parts.push({ inlineData: { mimeType: img.mimeType, data: img.data } });
        }
      }

      for (const candidate of [...new Set(tryModels)]) {
        const upstream = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${candidate}:generateContent`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": platform.apiKey,
            },
            body: JSON.stringify({
              contents: [{ role: "user", parts }],
              generationConfig: {
                temperature,
                responseMimeType: "application/json",
              },
            }),
          }
        );
        const data = await upstream.json().catch(() => ({}));
        if (!upstream.ok) {
          lastErr = data?.error?.message || `Gemini ${candidate} failed (${upstream.status})`;
          if (upstream.status === 404 || /not found|NOT_FOUND/i.test(lastErr)) continue;
          throw new Error(lastErr);
        }
        text = (data?.candidates?.[0]?.content?.parts || [])
          .map((p: any) => p.text || "")
          .join("");
        model = candidate;
        lastErr = "";
        break;
      }
      if (lastErr) throw new Error(lastErr);
    } else {
      const result = await runLlmJson({
        provider: platform.provider,
        apiKey: platform.apiKey,
        system,
        user: userContent,
        temperature,
      });
      text = result.text;
      model = result.model;
    }

    return sendJson(
      res,
      200,
      {
        text,
        model,
        provider: platform.provider,
        remaining: spend.remaining,
        generationId,
      },
      req
    );
  } catch (e: any) {
    if (e instanceof BodyTooLargeError) {
      return sendJson(res, 413, { error: e.message }, req);
    }
    if (e instanceof RateLimitError) {
      return sendJson(res, 429, { error: e.message }, req);
    }
    if (consumed && auth && generationId) {
      try {
        await refundPlatformCredit(
          auth.admin,
          auth.user.id,
          generationId,
          "platform_generation_failed"
        );
      } catch {
        /* ignore refund errors */
      }
    }
    console.error("[ai/gemini]", e);
    return sendJson(res, 500, { error: e.message || "Platform generation failed" }, req);
  } finally {
    if (tracking && auth) endGeneration(auth.user.id);
  }
}
