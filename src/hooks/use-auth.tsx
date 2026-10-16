import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase, clearBrokenAuthSession } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";

const GUEST_STORAGE_KEY = "asooju_mock_user";
const PENDING_VERIFY_KEY = "asooju_pending_verify";

function friendlyAuthError(error: any, fallback: string): string {
  const raw = String(error?.message || error?.msg || fallback);
  if (/rate.?limit|over_email_send_rate_limit/i.test(raw)) {
    return "Email rate limit hit (Supabase free tier is ~2–4 emails/hour). Wait a bit, or turn off Confirm email for local testing, or add custom SMTP.";
  }
  if (/token has expired|invalid.*token|otp_expired|otp_disabled/i.test(raw)) {
    return "That code is invalid or expired. Enter every digit from the email (often 8 digits). Resend if needed — Confirm signup template must use {{ .Token }}.";
  }
  if (/user already registered|already.?been.?registered/i.test(raw)) {
    return "That email is already registered — sign in instead, or use a different email.";
  }
  if (/invalid api key|jwt|publishable/i.test(raw)) {
    return "Supabase API key rejected. Put the anon/public key from Project Settings → API into VITE_SUPABASE_PUBLISHABLE_KEY and restart the dev server.";
  }
  return raw || fallback;
}

export type SignupResult = {
  needsEmailVerification: boolean;
  email: string;
};

export type OnboardingPayload = {
  displayName: string;
  role: string;
  goal: string;
};

