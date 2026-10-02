import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (typeof window !== "undefined") {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    console.error(
      "[ShipKernel] Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env — restart vite after fixing."
    );
  } else if (
    !/^eyJ/.test(SUPABASE_PUBLISHABLE_KEY) &&
    !/^sb_publishable_/.test(SUPABASE_PUBLISHABLE_KEY)
  ) {
    console.error(
      "[ShipKernel] VITE_SUPABASE_PUBLISHABLE_KEY looks wrong. Use the anon/public key from Supabase → Project Settings → API (JWT eyJ… or sb_publishable_…)."
    );
  }
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});

/** Drop stale/broken sessions so signup/login aren't poisoned by an expired JWT. */
export async function clearBrokenAuthSession() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      await supabase.auth.signOut({ scope: "local" });
      return;
    }
    if (!data.session) return;
    const { error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      await supabase.auth.signOut({ scope: "local" });
    }
  } catch {
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      /* ignore */
    }
  }
}
