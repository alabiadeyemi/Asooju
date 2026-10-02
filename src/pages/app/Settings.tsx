import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation, Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  User, CreditCard, Key, Cpu, Trash2, ExternalLink,
  Plus, Eye, EyeOff, Check, ShieldCheck, Zap,
  Activity, Globe, Lock, BrainCircuit, ChevronRight, Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Logo } from "@/components/ui/logo";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { validateOpenAIKey, validateGrokKey, validateGeminiKey, validateClaudeKey, validateDeepSeekKey, probeProvider, providerIdFromLabel } from "@/services/ai-service";
import { ApiKeyTestButton } from "@/components/app/ApiKeyTestButton";
import { useAuth } from "@/hooks/use-auth";
import { useBilling } from "@/hooks/use-billing";
import { useCheckout } from "@/hooks/use-checkout";
import { FREE_WELCOME_CREDITS, PRO_MONTHLY_CREDITS, PRO_PRICE_LABEL } from "@/lib/billing";
import { supabase } from "@/integrations/supabase/client";

const tabs = [
  { id: "account", label: "My Account", icon: User, href: "/app/settings" },
  { id: "billing", label: "Billing", icon: CreditCard, href: "/app/settings/billing" },
  { id: "keys", label: "API Keys", icon: Key, href: "/app/settings/keys" },
  { id: "providers", label: "AI Models", icon: BrainCircuit, href: "/app/settings/providers" },
];

const providers = [
  { id: "openai", name: "OpenAI", desc: "GPT models for strong coding", latency: "Fast", reliability: "High" },
  { id: "gemini", name: "Google Gemini", desc: "Fast multimodal generation", latency: "Ultra", reliability: "High" },
  { id: "claude", name: "Anthropic Claude", desc: "Great for complex refactors", latency: "Medium", reliability: "High" },
  { id: "grok", name: "xAI Grok", desc: "Real-time knowledge focus", latency: "Fast", reliability: "High" },
  { id: "deepseek", name: "DeepSeek", desc: "Strong coding at low cost", latency: "Fast", reliability: "High" },
  { id: "auto", name: "Pick for me", desc: "Uses OpenAI when available", latency: "Variable", reliability: "Smart" },
];

