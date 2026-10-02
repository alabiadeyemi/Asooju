import {
  applyCors,
  handleOptions,
  readJsonBody,
  sendJson,
  BodyTooLargeError,
} from "../_lib/http";
import { requireAdmin } from "../_lib/admin-auth";

/**
 * POST /api/admin/credits — audited credit grant/adjust.
 * Body: { email: string, delta: number, reason?: string }
 * delta > 0 grants; delta < 0 subtracts (floors at 0).
 */
export default async function handler(req: any, res: any) {
  if (handleOptions(req, res)) return;
  applyCors(req, res);
  if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" }, req);

  const ctx = await requireAdmin(req, res);
  if (!ctx) return;

  try {
    const body = await readJsonBody(req);
    const email = String(body?.email || "")
      .trim()
      .toLowerCase();
    const delta = Number(body?.delta);
    const reason = String(body?.reason || "admin_adjust").slice(0, 200);

    if (!email || !email.includes("@")) {
      return sendJson(res, 400, { error: "Valid email required" }, req);
    }
    if (!Number.isFinite(delta) || delta === 0 || Math.abs(delta) > 10_000) {
      return sendJson(
        res,
        400,
        { error: "delta must be a non-zero number (max ±10000)" },
        req
      );
    }

    const admin = ctx.admin;
    const { data: profile, error: findErr } = await admin
      .from("profiles")
      .select("id, email, credits_balance")
      .ilike("email", email)
      .maybeSingle();

    if (findErr) throw findErr;
    if (!profile) {
      return sendJson(res, 404, { error: "No profile for that email" }, req);
    }

    const current = Number(profile.credits_balance ?? 0);
    const next = Math.max(0, current + Math.trunc(delta));

    const { data: updated, error: updErr } = await admin
      .from("profiles")
      .update({
        credits_balance: next,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id)
      .select("id, email, credits_balance, plan")
      .single();

    if (updErr) throw updErr;

    await admin.from("usage_events").insert({
      user_id: profile.id,
      kind: delta > 0 ? "admin_grant" : "admin_adjust",
      amount: Math.abs(Math.trunc(delta)),
      meta: {
        delta: Math.trunc(delta),
        reason,
        admin_id: ctx.user.id,
        admin_email: ctx.user.email || null,
        previous: current,
        next,
      },
    });

    return sendJson(
      res,
      200,
      {
        ok: true,
        profile: updated,
        previous: current,
        next,
      },
      req
    );
  } catch (e: any) {
    const status = e instanceof BodyTooLargeError ? 413 : 500;
    return sendJson(res, status, { error: e?.message || "Credit adjust failed" }, req);
  }
}
