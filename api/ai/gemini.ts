import {
  handleOptions,
  readJsonBody,
  sendJson,
  userFromBearer,
} from "../_lib/http";

/**
 * Platform Gemini (server-held key). Auth required.
 * Atomically consumes 1 credit, then calls Gemini. Refunds on upstream failure.
 */
export default async function handler(req: any, res: any) {
  if (handleOptions(req, res)) return;
  if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });

  const platformKey =
    process.env.PLATFORM_GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY;

  if (!platformKey) {
    return sendJson(res, 503, {
      error: "Platform AI is not configured (set PLATFORM_GEMINI_API_KEY).",
    });
  }

  let consumed = false;
  let auth: Awaited<ReturnType<typeof userFromBearer>> = null;

  try {
    auth = await userFromBearer(req.headers.authorization || req.headers.Authorization);
    if (!auth) return sendJson(res, 401, { error: "Sign in to use platform credits." });

    const body = await readJsonBody(req);
    const system = String(body.system || "");
    const userContent = String(body.userContent || "");
    const creative = Boolean(body.creative);
    const modelHint = String(body.model || "gemini-2.5-flash");
    if (!userContent.trim()) return sendJson(res, 400, { error: "Missing userContent" });

    // Ensure profile row
    await auth.admin.from("profiles").upsert({
      id: auth.user.id,
      email: auth.user.email,
    });

    const { data: profile } = await auth.admin
      .from("profiles")
      .select("credits_balance, credits_lifetime_used")
      .eq("id", auth.user.id)
      .maybeSingle();

    const bal = Number(profile?.credits_balance ?? 0);
    if (bal < 1) {
      return sendJson(res, 402, {
        error: "NO_CREDITS",
        message:
          "You’ve used your free platform prompts. Upgrade to Pro or add your own API key (BYOK).",
        remaining: 0,
      });
    }

    const { data: updated, error: spendErr } = await auth.admin
      .from("profiles")
      .update({
        credits_balance: bal - 1,
        credits_lifetime_used: Number(profile?.credits_lifetime_used || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", auth.user.id)
      .eq("credits_balance", bal)
      .select("credits_balance")
      .maybeSingle();

    if (spendErr || !updated) {
      return sendJson(res, 409, {
        error: "CREDIT_RACE",
        message: "Could not reserve a credit — retry.",
      });
    }
    consumed = true;
    await auth.admin.from("usage_events").insert({
      user_id: auth.user.id,
      kind: "credit_spend",
      amount: 1,
      meta: { reason: "platform_generation" },
    });

    const parts: any[] = [{ text: `${system}\n\n${userContent}` }];
    if (Array.isArray(body.inlineImages)) {
      for (const img of body.inlineImages) {
        if (img?.mimeType && img?.data) {
          parts.push({ inlineData: { mimeType: img.mimeType, data: img.data } });
        }
      }
    }

    const payload = {
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature: creative ? 0.85 : 0.4,
        responseMimeType: "application/json",
      },
    };

    const tryModels = [modelHint, "gemini-2.5-flash", "gemini-flash-latest", "gemini-2.0-flash"];
    let lastErr = "Platform Gemini failed";
    for (const model of [...new Set(tryModels)]) {
      const upstream = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": platformKey,
          },
          body: JSON.stringify(payload),
        }
      );
      const data = await upstream.json().catch(() => ({}));
      if (!upstream.ok) {
        lastErr = data?.error?.message || `Gemini ${model} failed (${upstream.status})`;
        if (upstream.status === 404 || /not found|NOT_FOUND/i.test(lastErr)) continue;
        throw new Error(lastErr);
      }
      const text = (data?.candidates?.[0]?.content?.parts || [])
        .map((p: any) => p.text || "")
        .join("");
      return sendJson(res, 200, {
        text,
        model,
        remaining: updated.credits_balance,
      });
    }
    throw new Error(lastErr);
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
          meta: { reason: "platform_generation_failed" },
        });
      } catch {
        /* ignore refund errors */
      }
    }
    console.error("[ai/gemini]", e);
    return sendJson(res, 500, { error: e.message || "Platform generation failed" });
  }
}
