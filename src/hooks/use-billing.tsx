import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  type AccessMode,
  type BillingProfile,
  FREE_WELCOME_CREDITS,
  describePlan,
} from "@/lib/billing";
import { getByokKey } from "@/services/ai-service";

const emptyProfile = (id: string): BillingProfile => ({
  id,
  plan: "free",
  credits_balance: FREE_WELCOME_CREDITS,
  credits_lifetime_used: 0,
});

export function useBilling() {
  const { user, isGuest } = useAuth();
  const [profile, setProfile] = useState<BillingProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user || isGuest) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id,email,plan,credits_balance,credits_lifetime_used,stripe_customer_id,stripe_subscription_id,subscription_status,current_period_end"
      )
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.warn("[billing]", error.message);
      setProfile(emptyProfile(user.id));
    } else if (!data) {
      await supabase.from("profiles").insert({
        id: user.id,
        email: user.email,
        plan: "free",
        credits_balance: FREE_WELCOME_CREDITS,
      });
      const { data: again } = await supabase
        .from("profiles")
        .select(
          "id,email,plan,credits_balance,credits_lifetime_used,stripe_customer_id,stripe_subscription_id,subscription_status,current_period_end"
        )
        .eq("id", user.id)
        .maybeSingle();
      setProfile((again as BillingProfile) || emptyProfile(user.id));
    } else {
      setProfile(data as BillingProfile);
    }
    setLoading(false);
  }, [user, isGuest]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const byok = useMemo(() => Boolean(getByokKey()), [profile, user]);

  const accessMode: AccessMode = useMemo(() => {
    if (byok) return "byok";
    if (!user || isGuest) return "blocked";
    if ((profile?.credits_balance ?? 0) > 0) return "platform";
    return "blocked";
  }, [byok, user, isGuest, profile]);

  const remaining = byok ? Infinity : profile?.credits_balance ?? 0;

  return {
    profile,
    loading,
    refresh,
    byok,
    accessMode,
    remaining,
    planLabel: byok ? "BYOK" : describePlan(profile?.plan || "free"),
    isPro:
      !byok &&
      profile?.plan === "pro" &&
      ["active", "trialing"].includes(String(profile?.subscription_status || "")),
  };
}
