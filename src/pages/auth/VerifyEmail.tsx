import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertCircle, ArrowLeft, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { useAuth } from "@/hooks/use-auth";

/** Supabase often sends 8-digit OTPs (sometimes 6) */
const OTP_MIN = 6;
const OTP_MAX = 8;

export default function VerifyEmail() {
  const { verifyEmailCode, resendEmailCode, getPendingVerifyEmail, user, mustOnboard } =
    useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const submittedRef = useRef("");

  useEffect(() => {
    const fromQuery = params.get("email") || "";
    const pending = getPendingVerifyEmail();
    setEmail((fromQuery || pending || "").trim().toLowerCase());
  }, [params, getPendingVerifyEmail]);

  useEffect(() => {
    if (user && !(user as any).app_metadata?.isGuest) {
      navigate(mustOnboard ? "/auth/onboarding" : "/app", { replace: true });
    }
  }, [user, mustOnboard, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = async (value?: string) => {
    const token = (value ?? code).replace(/\D/g, "");
    if (!email || token.length < OTP_MIN) {
      setError(`Enter the full code from your email (${OTP_MIN}–${OTP_MAX} digits).`);
      return;
    }
    if (submittedRef.current === token && isLoading) return;
    submittedRef.current = token;
    setIsLoading(true);
    setError(null);
    try {
      await verifyEmailCode(email, token);
      navigate("/auth/onboarding", { replace: true });
    } catch (e: any) {
      setError(e?.message || "That code didn’t work. Try again or resend.");
      setCode("");
      submittedRef.current = "";
      inputRef.current?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const resend = async () => {
    if (!email || cooldown > 0) return;
    setResending(true);
    setError(null);
    try {
      await resendEmailCode(email);
      setCooldown(45);
    } catch (e: any) {
      setError(e?.message || "Could not resend.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white flex items-center justify-center p-6 relative overflow-hidden">
      <div className="fixed inset-0 bg-noise opacity-[0.02] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[640px] h-[640px] bg-primary/5 blur-[140px] pointer-events-none" />

      <Link
        to="/auth/signup"
        className="absolute top-10 left-10 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-muted-foreground hover:text-white transition-colors group z-20"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[420px] relative z-10"
      >
        <Logo showText className="mb-8 justify-center" />
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8 text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.06] border border-white/[0.08]">
            <Mail className="w-5 h-5 text-white/70" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight mb-2">Enter your code</h1>
          <p className="text-sm text-white/45 leading-relaxed mb-1">
            Paste the full code from your email (usually 8 digits)
          </p>
          <p className="text-sm font-medium text-white/80 mb-8 break-all">
            {email || "your email"}
          </p>

          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={OTP_MAX}
            value={code}
            disabled={isLoading}
            placeholder="Paste code e.g. 66833223"
            onChange={(e) => {
              const next = e.target.value.replace(/\D/g, "").slice(0, OTP_MAX);
              setCode(next);
              setError(null);
              if (next.length === OTP_MAX) void submit(next);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void submit();
              }
            }}
            className="mb-6 flex h-14 w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 text-center text-2xl tracking-[0.35em] font-mono text-white placeholder:text-white/25 placeholder:tracking-normal placeholder:text-sm outline-none focus:border-white/35 focus:ring-1 focus:ring-white/20 disabled:opacity-50"
          />

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-left text-xs text-red-200/90">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <Button
            type="button"
            disabled={isLoading || code.length < OTP_MIN}
            onClick={() => void submit()}
            className="w-full h-11 rounded-xl bg-white text-black hover:bg-white/90 font-semibold"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verifying…
              </>
            ) : (
              "Verify email"
            )}
          </Button>

          <div className="mt-5 text-[12px] text-white/40">
            Didn’t get it?{" "}
            <button
              type="button"
              disabled={resending || cooldown > 0 || !email}
              onClick={() => void resend()}
              className="text-white/70 hover:text-white underline-offset-2 hover:underline disabled:opacity-40"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : resending ? "Sending…" : "Resend code"}
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] text-white/30">
          Example: paste <span className="font-mono text-white/45">66833223</span> — all digits.
        </p>
      </motion.div>
    </div>
  );
}
