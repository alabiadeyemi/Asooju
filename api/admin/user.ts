import {
  applyCors,
  handleOptions,
  readJsonBody,
  sendJson,
  BodyTooLargeError,
} from "../_lib/http";
import { requireAdmin } from "../_lib/admin-auth";

const PROFILE_COLS =
  "id, email, plan, credits_balance, credits_lifetime_used, stripe_customer_id, stripe_subscription_id, subscription_status, current_period_end, created_at, updated_at";

async function loadUserDetail(admin: any, idOrEmail: { id?: string; email?: string }) {
  let profileQuery = admin.from("profiles").select(PROFILE_COLS);
  if (idOrEmail.id) {
    profileQuery = profileQuery.eq("id", idOrEmail.id);
  } else if (idOrEmail.email) {
    profileQuery = profileQuery.ilike("email", idOrEmail.email);
  } else {
    return null;
  }

  const { data: profile, error } = await profileQuery.maybeSingle();
  if (error) throw error;
  if (!profile) return null;

  const [{ data: recentUsage }, { data: projects }, { count: projectCount }, authRes] =
    await Promise.all([
      admin
        .from("usage_events")
        .select("id, kind, amount, meta, created_at")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(40),
      admin
        .from("projects")
        .select("id, name, updated_at, created_at")
        .eq("user_id", profile.id)
        .order("updated_at", { ascending: false })
        .limit(20),
      admin
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("user_id", profile.id),
      admin.auth.admin.getUserById(profile.id),
    ]);

  const authUser = authRes?.data?.user || null;
  const bannedUntil = (authUser as any)?.banned_until || null;
  const isBanned = Boolean(
    bannedUntil && new Date(bannedUntil).getTime() > Date.now()
  );

  return {
    profile,
    projectCount: projectCount ?? (projects || []).length,
    projects: projects || [],
    recentUsage: recentUsage || [],
    auth: {
      emailConfirmed: Boolean(authUser?.email_confirmed_at),
      lastSignInAt: authUser?.last_sign_in_at || null,
      createdAt: authUser?.created_at || null,
      bannedUntil,
      isBanned,
    },
  };
}

/**
 * GET /api/admin/user?id= | ?email=
 * PATCH /api/admin/user — plan / credits / subscription_status / ban
 * POST kept for backward compat: { email } → same as GET detail
 */
