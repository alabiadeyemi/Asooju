import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertCircle, ArrowLeft, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/ui/logo";
import { useAuth } from "@/hooks/use-auth";

export default function ForgotPassword() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err: any) {
      setError(err?.message || "Could not send reset email");
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
        Back
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[400px] relative z-10"
      >
        <Logo showText className="mb-6" />
        <h1 className="text-3xl font-black tracking-tighter uppercase mb-2">
          Reset password
        </h1>
        <p className="text-muted-foreground text-sm mb-8">
          Enter your account email. We&apos;ll send a reset link if it exists.
        </p>

        {sent ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm text-white/80">
              <Mail className="w-4 h-4 text-primary" />
              Check your inbox
            </div>
            <p className="text-xs text-white/45 leading-relaxed">
              Open the link in the email to choose a new password. It may take a
              minute; check spam. Free Supabase email is rate-limited.
            </p>
            <Button asChild variant="outline" className="w-full mt-2">
              <Link to="/auth/login">Back to sign in</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
                Email
              </Label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
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
                  Sending…
                </>
              ) : (
                "Send reset link"
              )}
            </Button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
