import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertCircle, ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/ui/logo";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

/**
 * Landing page for Supabase recovery email links.
 * Redirect URL must be allowlisted: {origin}/auth/reset-password
 */
export default function ResetPassword() {
  const { updatePassword, mustOnboard } = useAuth();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let mounted = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY" || (session && event === "SIGNED_IN")) {
        setReady(true);
        setChecking(false);
      }
    });

    void (async () => {
      // Hash tokens from the email link are consumed by the client; session appears shortly.
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      if (data.session) {
        setReady(true);
      }
      setChecking(false);
    })();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setBusy(true);
    try {
      await updatePassword(password);
      setDone(true);
      window.setTimeout(() => {
        navigate(mustOnboard ? "/auth/onboarding" : "/app", { replace: true });
      }, 800);
    } catch (err: any) {
      setError(err?.message || "Could not update password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white flex items-center justify-center p-6 relative overflow-hidden">
      <div className="fixed inset-0 bg-noise opacity-[0.02] pointer-events-none" />
      <Link
        to="/auth/login"
        className="absolute top-10 left-10 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-muted-foreground hover:text-white transition-colors group z-20"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Sign in
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[400px] relative z-10"
      >
        <Logo showText className="mb-6" />
        <h1 className="text-3xl font-black tracking-tighter uppercase mb-2">
          New password
        </h1>
        <p className="text-muted-foreground text-sm mb-8">
          Choose a new password for your Asooju account.
        </p>

        {checking ? (
          <div className="flex items-center gap-2 text-sm text-white/40">
            <Loader2 className="w-4 h-4 animate-spin" /> Verifying reset link…
          </div>
        ) : !ready ? (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 space-y-3">
            <p className="text-sm text-amber-100/90">
              This reset link is missing or expired. Request a new one from the
              sign-in page.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link to="/auth/forgot-password">Request new link</Link>
            </Button>
          </div>
        ) : done ? (
          <p className="text-sm text-white/60">Password updated — redirecting…</p>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
                New password
              </Label>
              <div className="relative">
                <Input
                  type={show ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 bg-white/5 border-white/5 rounded-xl px-4 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
                >
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
                Confirm
              </Label>
              <Input
                type={show ? "text" : "password"}
                required
                minLength={6}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="h-12 bg-white/5 border-white/5 rounded-xl px-4"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={busy}
              className="w-full h-12 rounded-xl bg-white text-black hover:bg-white/90 font-black uppercase tracking-widest text-[13px]"
            >
              {busy ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : (
                "Update password"
              )}
            </Button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
