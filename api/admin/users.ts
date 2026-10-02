import { applyCors, handleOptions, sendJson } from "../_lib/http";
import { requireAdmin } from "../_lib/admin-auth";

/**
 * GET /api/admin/users?q=&plan=&status=&page=&limit=
 * Paginated profiles for the admin directory.
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
    const q = String(url.searchParams.get("q") || "")
      .trim()
      .toLowerCase();
    const plan = String(url.searchParams.get("plan") || "").trim().toLowerCase();
    const status = String(url.searchParams.get("status") || "")
      .trim()
      .toLowerCase();
    const page = Math.max(1, Number(url.searchParams.get("page") || 1) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number(url.searchParams.get("limit") || 25) || 25)
    );
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = ctx.admin
      .from("profiles")
      .select(
        "id, email, plan, credits_balance, credits_lifetime_used, stripe_customer_id, stripe_subscription_id, subscription_status, current_period_end, created_at, updated_at",
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    if (q) query = query.ilike("email", `%${q}%`);
    if (plan && ["free", "pro", "byok"].includes(plan)) {
      query = query.eq("plan", plan);
    }
    if (status === "active" || status === "trialing" || status === "canceled" || status === "past_due") {
      query = query.eq("subscription_status", status);
    } else if (status === "subscribed") {
      query = query.not("stripe_subscription_id", "is", null);
    } else if (status === "none") {
      query = query.is("stripe_subscription_id", null);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    const rows = data || [];
    const ids = rows.map((r) => r.id);
    const projectCountByUser: Record<string, number> = {};
    if (ids.length) {
      const { data: projects } = await ctx.admin
        .from("projects")
        .select("user_id")
        .in("user_id", ids);
      for (const p of projects || []) {
        const uid = String(p.user_id);
        projectCountByUser[uid] = (projectCountByUser[uid] || 0) + 1;
      }
    }

    return sendJson(
      res,
      200,
      {
        users: rows.map((r) => ({
          ...r,
          projectCount: projectCountByUser[r.id] || 0,
        })),
        page,
        limit,
        total: count ?? rows.length,
      },
      req
    );
  } catch (e: any) {
    return sendJson(res, 500, { error: e?.message || "Failed to list users" }, req);
  }
}
