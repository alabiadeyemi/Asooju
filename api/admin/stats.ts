import { applyCors, handleOptions, sendJson } from "../_lib/http";
import { requireAdmin } from "../_lib/admin-auth";

/**
 * GET /api/admin/stats — dashboard KPIs (admin only).
 */
export default async function handler(req: any, res: any) {
  if (handleOptions(req, res)) return;
  applyCors(req, res);
  if (req.method !== "GET") return sendJson(res, 405, { error: "Method not allowed" }, req);

  const ctx = await requireAdmin(req, res);
  if (!ctx) return;

  try {
    const admin = ctx.admin;
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [
      profilesRes,
      projectsRes,
      usageRes,
      spendRes,
      activeSubsRes,
      trialingRes,
      canceledRes,
      withSubIdRes,
      lowCreditRes,
      newUsers7dRes,
      spend7dRes,
      spend24hRes,
    ] = await Promise.all([
      admin.from("profiles").select("id", { count: "exact", head: true }),
      admin.from("projects").select("id", { count: "exact", head: true }),
      admin.from("usage_events").select("id", { count: "exact", head: true }),
      admin
        .from("usage_events")
        .select("id", { count: "exact", head: true })
        .eq("kind", "credit_spend"),
      admin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("subscription_status", "active"),
      admin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("subscription_status", "trialing"),
      admin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("subscription_status", "canceled"),
      admin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .not("stripe_subscription_id", "is", null),
      admin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .lte("credits_balance", 1),
      admin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", weekAgo),
      admin
        .from("usage_events")
        .select("id", { count: "exact", head: true })
        .eq("kind", "credit_spend")
        .gte("created_at", weekAgo),
      admin
        .from("usage_events")
        .select("id", { count: "exact", head: true })
        .eq("kind", "credit_spend")
        .gte("created_at", dayAgo),
    ]);

    const { data: creditRows } = await admin
      .from("profiles")
      .select("credits_balance, credits_lifetime_used, plan");

    const plans = { free: 0, pro: 0, byok: 0 } as Record<string, number>;
    let creditsOutstanding = 0;
    let creditsLifetimeBurn = 0;
    for (const row of creditRows || []) {
      const p = String(row.plan || "free");
      plans[p] = (plans[p] || 0) + 1;
      creditsOutstanding += Number(row.credits_balance || 0);
      creditsLifetimeBurn += Number(row.credits_lifetime_used || 0);
    }

    const { data: lowUsers } = await admin
      .from("profiles")
      .select("id, email, plan, credits_balance, subscription_status, updated_at")
      .lte("credits_balance", 1)
      .order("credits_balance", { ascending: true })
      .limit(8);

    const { data: recentUsers } = await admin
      .from("profiles")
      .select("id, email, plan, credits_balance, created_at, subscription_status")
      .order("created_at", { ascending: false })
      .limit(8);

    return sendJson(
      res,
      200,
      {
        users: profilesRes.count ?? 0,
        projects: projectsRes.count ?? 0,
        usageEvents: usageRes.count ?? 0,
        generations: spendRes.count ?? 0,
        activeSubs: activeSubsRes.count ?? 0,
        trialing: trialingRes.count ?? 0,
        canceled: canceledRes.count ?? 0,
        withStripeSub: withSubIdRes.count ?? 0,
        lowCreditUsers: lowCreditRes.count ?? 0,
        newUsers7d: newUsers7dRes.count ?? 0,
        spend7d: spend7dRes.count ?? 0,
        spend24h: spend24hRes.count ?? 0,
        creditsOutstanding,
        creditsLifetimeBurn,
        plans,
        lowCreditSample: lowUsers || [],
        recentSignups: recentUsers || [],
        planCatalog: {
          free: {
            id: "free",
            label: "Free",
            welcomeCredits: 5,
            monthlyCredits: 0,
            priceUsd: 0,
            features: ["5 welcome platform credits", "BYOK unlimited", "Local guest mode"],
          },
          pro: {
            id: "pro",
            label: "Pro",
            welcomeCredits: 0,
            monthlyCredits: 100,
            priceUsd: 29,
            features: [
              "100 platform credits / billing cycle",
              "Stripe subscription",
              "Customer portal",
            ],
          },
          byok: {
            id: "byok",
            label: "BYOK",
            welcomeCredits: 0,
            monthlyCredits: 0,
            priceUsd: 0,
            features: [
              "User brings provider keys",
              "Platform credits not consumed while BYOK active",
              "Same builder features",
            ],
          },
        },
      },
      req
    );
  } catch (e: any) {
    return sendJson(
      res,
      500,
      { error: e?.message || "Failed to load admin stats" },
      req
    );
  }
}
