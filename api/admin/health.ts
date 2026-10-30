import { applyCors, handleOptions, sendJson, getSupabaseAdmin } from "../_lib/http";
import { requireAdmin } from "../_lib/admin-auth";
import { resolvePlatformAi } from "../_lib/platform-ai";

/**
 * GET /api/admin/health — non-secret env + connectivity checks for operators.
 * Does not expose key values.
 */
export default async function handler(req: any, res: any) {
  if (handleOptions(req, res)) return;
  applyCors(req, res);
  if (req.method !== "GET") {
    return sendJson(res, 405, { error: "Method not allowed" }, req);
  }

  const ctx = await requireAdmin(req, res);
  if (!ctx) return;

  const checks: Record<string, { ok: boolean; detail?: string }> = {
    adminEmail: {
      ok: Boolean(String(process.env.ADMIN_EMAIL || "").trim()),
    },
    adminPassword: {
      ok: Boolean(String(process.env.ADMIN_PASSWORD || "")),
    },
    supabaseUrl: {
      ok: Boolean(
        process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
      ),
    },
    serviceRole: {
      ok: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    },
    stripeSecret: {
      ok: Boolean(process.env.STRIPE_SECRET_KEY),
    },
    stripePricePro: {
      ok: Boolean(process.env.STRIPE_PRICE_PRO),
    },
    platformAi: (() => {
      const resolved = resolvePlatformAi();
      return {
        ok: Boolean(resolved),
        detail: resolved
          ? `${resolved.provider} (${resolved.reason})`
          : process.env.PLATFORM_AI_PROVIDER || "not configured",
      };
    })(),
  };

  let supabasePing: { ok: boolean; detail?: string } = {
    ok: false,
    detail: "skipped",
  };
  try {
    const admin = getSupabaseAdmin();
    const { error } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true });
    if (error) {
      supabasePing = { ok: false, detail: error.message };
    } else {
      supabasePing = { ok: true, detail: "profiles reachable" };
    }
  } catch (e: any) {
    supabasePing = { ok: false, detail: e?.message || "ping failed" };
  }
  checks.supabasePing = supabasePing;

  const ok = Object.values(checks).every((c) => c.ok);

  return sendJson(
    res,
    200,
    {
      ok,
      checks,
      appOrigin: process.env.APP_ORIGIN || process.env.VITE_APP_URL || null,
    },
    req
  );
}