const Settings = () => {
  const location = useLocation();
  const { user, isGuest, logout, updatePassword } = useAuth();
  const { profile, loading: billingLoading, remaining, planLabel, byok, isPro, refresh: refreshBilling } = useBilling();
  const { startCheckout, openPortal, isProcessing } = useCheckout();
  const [displayName, setDisplayName] = useState(
    () => user?.user_metadata?.full_name || user?.email?.split("@")[0] || ""
  );
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(() =>
    localStorage.getItem('shipkernel_active_provider') || "openai"
  );

  useEffect(() => {
    setDisplayName(user?.user_metadata?.full_name || user?.email?.split("@")[0] || "");
  }, [user]);

  useEffect(() => {
    localStorage.setItem('shipkernel_active_provider', selectedProvider);
  }, [selectedProvider]);

  const [showKey, setShowKey] = useState<Record<string, boolean>>({});

  // Real Key Management
  const [keys, setKeys] = useState(() => {
    const saved = localStorage.getItem('shipkernel_keys');
    if (saved) return JSON.parse(saved);

    // Migration/Initial check for existing OpenAI key
    const existingOpenAI = localStorage.getItem('shipkernel_openai_key');
    if (existingOpenAI) {
      const initialKeys = [{
        id: "openai-init",
        provider: "OpenAI",
        name: "Default OpenAI Key",
        value: existingOpenAI,
        added: "Recently"
      }];
      localStorage.setItem('shipkernel_keys', JSON.stringify(initialKeys));
      return initialKeys;
    }
    return [];
  });

  const [isAddingKey, setIsAddingKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [newKeyData, setNewKeyData] = useState({ provider: "openai", name: "", value: "" });

  const handleAddKey = async () => {
    const cleanValue = newKeyData.value.trim().replace(/[^\x00-\x7F]/g, "");
    if (!cleanValue || !newKeyData.name) {
      toast.error("Missing Information", {
        description: "Please provide both a label and the secret key."
      });
      return;
    }

    if (newKeyData.provider === "openai" && !cleanValue.startsWith("sk-")) {
      toast.error("Invalid Key Format", {
        description: "OpenAI keys must start with 'sk-'. Please check your input."
      });
      return;
    }

    setIsValidating(true);
    let validation: { success: boolean; error?: string; model?: string } = { success: true };

    if (newKeyData.provider === "openai") {
      validation = await validateOpenAIKey(cleanValue);
    } else if (newKeyData.provider === "grok") {
      validation = await validateGrokKey(cleanValue);
    } else if (newKeyData.provider === "gemini") {
      validation = await validateGeminiKey(cleanValue);
    } else if (newKeyData.provider === "claude") {
      validation = await validateClaudeKey(cleanValue);
    } else if (newKeyData.provider === "deepseek") {
      validation = await validateDeepSeekKey(cleanValue);
    } else {
      validation = await probeProvider(newKeyData.provider, cleanValue);
    }

    if (!validation.success) {
      console.warn("Validation failed but allowing save:", validation.error);
      toast.warning("Validation Warning", {
        description: "Your key couldn't be automatically verified, but we saved it anyway. It might still work during generation."
      });
    } else if (validation.model) {
      toast.success(`Verified · ${validation.model}`);
    }

    const providerLabel =
      newKeyData.provider === "openai" ? "OpenAI" :
      newKeyData.provider === "gemini" ? "Gemini" :
      newKeyData.provider === "claude" ? "Claude" :
      newKeyData.provider === "deepseek" ? "DeepSeek" : "Grok";

    const newKey = {
      id: Math.random().toString(36).substr(2, 9),
      provider: providerLabel,
      name: newKeyData.name,
      value: cleanValue,
      added: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    };

    const updatedKeys = [...keys, newKey];
    setKeys(updatedKeys);
    localStorage.setItem('shipkernel_keys', JSON.stringify(updatedKeys));

    if (newKeyData.provider === "openai") {
      localStorage.setItem('shipkernel_openai_key', cleanValue);
    } else if (newKeyData.provider === "gemini") {
      localStorage.setItem('shipkernel_gemini_key', cleanValue);
    } else if (newKeyData.provider === "grok") {
      localStorage.setItem('shipkernel_grok_key', cleanValue);
    } else if (newKeyData.provider === "claude") {
      localStorage.setItem('shipkernel_claude_key', cleanValue);
    } else if (newKeyData.provider === "deepseek") {
      localStorage.setItem('shipkernel_deepseek_key', cleanValue);
    }

    setIsValidating(false);
    setIsAddingKey(false);
    setNewKeyData({ provider: "openai", name: "", value: "" });
    if (validation.success) {
      toast.success("API Key Verified & Added", {
        description: validation.model
          ? `Auto-selected model: ${validation.model}`
          : "You can now use this key for AI generation."
      });
    }
  };

  const handleDeleteKey = (id: string) => {
    const removed = keys.find((k: any) => k.id === id);
    const filtered = keys.filter((k: any) => k.id !== id);
    setKeys(filtered);
    localStorage.setItem("shipkernel_keys", JSON.stringify(filtered));

    if (removed) {
      const STORAGE_BY_PROVIDER: Record<string, string> = {
        openai: "shipkernel_openai_key",
        gemini: "shipkernel_gemini_key",
        grok: "shipkernel_grok_key",
        claude: "shipkernel_claude_key",
        deepseek: "shipkernel_deepseek_key",
      };
      const provider = String(removed.provider || "").toLowerCase();
      const normalized =
        provider === "google gemini"
          ? "gemini"
          : provider === "anthropic claude"
            ? "claude"
            : provider === "xai grok"
              ? "grok"
              : provider;
      const slot = STORAGE_BY_PROVIDER[normalized];
      if (slot && localStorage.getItem(slot) === removed.value) {
        localStorage.removeItem(slot);
      }
    }

    toast.info("Key Deleted");
  };

  const toggleVisibility = (id: string) => {
    setShowKey(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const currentTab = location.pathname === "/app/settings/billing"
    ? "billing"
    : location.pathname === "/app/settings/keys"
      ? "keys"
      : location.pathname === "/app/settings/providers"
        ? "providers"
        : "account";

  return (
    <div className="min-h-screen bg-[#020202] text-white p-6 lg:p-12 selection:bg-primary/30 relative">
      <div className="fixed inset-0 bg-noise opacity-[0.02] pointer-events-none" />
      <div className="absolute top-0 right-0 w-[800px] h-[500px] bg-primary/5 blur-[120px] pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10">
        <div className="space-y-2 mb-12">
          <h1 className="text-4xl font-black uppercase tracking-tighter text-white">Settings</h1>
          <p className="text-muted-foreground/60 text-sm">Manage your account and preferences.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Sidebar Tabs */}
          <div className="lg:col-span-3 space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;
              return (
                <Link
                  key={tab.id}
                  to={tab.href}
                  className={cn(
                    "flex items-center gap-3 px-5 py-4 rounded-2xl text-[11px] font-bold uppercase tracking-widest transition-all group relative overflow-hidden",
                    isActive
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "text-muted-foreground/50 hover:text-white hover:bg-white/5 border border-transparent"
                  )}
                >
                  <Icon className={cn("h-4 w-4 transition-transform group-hover:scale-110", isActive ? "text-primary" : "text-muted-foreground/30")} />
                  {tab.label}
                  {isActive && (
                    <motion.div layoutId="activeTab" className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-full" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Settings Panels */}
          <div className="lg:col-span-9 space-y-8">
            <AnimatePresence mode="wait">
              {/* Account Hub */}
              {currentTab === "account" && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  <div className="rounded-[32px] border border-white/5 bg-[#0A0A0B]/50 p-8 backdrop-blur-3xl space-y-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
                      <User className="w-32 h-32" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white mb-2">My Profile</h2>
                      <p className="text-sm text-muted-foreground/50">Your personal details and profile info.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60 ml-1">Email Address</Label>
                        <Input
                          value={isGuest ? "guest@local.dev" : (user?.email || "")}
                          disabled
                          className="h-12 bg-white/5 border-white/5 rounded-xl text-white/40 font-mono"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60 ml-1">Display name</Label>
                        <Input
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          disabled={isGuest}
                          className="h-12 bg-white/5 border-white/10 rounded-xl focus-visible:ring-primary/20"
                        />
                      </div>
                    </div>
                    <Button
                      variant="hero"
                      className="rounded-xl px-10 h-11 bg-white text-black hover:bg-white/90"
                      disabled={isGuest}
                      onClick={async () => {
                        if (isGuest) {
                          toast.message("Guest accounts can’t update a cloud profile");
                          return;
                        }
                        const { error } = await supabase.auth.updateUser({
                          data: { full_name: displayName },
                        });
                        if (error) toast.error(error.message);
                        else toast.success("Profile updated");
                      }}
                    >
                      Save Profile
                    </Button>
                  </div>

                  {!isGuest && (
                    <div className="rounded-[32px] border border-white/5 bg-[#0A0A0B]/50 p-8 backdrop-blur-3xl space-y-6">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                          <Lock className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-white mb-1">Change password</h2>
                          <p className="text-sm text-muted-foreground/50">
                            Update the password for {user?.email}. OAuth-only accounts may need to set one here first.
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60 ml-1">
                            New password
                          </Label>
                          <div className="relative">
                            <Input
                              type={showPw ? "text" : "password"}
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              minLength={6}
                              autoComplete="new-password"
                              className="h-12 bg-white/5 border-white/10 rounded-xl pr-12"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPw((s) => !s)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
                            >
                              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60 ml-1">
                            Confirm
                          </Label>
                          <Input
                            type={showPw ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            minLength={6}
                            autoComplete="new-password"
                            className="h-12 bg-white/5 border-white/10 rounded-xl"
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="hero"
                        className="rounded-xl px-10 h-11 bg-white text-black hover:bg-white/90"
                        disabled={pwBusy || !newPassword}
                        onClick={async () => {
                          if (newPassword !== confirmPassword) {
                            toast.error("Passwords do not match");
                            return;
                          }
                          if (newPassword.length < 6) {
                            toast.error("Password must be at least 6 characters");
                            return;
                          }
                          setPwBusy(true);
                          try {
                            await updatePassword(newPassword);
                            setNewPassword("");
                            setConfirmPassword("");
                          } catch {
                            /* toast in hook */
                          } finally {
                            setPwBusy(false);
                          }
                        }}
                      >
                        {pwBusy ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving…
                          </>
                        ) : (
                          "Update password"
                        )}
                      </Button>
                      <p className="text-[11px] text-muted-foreground/40">
                        Not signed in? Use{" "}
                        <Link to="/auth/forgot-password" className="text-primary/80 hover:underline">
                          Forgot password
                        </Link>{" "}
                        on the login page.
                      </p>
                    </div>
                  )}

                  <div className="rounded-[32px] border border-red-500/10 bg-red-500/5 p-8 backdrop-blur-3xl">
                    <h2 className="text-lg font-bold text-red-400 mb-2 uppercase tracking-tight">Danger Zone</h2>
                    <p className="text-sm text-red-300/40 mb-6">
                      {isGuest
                        ? "Clear local guest data and return to the homepage."
                        : "Sign out. Full account deletion isn’t wired yet — contact support to remove your Supabase user."}
                    </p>
                    <Button
                      variant="outline"
                      className="h-10 px-6 rounded-xl border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all text-[11px] font-bold uppercase tracking-widest"
                      onClick={async () => {
                        if (isGuest) {
                          localStorage.removeItem("shipkernel_local_projects");
                          localStorage.removeItem("shipkernel_project_chat");
                          await logout();
                          window.location.href = "/";
                          return;
                        }
                        toast.message("Account deletion isn’t available in-app yet", {
                          description: "Use Sign out, or delete the user in the Supabase Auth dashboard.",
                        });
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-2" />
                      {isGuest ? "Clear Guest Data" : "Delete Account"}
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Billing - credits + Stripe (Lovable-style) */}
              {currentTab === "billing" && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  <div className="rounded-[32px] border border-white/5 bg-gradient-to-br from-[#0A0A0B] to-[#050505] p-10 backdrop-blur-3xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[60px] group-hover:bg-primary/10 transition-colors" />
                    <div className="flex items-start justify-between mb-8">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/80 mb-2 block">
                          {byok ? "BYOK" : planLabel}
                        </span>
                        <h2 className="text-4xl font-black text-white tracking-tighter uppercase">
                          {byok ? "Your keys" : isPro ? "Pro Plan" : "Free Plan"}
                        </h2>
                        <p className="text-sm text-muted-foreground/50 mt-3 max-w-md">
                          {byok
                            ? "Platform credits are not used while a personal API key is active."
                            : isPro
                              ? `${PRO_MONTHLY_CREDITS} credits refresh each Stripe billing cycle.`
                              : `${FREE_WELCOME_CREDITS} platform prompts on our key, then upgrade or add BYOK.`}
                        </p>
                      </div>
                      <div className="h-14 w-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-2xl">
                        <Logo />
                      </div>
                    </div>

                    <div className="mb-8">
                      <div className="flex items-end justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                          {byok ? "Unlimited" : "Credits remaining"}
                        </span>
                        <span className="text-2xl font-black tabular-nums">
                          {billingLoading ? "…" : byok ? "∞" : remaining}
                        </span>
                      </div>
                      {!byok && (
                        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{
                              width: `${Math.min(
                                100,
                                ((profile?.credits_balance ?? 0) /
                                  (isPro ? PRO_MONTHLY_CREDITS : FREE_WELCOME_CREDITS)) *
                                  100
                              )}%`,
                            }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {!isPro && !byok && (
                        <Button
                          variant="hero"
                          className="rounded-xl px-8 h-12 text-[11px] font-bold uppercase tracking-widest"
                          disabled={isProcessing}
                          onClick={() => startCheckout("Pro", PRO_PRICE_LABEL)}
                        >
                          {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : `Upgrade · ${PRO_PRICE_LABEL}/mo`}
                        </Button>
                      )}
                      {(isPro || profile?.stripe_customer_id) && (
                        <Button
                          variant="hero-outline"
                          className="rounded-xl px-8 h-12 border-white/10 bg-white/5 text-[11px] font-bold uppercase tracking-widest"
                          disabled={isProcessing}
                          onClick={() => openPortal()}
                        >
                          Manage in Stripe
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        className="rounded-xl border-white/10 h-12 text-[11px] font-bold uppercase tracking-widest"
                        asChild
                      >
                        <Link to="/pricing">View plans</Link>
                      </Button>
                      <Button
                        variant="ghost"
                        className="rounded-xl h-12 text-[11px] uppercase tracking-widest text-white/40"
                        onClick={() => refreshBilling()}
                      >
                        Refresh
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-[32px] border border-white/5 bg-[#0A0A0B]/50 p-8">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center">
                        <Key className="w-5 h-5 text-muted-foreground/30" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-tight">Prefer BYOK?</h3>
                        <p className="text-xs text-muted-foreground/40 mt-1">
                          Add a Gemini / OpenAI / Claude key — unlimited local usage, no credit burn.
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" className="rounded-xl border-white/10" asChild>
                      <Link to="/app/settings/keys">API keys</Link>
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* API Keys */}
              {currentTab === "keys" && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  <div className="rounded-[32px] border border-white/5 bg-[#0A0A0B]/50 p-8 backdrop-blur-3xl">
                    <div className="flex items-center justify-between mb-8">
                      <h2 className="text-xl font-bold text-white tracking-tight uppercase">API Keys</h2>
                      <Button
                        size="sm"
                        variant="hero"
                        onClick={() => setIsAddingKey(true)}
                        className="rounded-xl bg-primary/20 text-primary border border-primary/20 hover:bg-primary hover:text-black text-[10px] font-bold uppercase tracking-widest px-4"
                      >
                        <Plus className="h-3.5 w-3.5 mr-2" />
                        New Key
                      </Button>
                    </div>
                    <div className="space-y-4">
                      {keys.length === 0 && (
                        <div className="text-center py-12 border border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
                          <Key className="w-8 h-8 text-muted-foreground/20 mx-auto mb-4" />
                          <p className="text-xs text-muted-foreground/40 font-medium tracking-tight">No keys added yet. Add a key to enable your AI assistant.</p>
                        </div>
                      )}
                      {keys.map((k: any) => (
                        <div key={k.id} className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.02] p-5 group hover:bg-white/[0.04] transition-all">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                              {k.provider === "OpenAI" ? <ShieldCheck className="w-5 h-5" /> : <Activity className="w-5 h-5" />}
                            </div>
                            <div>
                              <div className="text-[13px] font-bold text-white mb-0.5">{k.name} <span className="text-[10px] text-primary/40 font-black ml-2">{k.provider}</span></div>
                              <div className="text-[10px] text-muted-foreground/40 font-mono tracking-widest uppercase">
                                {showKey[k.id] ? k.value : k.value.substring(0, 4) + '••••••••' + k.value.slice(-4)} · <span className="text-[9px]">Added {k.added}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                            <ApiKeyTestButton
                              variant="compact"
                              provider={providerIdFromLabel(k.provider)}
                              apiKey={k.value}
                            />
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10" onClick={() => toggleVisibility(k.id)}>
                              {showKey[k.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:bg-red-400/10" onClick={() => handleDeleteKey(k.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* AI Models */}
              {currentTab === "providers" && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  <div className="rounded-[32px] border border-white/5 bg-[#0A0A0B]/50 p-8 backdrop-blur-3xl">
                    <h2 className="text-xl font-bold text-white mb-8 tracking-tight uppercase">Primary AI Assistant</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {providers.map((p) => {
                        const isActive = selectedProvider === p.id;
                        return (
                          <button
                            key={p.id}
                            onClick={() => setSelectedProvider(p.id)}
                            className={cn(
                              "relative group flex flex-col items-start p-6 rounded-[24px] border transition-all duration-300",
                              isActive
                                ? "border-primary/40 bg-primary/5 shadow-2xl shadow-primary/5"
                                : "border-white/5 bg-white/[0.02] hover:border-white/10"
                            )}
                          >
                            <div className="flex items-center justify-between w-full mb-4">
                              <h3 className={cn("text-sm font-bold uppercase tracking-widest", isActive ? "text-primary" : "text-white/70")}>{p.name}</h3>
                              {isActive && <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(34,197,94,1)] animate-pulse" />}
                            </div>
                            <p className="text-[11px] text-muted-foreground/40 text-left mb-6 leading-relaxed group-hover:text-muted-foreground/60 transition-colors">{p.desc}</p>
                            <div className="flex items-center justify-between w-full pt-4 border-t border-white/5">
                              <div className="flex flex-col items-start">
                                <span className="text-[8px] font-bold text-muted-foreground/30 uppercase tracking-[0.2em]">Health</span>
                                <span className="text-[10px] font-bold text-white/50">{p.reliability}</span>
                              </div>
                              <div className="flex flex-col items-end">
                                <span className="text-[8px] font-bold text-muted-foreground/30 uppercase tracking-[0.2em]">Speed</span>
                                <span className="text-[10px] font-bold text-white/50">{p.latency}</span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* New Key Dialog */}
      <Dialog open={isAddingKey} onOpenChange={setIsAddingKey}>
        <DialogContent className="bg-[#0A0A0B] border-white/5 text-white max-w-md rounded-[32px]">
          <DialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Key className="w-6 h-6 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight">Add API Key</DialogTitle>
            <DialogDescription className="text-muted-foreground/60 text-sm">
              Enter your provider details below. Your keys are stored locally.
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 space-y-6">
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Provider</Label>
              <Select
                value={newKeyData.provider}
                onValueChange={(v) => setNewKeyData(prev => ({ ...prev, provider: v }))}
              >
                <SelectTrigger className="bg-white/5 border-white/10 rounded-2xl h-12 text-[12px]">
                  <SelectValue placeholder="Select Provider" />
                </SelectTrigger>
                <SelectContent className="bg-[#0A0A0B] border-white/5 text-white rounded-2xl">
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="gemini">Google Gemini</SelectItem>
                  <SelectItem value="claude">Anthropic Claude</SelectItem>
                  <SelectItem value="grok">xAI Grok</SelectItem>
                  <SelectItem value="deepseek">DeepSeek</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Key Label</Label>
              <Input
                placeholder="e.g. Production Key"
                value={newKeyData.name}
                onChange={(e) => setNewKeyData(prev => ({ ...prev, name: e.target.value }))}
                className="bg-white/5 border-white/10 rounded-2xl h-12 focus:ring-primary/20 text-[12px]"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Secret Key</Label>
              <Input
                type="password"
                placeholder="sk-..."
                value={newKeyData.value}
                onChange={(e) => setNewKeyData(prev => ({ ...prev, value: e.target.value }))}
                className="bg-white/5 border-white/10 rounded-2xl h-12 focus:ring-primary/20 text-[12px]"
              />
              <ApiKeyTestButton
                provider={newKeyData.provider}
                apiKey={newKeyData.value}
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-3">
            <Button
              variant="ghost"
              onClick={() => setIsAddingKey(false)}
              disabled={isValidating}
              className="rounded-2xl h-11 px-8 text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddKey}
              disabled={isValidating}
              className="rounded-2xl h-11 px-8 text-[11px] font-black uppercase tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xl min-w-[140px]"
            >
              {isValidating ? (
                <>
                  <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : "Save Key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Settings;
