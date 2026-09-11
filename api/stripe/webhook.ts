import { getSupabaseAdmin } from "../_lib/http";
import {
  getStripe,
  grantMonthlyCredits,
  upsertProSubscription,
} from "../_lib/stripe";

async function readRawBody(req: any): Promise<Buffer> {
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === "string") return Buffer.from(req.body);
  return await new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end("Method not allowed");
    return;
  }

  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    res.statusCode = 500;
    res.end("Missing STRIPE_WEBHOOK_SECRET");
    return;
  }

  let event;
  try {
    const raw = await readRawBody(req);
    const sig = req.headers["stripe-signature"];
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err: any) {
    console.error("[stripe/webhook] signature", err.message);
    res.statusCode = 400;
    res.end(`Webhook Error: ${err.message}`);
    return;
  }

  const admin = getSupabaseAdmin();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;
        const userId =
          session.client_reference_id ||
          session.metadata?.supabase_user_id;
        if (userId && session.subscription && session.customer) {
          const sub = await stripe.subscriptions.retrieve(String(session.subscription));
          await upsertProSubscription(admin, {
            userId,
            customerId: String(session.customer),
            subscriptionId: sub.id,
            status: sub.status,
            periodEnd: (sub as any).current_period_end,
          });
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const sub = event.data.object as any;
        const userId = sub.metadata?.supabase_user_id;
        let resolvedUserId = userId;
        if (!resolvedUserId && sub.customer) {
          const { data } = await admin
            .from("profiles")
            .select("id")
            .eq("stripe_customer_id", String(sub.customer))
            .maybeSingle();
          resolvedUserId = data?.id;
        }
        if (resolvedUserId) {
          await upsertProSubscription(admin, {
            userId: resolvedUserId,
            customerId: String(sub.customer),
            subscriptionId: sub.id,
            status: sub.status,
            periodEnd: sub.current_period_end,
          });
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as any;
        const { data } = await admin
          .from("profiles")
          .select("id")
          .eq("stripe_subscription_id", sub.id)
          .maybeSingle();
        if (data?.id) {
          await admin
            .from("profiles")
            .update({
              plan: "free",
              subscription_status: "canceled",
              stripe_subscription_id: null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", data.id);
        }
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object as any;
        // Renewals (not the first checkout invoice necessarily) — grant monthly credits
        if (invoice.billing_reason === "subscription_cycle" && invoice.customer) {
          const { data } = await admin
            .from("profiles")
            .select("id")
            .eq("stripe_customer_id", String(invoice.customer))
            .maybeSingle();
          if (data?.id) await grantMonthlyCredits(admin, data.id);
        }
        break;
      }
      default:
        break;
    }
  } catch (e: any) {
    console.error("[stripe/webhook] handler", e);
    res.statusCode = 500;
    res.end("Webhook handler failed");
    return;
  }

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ received: true }));
}
