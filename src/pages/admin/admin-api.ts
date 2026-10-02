import { readAdminToken } from "@/lib/admin-session";

export type PlanCatalogEntry = {
  id: string;
  label: string;
  welcomeCredits: number;
  monthlyCredits: number;
  priceUsd: number;
  features: string[];
};

export type AdminStats = {
  users: number;
  projects: number;
  usageEvents: number;
  generations: number;
  activeSubs: number;
  trialing: number;
  canceled: number;
  withStripeSub: number;
  lowCreditUsers: number;
  newUsers7d: number;
  spend7d: number;
  spend24h: number;
  creditsOutstanding: number;
  creditsLifetimeBurn: number;
  plans: Record<string, number>;
  lowCreditSample: Array<{
    id: string;
    email: string | null;
    plan: string;
    credits_balance: number;
    subscription_status: string | null;
    updated_at: string;
  }>;
  recentSignups: Array<{
    id: string;
    email: string | null;
    plan: string;
    credits_balance: number;
    created_at: string;
    subscription_status: string | null;
  }>;
  planCatalog: Record<string, PlanCatalogEntry>;
};

export type AdminUserRow = {
  id: string;
  email: string | null;
  plan: string;
  credits_balance: number;
  credits_lifetime_used: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
  projectCount: number;
};

export type AdminUserDetail = {
  profile: Omit<AdminUserRow, "projectCount">;
  projectCount: number;
  projects: Array<{
    id: string;
    name: string;
    updated_at: string;
    created_at: string;
  }>;
  recentUsage: Array<{
    id: string;
    kind: string;
    amount: number;
    meta: Record<string, unknown> | null;
    created_at: string;
  }>;
  auth: {
    emailConfirmed: boolean;
    lastSignInAt: string | null;
    createdAt: string | null;
    bannedUntil: string | null;
    isBanned: boolean;
  };
};

export type AdminProjectRow = {
  id: string;
  user_id: string;
  name: string;
  prompt: string | null;
  created_at: string;
  updated_at: string;
  ownerEmail: string | null;
};

export type AdminActivityEvent = {
  id: string;
  user_id: string;
  kind: string;
  amount: number;
  meta: Record<string, unknown> | null;
  created_at: string;
  email: string | null;
  plan: string | null;
};

export async function adminFetch<T = unknown>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const token = readAdminToken();
  if (!token) throw new Error("Not signed in as admin");
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.error || `Request failed (${res.status})`);
  return data as T;
}

export function formatWhen(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function statusBadgeClass(status: string | null | undefined) {
  const s = String(status || "").toLowerCase();
  if (s === "active") return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
  if (s === "trialing") return "bg-sky-500/15 text-sky-300 border-sky-500/30";
  if (s === "past_due") return "bg-amber-500/15 text-amber-200 border-amber-500/30";
  if (s === "canceled" || s === "cancelled")
    return "bg-white/5 text-white/45 border-white/10";
  return "bg-white/5 text-white/40 border-white/10";
}

export function planBadgeClass(plan: string | null | undefined) {
  const p = String(plan || "free").toLowerCase();
  if (p === "pro") return "bg-violet-500/15 text-violet-200 border-violet-500/30";
  if (p === "byok") return "bg-cyan-500/15 text-cyan-200 border-cyan-500/30";
  return "bg-white/5 text-white/50 border-white/10";
}
