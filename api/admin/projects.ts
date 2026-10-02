import { applyCors, handleOptions, sendJson } from "../_lib/http";
import { requireAdmin } from "../_lib/admin-auth";

/**
 * GET /api/admin/projects?q=&page=&limit=
 * Paginated projects with owner email for support.
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
    const q = String(url.searchParams.get("q") || "").trim();
    const page = Math.max(1, Number(url.searchParams.get("page") || 1) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number(url.searchParams.get("limit") || 25) || 25)
    );
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = ctx.admin
      .from("projects")
      .select("id, user_id, name, prompt, created_at, updated_at", {
        count: "exact",
      })
      .order("updated_at", { ascending: false })
      .range(from, to);

    if (q) query = query.ilike("name", `%${q}%`);

    const { data, error, count } = await query;
    if (error) throw error;

    const rows = data || [];
    const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))];
    const emailById: Record<string, string | null> = {};
    if (userIds.length) {
      const { data: profiles } = await ctx.admin
        .from("profiles")
        .select("id, email")
        .in("id", userIds);
      for (const p of profiles || []) {
        emailById[p.id] = p.email;
      }
    }

    return sendJson(
      res,
      200,
      {
        projects: rows.map((r) => ({
          ...r,
          ownerEmail: emailById[r.user_id] || null,
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
      { error: e?.message || "Failed to list projects" },
      req
    );
  }
}
