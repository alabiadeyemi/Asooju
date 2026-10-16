/** Lovable-inspired credit economics for Asooju */

export const FREE_WELCOME_CREDITS = 5;
export const PRO_MONTHLY_CREDITS = 100;
export const PRO_PRICE_USD = 29;
export const PRO_PRICE_LABEL = "$29";

export type BillingPlan = "free" | "pro" | "byok";

export type BillingProfile = {
  id: string;
  email?: string | null;
  plan: BillingPlan;
  credits_balance: number;
  credits_lifetime_used: number;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  subscription_status?: string | null;
  current_period_end?: string | null;
};

export type AccessMode = "byok" | "platform" | "blocked";

export function describePlan(plan: BillingPlan) {
  if (plan === "pro") return "Pro";
  if (plan === "byok") return "BYOK";
  return "Free";
}
