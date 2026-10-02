import {
  handleOptions,
  readJsonBody,
  sendJson,
  userFromBearer,
  BodyTooLargeError,
} from "../_lib/http";
import { appUrl, getStripe, proPriceId } from "../_lib/stripe";

export default async function handler(req: any, res: any) {
  if (handleOptions(req, res)) return;
  if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" }, req);

  try {
    const auth = await userFromBearer(req.headers.authorization || req.headers.Authorization);
    if (!auth) return sendJson(res, 401, { error: "Sign in to subscribe." }, req);

    const body = await readJsonBody(req);
    const plan = String(body.plan || "pro");
    if (plan !== "pro") return sendJson(res, 400, { error: "Only Pro checkout is available." }, req);

    const stripe = getStripe();
    const admin = auth.admin;
    const { data: profile } = await admin
      .from("profiles")
      .select("*")
      .eq("id", auth.user.id)
      .maybeSingle();

    let customerId = profile?.stripe_customer_id as string | undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: auth.user.email || undefined,
        metadata: { supabase_user_id: auth.user.id },
      });
      customerId = customer.id;
      await admin.from("profiles").upsert({
        id: auth.user.id,
        email: auth.user.email,
        stripe_customer_id: customerId,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: proPriceId(), quantity: 1 }],
      success_url: `${appUrl()}/app/settings/billing?checkout=success`,
      cancel_url: `${appUrl()}/pricing?checkout=cancel`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      client_reference_id: auth.user.id,
      metadata: { supabase_user_id: auth.user.id, plan: "pro" },
      subscription_data: {
        metadata: { supabase_user_id: auth.user.id },
      },
    });

    return sendJson(res, 200, { url: session.url, id: session.id }, req);
  } catch (e: any) {
    if (e instanceof BodyTooLargeError) {
      return sendJson(res, 413, { error: e.message }, req);
    }
    console.error("[stripe/checkout]", e);
    return sendJson(
      res,
      500,
      {
        error: e.message || "Checkout failed",
        hint: "Set STRIPE_SECRET_KEY, STRIPE_PRICE_PRO, SUPABASE_SERVICE_ROLE_KEY",
      },
      req
    );
  }
}
