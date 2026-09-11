import { handleOptions, sendJson, userFromBearer } from "../_lib/http";
import { appUrl, getStripe } from "../_lib/stripe";

export default async function handler(req: any, res: any) {
  if (handleOptions(req, res)) return;
  if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });

  try {
    const auth = await userFromBearer(req.headers.authorization || req.headers.Authorization);
    if (!auth) return sendJson(res, 401, { error: "Sign in required." });

    const { data: profile } = await auth.admin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", auth.user.id)
      .maybeSingle();

    if (!profile?.stripe_customer_id) {
      return sendJson(res, 400, {
        error: "No Stripe customer yet. Subscribe to Pro first.",
      });
    }

    const stripe = getStripe();
    const portal = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${appUrl()}/app/settings/billing`,
    });

    return sendJson(res, 200, { url: portal.url });
  } catch (e: any) {
    console.error("[stripe/portal]", e);
    return sendJson(res, 500, { error: e.message || "Portal failed" });
  }
}