export default async function handler(req: any, res: any) {
  if (handleOptions(req, res)) return;
  applyCors(req, res);

  const ctx = await requireAdmin(req, res);
  if (!ctx) return;

  try {
    if (req.method === "GET") {
      const url = new URL(req.url || "", "http://localhost");
      const id = String(url.searchParams.get("id") || "").trim();
      const email = String(url.searchParams.get("email") || "")
        .trim()
        .toLowerCase();
      if (!id && (!email || !email.includes("@"))) {
        return sendJson(res, 400, { error: "id or email required" }, req);
      }
      const detail = await loadUserDetail(ctx.admin, { id: id || undefined, email: email || undefined });
      if (!detail) return sendJson(res, 404, { error: "User not found" }, req);
      return sendJson(res, 200, detail, req);
    }

    if (req.method === "POST") {
      const body = await readJsonBody(req);
      const email = String(body?.email || "")
        .trim()
        .toLowerCase();
      if (!email || !email.includes("@")) {
        return sendJson(res, 400, { error: "Valid email required" }, req);
      }
      const detail = await loadUserDetail(ctx.admin, { email });
      if (!detail) {
        return sendJson(res, 404, { error: "No profile for that email" }, req);
      }
      return sendJson(res, 200, detail, req);
    }

    if (req.method === "PATCH") {
      const body = await readJsonBody(req);
      const id = String(body?.id || "").trim();
      if (!id) return sendJson(res, 400, { error: "id required" }, req);

      const { data: existing, error: findErr } = await ctx.admin
        .from("profiles")
        .select(PROFILE_COLS)
        .eq("id", id)
        .maybeSingle();
      if (findErr) throw findErr;
      if (!existing) return sendJson(res, 404, { error: "User not found" }, req);

      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      const auditEvents: Array<{
        kind: string;
        amount: number;
        meta: Record<string, unknown>;
      }> = [];

      if (body?.plan !== undefined) {
        const plan = String(body.plan).toLowerCase();
        if (!["free", "pro", "byok"].includes(plan)) {
          return sendJson(res, 400, { error: "plan must be free|pro|byok" }, req);
        }
        if (plan !== existing.plan) {
          updates.plan = plan;
          auditEvents.push({
            kind: "admin_plan_change",
            amount: 1,
            meta: { previous: existing.plan, next: plan },
          });
        }
      }

      if (body?.subscription_status !== undefined) {
        const st =
          body.subscription_status === null || body.subscription_status === ""
            ? null
            : String(body.subscription_status).slice(0, 64);
        if (st !== existing.subscription_status) {
          updates.subscription_status = st;
          auditEvents.push({
            kind: "admin_sub_status",
            amount: 1,
            meta: { previous: existing.subscription_status, next: st },
          });
        }
      }

      let creditsNext = Number(existing.credits_balance ?? 0);
      if (body?.credits_balance !== undefined) {
        const bal = Number(body.credits_balance);
        if (!Number.isFinite(bal) || bal < 0 || bal > 1_000_000) {
          return sendJson(res, 400, { error: "credits_balance invalid" }, req);
        }
        creditsNext = Math.trunc(bal);
        updates.credits_balance = creditsNext;
        auditEvents.push({
          kind: "admin_credits_set",
          amount: Math.abs(creditsNext - Number(existing.credits_balance ?? 0)),
          meta: {
            previous: existing.credits_balance,
            next: creditsNext,
            mode: "set",
          },
        });
      } else if (body?.credits_delta !== undefined) {
        const delta = Number(body.credits_delta);
        if (!Number.isFinite(delta) || delta === 0 || Math.abs(delta) > 10_000) {
          return sendJson(
            res,
            400,
            { error: "credits_delta must be non-zero (max ±10000)" },
            req
          );
        }
        const prev = Number(existing.credits_balance ?? 0);
        creditsNext = Math.max(0, prev + Math.trunc(delta));
        updates.credits_balance = creditsNext;
        auditEvents.push({
          kind: delta > 0 ? "admin_grant" : "admin_adjust",
          amount: Math.abs(Math.trunc(delta)),
          meta: {
            delta: Math.trunc(delta),
            previous: prev,
            next: creditsNext,
            reason: String(body?.reason || "admin_adjust").slice(0, 200),
          },
        });
      }

      if (body?.clear_stripe === true) {
        updates.stripe_customer_id = null;
        updates.stripe_subscription_id = null;
        updates.subscription_status = null;
        updates.current_period_end = null;
        auditEvents.push({
          kind: "admin_clear_stripe",
          amount: 1,
          meta: {
            previous_customer: existing.stripe_customer_id,
            previous_sub: existing.stripe_subscription_id,
            previous_status: existing.subscription_status,
          },
        });
      }

      if (body?.grant_pro_pack === true) {
        updates.plan = "pro";
        updates.credits_balance = 100;
        auditEvents.push({
          kind: "admin_grant_pro_pack",
          amount: 100,
          meta: {
            previous_plan: existing.plan,
            previous_credits: existing.credits_balance,
            next_plan: "pro",
            next_credits: 100,
          },
        });
      }

      if (body?.reset_welcome_credits === true) {
        updates.credits_balance = 5;
        if (existing.plan === "pro") {
          /* keep plan */
        }
        auditEvents.push({
          kind: "admin_reset_welcome",
          amount: 5,
          meta: {
            previous: existing.credits_balance,
            next: 5,
          },
        });
      }

      const note = String(body?.note || "").trim();
      if (note) {
        if (note.length > 2000) {
          return sendJson(res, 400, { error: "note too long (max 2000)" }, req);
        }
        auditEvents.push({
          kind: "admin_note",
          amount: 1,
          meta: { note },
        });
      }

      if (Object.keys(updates).length > 1) {
        const { error: updErr } = await ctx.admin
          .from("profiles")
          .update(updates)
          .eq("id", id);
        if (updErr) throw updErr;
      }

      if (body?.ban === true || body?.ban === false) {
        const banDuration = body.ban ? "876000h" : "none";
        const { error: banErr } = await ctx.admin.auth.admin.updateUserById(id, {
          ban_duration: banDuration,
        } as any);
        if (banErr) throw banErr;
        auditEvents.push({
          kind: body.ban ? "admin_ban" : "admin_unban",
          amount: 1,
          meta: { ban: body.ban },
        });
      }

      for (const ev of auditEvents) {
        await ctx.admin.from("usage_events").insert({
          user_id: id,
          kind: ev.kind,
          amount: ev.amount,
          meta: {
            ...ev.meta,
            admin_id: ctx.user.id,
            admin_email: ctx.user.email || null,
            reason: String(body?.reason || "").slice(0, 200) || undefined,
          },
        });
      }

      const detail = await loadUserDetail(ctx.admin, { id });
      return sendJson(res, 200, { ok: true, ...detail }, req);
    }

    return sendJson(res, 405, { error: "Method not allowed" }, req);
  } catch (e: any) {
    const status = e instanceof BodyTooLargeError ? 413 : 500;
    return sendJson(res, status, { error: e?.message || "User admin failed" }, req);
  }
}
