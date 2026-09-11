import Stripe from "stripe";

/** Keep in sync with src/lib/billing.ts */
const PRO_MONTHLY_CREDITS = 100;

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(key, { apiVersion: "2024-11-20.acacia" as any });
}

export function appUrl() {
  const raw =
    process.env.VITE_APP_URL ||
    process.env.APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "http://127.0.0.1:8080";
  return raw.replace(/\/$/, "");
}

export function proPriceId() {
  const id = process.env.STRIPE_PRICE_PRO;
  if (!id) throw new Error("Missing STRIPE_PRICE_PRO (Stripe Price ID for Pro)");
  return id;
}

export async function upsertProSubscription(
  admin: any,
  opts: {
    userId: string;
    customerId: string;
    subscriptionId: string;
    status: string;
    periodEnd?: number | null;
  }
) {
  const periodEnd = opts.periodEnd
    ? new Date(opts.periodEnd * 1000).toISOString()
    : null;

  const { data: existing } = await admin
    .from("profiles")
    .select("credits_balance, plan")
    .eq("id", opts.userId)
    .maybeSingle();

  const active = ["active", "trialing"].includes(opts.status);
  const patch: Record<string, unknown> = {
    stripe_customer_id: opts.customerId,
    stripe_subscription_id: opts.subscriptionId,
    subscription_status: opts.status,
    current_period_end: periodEnd,
    plan: active ? "pro" : existing?.plan === "pro" ? "free" : existing?.plan || "free",
    updated_at: new Date().toISOString(),
  };

  // Lovable-style: grant monthly credits when subscription becomes active
  if (active) {
    patch.credits_balance = Math.max(
      Number(existing?.credits_balance || 0),
      PRO_MONTHLY_CREDITS
    );
  }

  await admin.from("profiles").upsert({ id: opts.userId, ...patch });
}

export async function grantMonthlyCredits(admin: any, userId: string) {
  const { data } = await admin
    .from("profiles")
    .select("credits_balance")
    .eq("id", userId)
    .maybeSingle();
  const next = Number(data?.credits_balance || 0) + PRO_MONTHLY_CREDITS;
  await admin
    .from("profiles")
    .update({
      credits_balance: next,
      plan: "pro",
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
  await admin.from("usage_events").insert({
    user_id: userId,
    kind: "credit_grant",
    amount: PRO_MONTHLY_CREDITS,
    meta: { source: "stripe_invoice" },
  });
}
