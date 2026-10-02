import {
  applyCors,
  handleOptions,
  readJsonBody,
  sendJson,
  BodyTooLargeError,
} from "../_lib/http";
import { requireAdmin } from "../_lib/admin-auth";
import { getStripe } from "../_lib/stripe";

/**
 * POST /api/admin/stripe-sync — pull Stripe subscription state into profiles.
 * Does NOT cancel, refund, or grant credits. Safe re-sync only.
 * Body: { id: userUuid }
 */
export default async function handler(req: any, res: any) {
  if (handleOptions(req, res)) return;
  applyCors(req, res);
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed" }, req);
  }

  const ctx = await requireAdmin(req, res);
  if (!ctx) return;

  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return sendJson(
        res,
        503,
        { error: "STRIPE_SECRET_KEY not configured" },
        req
      );
    }

    const body = await readJsonBody(req);
    const id = String(body?.id || "").trim();
    if (!id) return sendJson(res, 400, { error: "id required" }, req);

    const { data: profile, error: findErr } = await ctx.admin
      .from("profiles")
      .select(
        "id, email, plan, credits_balance, stripe_customer_id, stripe_subscription_id, subscription_status, current_period_end"
      )
      .eq("id", id)
      .maybeSingle();
    if (findErr) throw findErr;
    if (!profile) return sendJson(res, 404, { error: "User not found" }, req);

    if (!profile.stripe_customer_id && !profile.stripe_subscription_id) {
      return sendJson(
        res,
        400,
        { error: "No Stripe customer/subscription on this profile" },
        req
      );
    }

    const stripe = getStripe();
    let subscription: any = null;

    if (profile.stripe_subscription_id) {
      try {
        subscription = await stripe.subscriptions.retrieve(
          profile.stripe_subscription_id
        );
      } catch (e: any) {
        if (e?.statusCode !== 404 && e?.code !== "resource_missing") throw e;
      }
    }

    if (!subscription && profile.stripe_customer_id) {
      const list = await stripe.subscriptions.list({
        customer: profile.stripe_customer_id,
        status: "all",
        limit: 5,
      });
      subscription =
        list.data.find((s) =>
          ["active", "trialing", "past_due"].includes(s.status)
        ) || list.data[0] || null;
    }

    const previous = {
      plan: profile.plan,
      subscription_status: profile.subscription_status,
      stripe_subscription_id: profile.stripe_subscription_id,
      current_period_end: profile.current_period_end,
    };

    if (!subscription) {
      const { error: updErr } = await ctx.admin
        .from("profiles")
        .update({
          subscription_status: "canceled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (updErr) throw updErr;

      await ctx.admin.from("usage_events").insert({
        user_id: id,
        kind: "admin_stripe_sync",
        amount: 1,
        meta: {
          result: "no_subscription",
          previous,
          admin_email: ctx.user.email || null,
        },
      });

      return sendJson(
        res,
        200,
        {
          ok: true,
          result: "no_subscription",
          profile: { ...profile, subscription_status: "canceled" },
        },
        req
      );
    }

    const status = String(subscription.status || "");
    const active = ["active", "trialing"].includes(status);
    const periodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null;

    const patch: Record<string, unknown> = {
      stripe_customer_id:
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer?.id || profile.stripe_customer_id,
      stripe_subscription_id: subscription.id,
      subscription_status: status,
      current_period_end: periodEnd,
      updated_at: new Date().toISOString(),
    };
    // Align plan with Stripe without touching credit balance
    if (active) patch.plan = "pro";
    else if (profile.plan === "pro") patch.plan = "free";

    const { data: updated, error: updErr } = await ctx.admin
      .from("profiles")
      .update(patch)
      .eq("id", id)
      .select(
        "id, email, plan, credits_balance, stripe_customer_id, stripe_subscription_id, subscription_status, current_period_end"
      )
      .single();
    if (updErr) throw updErr;

    await ctx.admin.from("usage_events").insert({
      user_id: id,
      kind: "admin_stripe_sync",
      amount: 1,
      meta: {
        result: "synced",
        previous,
        next: {
          plan: updated.plan,
          subscription_status: updated.subscription_status,
          stripe_subscription_id: updated.stripe_subscription_id,
          current_period_end: updated.current_period_end,
        },
        stripe_status: status,
        admin_email: ctx.user.email || null,
      },
    });

    return sendJson(
      res,
      200,
      { ok: true, result: "synced", profile: updated, stripeStatus: status },
      req
    );
  } catch (e: any) {
    const status = e instanceof BodyTooLargeError ? 413 : 500;
    return sendJson(
      res,
      status,
      { error: e?.message || "Stripe sync failed" },
      req
    );
  }
}