function readPendingVerify(): { email: string; fullName?: string } | null {
  try {
    const raw = sessionStorage.getItem(PENDING_VERIFY_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writePendingVerify(email: string, fullName?: string) {
  sessionStorage.setItem(
    PENDING_VERIFY_KEY,
    JSON.stringify({ email: email.trim().toLowerCase(), fullName })
  );
}

function clearPendingVerify() {
  sessionStorage.removeItem(PENDING_VERIFY_KEY);
}

export function needsOnboarding(user: User | null, isGuest: boolean): boolean {
  if (!user || isGuest) return false;
  if (user.app_metadata?.isGuest) return false;
  // Only explicit false (new signups). Legacy accounts with undefined keep working.
  return user.user_metadata?.onboarding_complete === false;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [gitHubToken, setGitHubToken] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      await clearBrokenAuthSession();
      if (!mounted) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      if (session?.user) {
        setUser(session.user);
        setGitHubToken(session.provider_token ?? null);
        localStorage.removeItem(GUEST_STORAGE_KEY);
      } else {
        const stored = localStorage.getItem(GUEST_STORAGE_KEY);
        if (stored) {
          try {
            setUser(JSON.parse(stored));
          } catch {
            localStorage.removeItem(GUEST_STORAGE_KEY);
          }
        }
      }
      setLoading(false);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        setGitHubToken(session.provider_token ?? null);
        localStorage.removeItem(GUEST_STORAGE_KEY);
      } else {
        setGitHubToken(null);
        const stored = localStorage.getItem(GUEST_STORAGE_KEY);
        if (stored) {
          try {
            setUser(JSON.parse(stored));
          } catch {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const isGuest = useMemo(
    () =>
      !!user &&
      (user.app_metadata?.isGuest === true || user.id === "guest-user-000"),
    [user]
  );

  const isAdmin = useMemo(() => {
    if (!user || isGuest) return false;
    // Security control: app_metadata.role only (server-set). Never trust email allowlists.
    return user.app_metadata?.role === "admin";
  }, [user, isGuest]);

  const mustOnboard = useMemo(() => needsOnboarding(user, isGuest), [user, isGuest]);

  const loginWithEmail = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        // Unverified accounts → send them to code entry (not a magic link)
        if (/email not confirmed|not confirmed/i.test(error.message)) {
          writePendingVerify(email);
          const err = new Error("EMAIL_NOT_CONFIRMED");
          (err as any).code = "EMAIL_NOT_CONFIRMED";
          (err as any).email = email.trim().toLowerCase();
          throw err;
        }
        throw error;
      }
      toast.success("Signed in");
    } catch (error: any) {
      if (error?.code === "EMAIL_NOT_CONFIRMED" || error?.message === "EMAIL_NOT_CONFIRMED") {
        throw error;
      }
      toast.error("Login failed", { description: error.message });
      throw error;
    }
  };

  /**
   * Password signup. If Supabase requires email confirm, we expect an OTP email
   * (template must use {{ .Token }}, not a confirmation link — see SETUP.md).
   */
  const signUpWithEmail = async (
    email: string,
    password: string,
    options?: { data?: Record<string, unknown> }
  ): Promise<SignupResult> => {
    const normalized = email.trim().toLowerCase();
    try {
      // Stale JWTs in localStorage make signUp return "Token has expired or is invalid"
      await clearBrokenAuthSession();
      await supabase.auth.signOut({ scope: "local" });

      const { data, error } = await supabase.auth.signUp({
        email: normalized,
        password,
        options: {
          data: {
            ...options?.data,
            onboarding_complete: false,
          },
          emailRedirectTo: undefined,
        },
      });
      if (error) throw error;

      const fullName =
        typeof options?.data?.full_name === "string" ? options.data.full_name : undefined;

      // Immediate session = confirmations disabled (local/dev) → skip OTP
      if (data.session?.user) {
        clearPendingVerify();
        toast.success("Account created");
        return { needsEmailVerification: false, email: normalized };
      }

      // Fake success (no identities) = email already registered with confirmations on
      if (data.user && Array.isArray((data.user as any).identities) && (data.user as any).identities.length === 0) {
        const err = new Error("That email is already registered — sign in instead.");
        throw err;
      }

      writePendingVerify(normalized, fullName);
      toast.success("Check your email for the verification code");
      return { needsEmailVerification: true, email: normalized };
    } catch (error: any) {
      const msg = friendlyAuthError(error, "Signup failed");
      toast.error("Signup failed", { description: msg });
      const err = new Error(msg);
      throw err;
    }
  };

  const verifyEmailCode = async (email: string, token: string) => {
    const normalized = email.trim().toLowerCase();
    const code = token.replace(/\s/g, "");
    try {
      await clearBrokenAuthSession();

      // Prefer signup confirmation OTP; fall back to email OTP type
      let result = await supabase.auth.verifyOtp({
        email: normalized,
        token: code,
        type: "signup",
      });
      if (result.error) {
        result = await supabase.auth.verifyOtp({
          email: normalized,
          token: code,
          type: "email",
        });
      }
      if (result.error) throw result.error;
      clearPendingVerify();
      toast.success("Email verified");
      return result.data;
    } catch (error: any) {
      const msg = friendlyAuthError(error, "Invalid or expired code");
      toast.error("Verification failed", { description: msg });
      throw new Error(msg);
    }
  };

  const resendEmailCode = async (email: string) => {
    const normalized = email.trim().toLowerCase();
    try {
      await clearBrokenAuthSession();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: normalized,
      });
      if (error) throw error;
      writePendingVerify(normalized);
      toast.success("New code sent");
    } catch (error: any) {
      const msg = friendlyAuthError(error, "Could not resend code");
      toast.error("Could not resend code", { description: msg });
      throw new Error(msg);
    }
  };

  const completeOnboarding = async (payload: OnboardingPayload) => {
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: {
          full_name: payload.displayName.trim(),
          role_preference: payload.role,
          goal: payload.goal,
          onboarding_complete: true,
          onboarding_completed_at: new Date().toISOString(),
        },
      });
      if (error) throw error;
      if (data.user) setUser(data.user);
      toast.success("You’re set — welcome aboard");
      return data.user;
    } catch (error: any) {
      toast.error("Could not save onboarding", { description: error.message });
      throw error;
    }
  };

  const getPendingVerifyEmail = useCallback(() => readPendingVerify()?.email || "", []);

  const loginWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/onboarding` },
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error("Google Authentication failed", { description: error.message });
    }
  };

  const loginWithGitHub = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: `${window.location.origin}/auth/onboarding`,
          scopes: "repo",
        },
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error("GitHub Authentication failed", { description: error.message });
    }
  };

  const loginAsGuest = () => {
    const mockUser = {
      id: "guest-user-000",
      email: "guest@local.dev",
      user_metadata: { full_name: "Guest", onboarding_complete: true },
      app_metadata: { isGuest: true },
    } as any;
    setUser(mockUser);
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(mockUser));
    toast.success("Guest mode — projects save locally only");
  };

  const requestPasswordReset = async (email: string) => {
    const normalized = email.trim().toLowerCase();
    if (!normalized.includes("@")) {
      throw new Error("Enter a valid email");
    }
    try {
      const redirectTo = `${window.location.origin}/auth/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(normalized, {
        redirectTo,
      });
      if (error) throw error;
      toast.success("Check your email", {
        description: "We sent a password reset link if that account exists.",
      });
    } catch (error: any) {
      const msg = friendlyAuthError(error, "Could not send reset email");
      toast.error("Reset failed", { description: msg });
      throw new Error(msg);
    }
  };

  const updatePassword = async (password: string) => {
    const next = String(password || "");
    if (next.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }
    try {
      const { error } = await supabase.auth.updateUser({ password: next });
      if (error) throw error;
      toast.success("Password updated");
    } catch (error: any) {
      const msg = friendlyAuthError(error, "Could not update password");
      toast.error("Update failed", { description: msg });
      throw new Error(msg);
    }
  };

  const logout = async () => {
    localStorage.removeItem(GUEST_STORAGE_KEY);
    clearPendingVerify();
    setUser(null);
    setGitHubToken(null);
    try {
      await supabase.auth.signOut();
    } catch {
      /* guest */
    }
    toast.success("Signed out");
  };

  return {
    user,
    loading,
    gitHubToken,
    isGuest,
    isAdmin,
    mustOnboard,
    loginWithEmail,
    signUpWithEmail,
    verifyEmailCode,
    resendEmailCode,
    completeOnboarding,
    getPendingVerifyEmail,
    requestPasswordReset,
    updatePassword,
    loginWithGoogle,
    loginWithGitHub,
    loginAsGuest,
    logout,
  };
};
