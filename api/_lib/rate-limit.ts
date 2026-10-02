/**
 * Lightweight abuse controls — memory burst + durable usage_events counts.
 * No Redis required.
 */

type Admin = { from: (t: string) => any };

const burstBuckets = new Map<string, { count: number; resetAt: number }>();

const BURST_LIMIT = Number(process.env.AI_BURST_LIMIT || 8);
const BURST_WINDOW_MS = Number(process.env.AI_BURST_WINDOW_MS || 60_000);
const HOURLY_LIMIT = Number(process.env.AI_HOURLY_LIMIT || 40);
const DAILY_LIMIT = Number(process.env.AI_DAILY_LIMIT || 120);
const MAX_CONCURRENT = Number(process.env.AI_MAX_CONCURRENT || 2);

const inflight = new Map<string, number>();

export class RateLimitError extends Error {
  status = 429;
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}

function bumpBurst(key: string) {
  const now = Date.now();
  const cur = burstBuckets.get(key);
  if (!cur || now >= cur.resetAt) {
    burstBuckets.set(key, { count: 1, resetAt: now + BURST_WINDOW_MS });
    return;
  }
  cur.count += 1;
  if (cur.count > BURST_LIMIT) {
    throw new RateLimitError(
      `Too many requests — try again in ${Math.ceil((cur.resetAt - now) / 1000)}s.`
    );
  }
}

export async function assertGenerationRateLimit(
  admin: Admin,
  userId: string
): Promise<void> {
  bumpBurst(userId);

  const concurrent = inflight.get(userId) || 0;
  if (concurrent >= MAX_CONCURRENT) {
    throw new RateLimitError("Another generation is already running. Wait for it to finish.");
  }

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { count: hourCount, error: hErr } = await admin
    .from("usage_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("kind", "credit_spend")
    .gte("created_at", hourAgo);

  if (!hErr && (hourCount || 0) >= HOURLY_LIMIT) {
    throw new RateLimitError(
      `Hourly platform generation limit reached (${HOURLY_LIMIT}/hour). Try later or use BYOK.`
    );
  }

  const { count: dayCount, error: dErr } = await admin
    .from("usage_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("kind", "credit_spend")
    .gte("created_at", dayAgo);

  if (!dErr && (dayCount || 0) >= DAILY_LIMIT) {
    throw new RateLimitError(
      `Daily platform generation limit reached (${DAILY_LIMIT}/day). Try tomorrow or use BYOK.`
    );
  }
}

export function beginGeneration(userId: string) {
  inflight.set(userId, (inflight.get(userId) || 0) + 1);
}

export function endGeneration(userId: string) {
  const n = (inflight.get(userId) || 0) - 1;
  if (n <= 0) inflight.delete(userId);
  else inflight.set(userId, n);
}
