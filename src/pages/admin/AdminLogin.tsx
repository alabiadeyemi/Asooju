import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  clearAdminSession,
  hasAdminSession,
  writeAdminSession,
} from "@/lib/admin-session";

/**
 * Operator admin login — ADMIN_EMAIL / ADMIN_PASSWORD from server env.
 * Does not use (or change) the customer's Supabase Auth password.
 */
export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hasAdminSession()) navigate("/admin", { replace: true });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || "Admin sign-in failed");
      writeAdminSession(payload.token, payload.email || email.trim().toLowerCase());
      navigate("/admin", { replace: true });
    } catch (err: any) {
      clearAdminSession();
      setError(err?.message || "Admin sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Admin sign-in</h1>
            <p className="text-xs text-white/40">
              Operator password from env — not the user account password
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-[10px] uppercase tracking-widest text-white/40">Email</Label>
            <Input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-white/[0.04] border-white/10"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] uppercase tracking-widest text-white/40">
              Admin password
            </Label>
            <Input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-white/[0.04] border-white/10"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-200/90">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={busy}
            className="w-full h-11 rounded-xl bg-white text-black hover:bg-white/90 font-semibold"
          >
            {busy ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Checking…
              </>
            ) : (
              "Enter admin"
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-[11px] text-white/30">
          <Link to="/auth/login" className="hover:text-white/50 underline-offset-2 hover:underline">
            Builder login
          </Link>
          {" · "}
          Set{" "}
          <code className="text-white/45">ADMIN_EMAIL</code> /{" "}
          <code className="text-white/45">ADMIN_PASSWORD</code> in server env
        </p>
      </div>
    </div>
  );
}
