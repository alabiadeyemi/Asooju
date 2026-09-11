import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/ui/logo";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

const ROLES = [
  { id: "founder", label: "Founder" },
  { id: "engineer", label: "Engineer" },
  { id: "designer", label: "Designer" },
  { id: "agency", label: "Agency" },
  { id: "other", label: "Other" },
];

const GOALS = [
  { id: "mvp", label: "Ship an MVP" },
  { id: "client", label: "Client work" },
  { id: "internal", label: "Internal tools" },
  { id: "explore", label: "Explore & learn" },
];

export default function Onboarding() {
  const { user, loading, isGuest, mustOnboard, completeOnboarding } = useAuth();
  const navigate = useNavigate();
  const defaultName = useMemo(() => {
    const meta = user?.user_metadata || {};
    return (
      meta.full_name ||
      [meta.first_name, meta.last_name].filter(Boolean).join(" ") ||
      user?.email?.split("@")[0] ||
      ""
    );
  }, [user]);

  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("founder");
  const [goal, setGoal] = useState("mvp");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (defaultName) setDisplayName(defaultName);
  }, [defaultName]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020202] flex items-center justify-center">
        <Loader2 className="w-7 h-7 text-white/40 animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth/login" replace />;
  if (isGuest || !mustOnboard) return <Navigate to="/app" replace />;

  const finish = async () => {
    if (!displayName.trim()) {
      setError("Add a display name to continue.");
      setStep(0);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await completeOnboarding({ displayName, role, goal });
      navigate("/app", { replace: true });
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white flex items-center justify-center p-6 relative overflow-hidden">
      <div className="fixed inset-0 bg-noise opacity-[0.02] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.04),_transparent_55%)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[480px] relative z-10"
      >
        <div className="flex items-center justify-between mb-8">
          <Logo showText />
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={cn(
                  "h-1 w-6 rounded-full transition-colors",
                  i <= step ? "bg-white/70" : "bg-white/15"
                )}
              />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8">
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Welcome</h1>
                <p className="text-sm text-white/45 mt-1.5">
                  How should we address you in the workspace?
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-[0.16em] text-white/40">
                  Display name
                </Label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Alex Rivera"
                  className="h-11 bg-white/[0.04] border-white/10 rounded-xl"
                  autoFocus
                />
              </div>
              <Button
                type="button"
                className="w-full h-11 rounded-xl bg-white text-black hover:bg-white/90"
                onClick={() => {
                  if (!displayName.trim()) {
                    setError("Add a display name to continue.");
                    return;
                  }
                  setError(null);
                  setStep(1);
                }}
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Your role</h1>
                <p className="text-sm text-white/45 mt-1.5">
                  Helps us tune defaults — you can change this later.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRole(r.id)}
                    className={cn(
                      "rounded-xl border px-3 py-3 text-left text-sm transition-colors",
                      role === r.id
                        ? "border-white/30 bg-white/[0.08] text-white"
                        : "border-white/[0.08] bg-transparent text-white/55 hover:border-white/15"
                    )}
                  >
                    <span className="flex items-center justify-between gap-2">
                      {r.label}
                      {role === r.id && <Check className="w-3.5 h-3.5" />}
                    </span>
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 rounded-xl text-white/50"
                  onClick={() => setStep(0)}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  className="flex-1 h-11 rounded-xl bg-white text-black hover:bg-white/90"
                  onClick={() => setStep(2)}
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Primary goal</h1>
                <p className="text-sm text-white/45 mt-1.5">
                  We’ll surface the right starting path on your dashboard.
                </p>
              </div>
              <div className="space-y-2">
                {GOALS.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setGoal(g.id)}
                    className={cn(
                      "w-full rounded-xl border px-4 py-3 text-left text-sm transition-colors flex items-center justify-between",
                      goal === g.id
                        ? "border-white/30 bg-white/[0.08] text-white"
                        : "border-white/[0.08] text-white/55 hover:border-white/15"
                    )}
                  >
                    {g.label}
                    {goal === g.id && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 rounded-xl text-white/50"
                  onClick={() => setStep(1)}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  disabled={saving}
                  className="flex-1 h-11 rounded-xl bg-white text-black hover:bg-white/90"
                  onClick={() => void finish()}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      Enter workspace
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {error && (
            <p className="mt-4 text-xs text-red-300/90 text-center">{error}</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
