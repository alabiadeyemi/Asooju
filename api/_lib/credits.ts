/**
 * Platform credit spend/refund helpers — idempotent via generation_id.
 * Prefer DB RPCs when available; fall back to service-role updates.
 */

type Admin = {
  from: (t: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: any; error: any }>;
};

export type CreditResult =
  | { ok: true; remaining: number; idempotent?: boolean }
  | { ok: false; code: string; message: string; remaining?: number };

export async function spendPlatformCredit(
  admin: Admin,
  userId: string,
  generationId: string,
  reason: string
): Promise<CreditResult> {
  await admin.from("profiles").upsert({ id: userId });

  // Prefer idempotent RPC (billing.sql)
  const { data: rpcData, error: rpcErr } = await admin.rpc("consume_credit_idempotent", {
    p_user_id: userId,
    p_generation_id: generationId,
    p_reason: reason,
  });

  if (!rpcErr && rpcData) {
    if (rpcData.ok === false || rpcData.error === "NO_CREDITS") {
      return {
        ok: false,
        code: "NO_CREDITS",
        message:
          "No platform credits left. Upgrade to Pro or add your own API key (BYOK).",
        remaining: Number(rpcData.remaining ?? 0),
      };
    }
    return {
      ok: true,
      remaining: Number(rpcData.remaining ?? 0),
      idempotent: Boolean(rpcData.idempotent),
    };
  }

  // Fallback if RPC not migrated yet
  return spendFallback(admin, userId, generationId, reason);
}

async function spendFallback(
  admin: Admin,
  userId: string,
  generationId: string,
  reason: string
): Promise<CreditResult> {
  const { data: existing } = await admin
    .from("usage_events")
    .select("id")
    .eq("user_id", userId)
    .eq("kind", "credit_spend")
    .filter("meta->>generation_id", "eq", generationId)
    .maybeSingle();

  if (existing) {
    const { data: p } = await admin
      .from("profiles")
      .select("credits_balance")
      .eq("id", userId)
      .maybeSingle();
    return { ok: true, remaining: Number(p?.credits_balance ?? 0), idempotent: true };
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("credits_balance, credits_lifetime_used")
    .eq("id", userId)
    .maybeSingle();

  const bal = Number(profile?.credits_balance ?? 0);
  if (bal < 1) {
    return {
      ok: false,
      code: "NO_CREDITS",
      message:
        "No platform credits left. Upgrade to Pro or add your own API key (BYOK).",
      remaining: 0,
    };
  }

  const { data: updated, error } = await admin
    .from("profiles")
    .update({
      credits_balance: bal - 1,
      credits_lifetime_used: Number(profile?.credits_lifetime_used || 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .eq("credits_balance", bal)
    .select("credits_balance")
    .maybeSingle();

  if (error || !updated) {
    return { ok: false, code: "CREDIT_RACE", message: "Could not reserve a credit — retry." };
  }

  const { error: insErr } = await admin.from("usage_events").insert({
    user_id: userId,
    kind: "credit_spend",
    amount: 1,
    meta: { reason, generation_id: generationId },
  });

  if (insErr) {
    // Unique race — treat as idempotent success
    if (/duplicate|unique/i.test(String(insErr.message || ""))) {
      return { ok: true, remaining: Number(updated.credits_balance), idempotent: true };
    }
  }

  return { ok: true, remaining: Number(updated.credits_balance) };
}

export async function refundPlatformCredit(
  admin: Admin,
  userId: string,
  generationId: string,
  reason: string
): Promise<CreditResult> {
  const { data: rpcData, error: rpcErr } = await admin.rpc("refund_credit_idempotent", {
    p_user_id: userId,
    p_generation_id: generationId,
    p_reason: reason,
  });

  if (!rpcErr && rpcData) {
    if (rpcData.ok === false) {
      return {
        ok: false,
        code: String(rpcData.error || "REFUND_DENIED"),
        message: String(rpcData.message || "Refund not applied"),
        remaining: Number(rpcData.remaining ?? 0),
      };
    }
    return {
      ok: true,
      remaining: Number(rpcData.remaining ?? 0),
      idempotent: Boolean(rpcData.idempotent),
    };
  }

  return refundFallback(admin, userId, generationId, reason);
}

async function refundFallback(
  admin: Admin,
  userId: string,
  generationId: string,
  reason: string
): Promise<CreditResult> {
  const { data: already } = await admin
    .from("usage_events")
    .select("id")
    .eq("user_id", userId)
    .eq("kind", "credit_refund")
    .filter("meta->>generation_id", "eq", generationId)
    .maybeSingle();
  if (already) {
    const { data: p } = await admin
      .from("profiles")
      .select("credits_balance")
      .eq("id", userId)
      .maybeSingle();
    return { ok: true, remaining: Number(p?.credits_balance ?? 0), idempotent: true };
  }

  const { data: spend } = await admin
    .from("usage_events")
    .select("id")
    .eq("user_id", userId)
    .eq("kind", "credit_spend")
    .filter("meta->>generation_id", "eq", generationId)
    .maybeSingle();
  if (!spend) {
    return { ok: false, code: "NO_SPEND", message: "No matching spend to refund." };
  }

  const { data: p } = await admin
    .from("profiles")
    .select("credits_balance")
    .eq("id", userId)
    .maybeSingle();
  const next = Number(p?.credits_balance || 0) + 1;
  await admin.from("profiles").update({ credits_balance: next }).eq("id", userId);
  await admin.from("usage_events").insert({
    user_id: userId,
    kind: "credit_refund",
    amount: 1,
    meta: { reason, generation_id: generationId },
  });
  return { ok: true, remaining: next };
}
