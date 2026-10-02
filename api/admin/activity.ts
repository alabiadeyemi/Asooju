import { applyCors, handleOptions, sendJson } from "../_lib/http";
import { requireAdmin } from "../_lib/admin-auth";

/**
 * GET /api/admin/activity?page=&limit=&kind=
 * Recent usage_events with owner email for the Activity tab.
 */
export default async function handler(req: any, res: any) {
  if (handleOptions(req, res)) return;
  applyCors(req, res);
  if (req.method !== "GET") {
    return sendJson(res, 405, { error: "Method not allowed" }, req);
  }

  const ctx = await requireAdmin(req, res);
  if (!ctx) return;

  try {
    const url = new URL(req.url || "", "http://localhost");
    const kind = String(url.searchParams.get("kind") || "").trim();
    const page = Math.max(1, Number(url.searchParams.get("page") || 1) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number(url.searchParams.get("limit") || 40) || 40)
    );
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = ctx.admin
      .from("usage_events")
      .select("id, user_id, kind, amount, meta, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (kind) query = query.eq("kind", kind);

    const { data, error, count } = await query;
    if (error) throw error;

    const rows = data || [];
    const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))];
    const emailById: Record<string, string | null> = {};
    const planById: Record<string, string | null> = {};
    if (userIds.length) {
      const { data: profiles } = await ctx.admin
        .from("profiles")
        .select("id, email, plan")
        .in("id", userIds);
      for (const p of profiles || []) {
        emailById[p.id] = p.email;
        planById[p.id] = p.plan;
      }
    }

    return sendJson(
      res,
      200,
      {
        events: rows.map((r) => ({
          ...r,
          email: emailById[r.user_id] || null,
          plan: planById[r.user_id] || null,
        })),
        page,
        limit,
        total: count ?? rows.length,
      },
      req
    );
  } catch (e: any) {
    return sendJson(
      res,
      500,
      { error: e?.message || "Failed to load activity" },
      req
    );
  }
}
