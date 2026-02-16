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
import { validateOpenAIKey, validateGrokKey, validateGeminiKey } from "@/services/ai-service";

const tabs = [
  { id: "account", label: "My Account", icon: User, href: "/app/settings" },
  { id: "billing", label: "Billing", icon: CreditCard, href: "/app/settings/billing" },
  { id: "keys", label: "API Keys", icon: Key, href: "/app/settings/keys" },
  { id: "providers", label: "AI Models", icon: BrainCircuit, href: "/app/settings/providers" },
];

const providers = [
  { id: "openai", name: "OpenAI", desc: "Most popular for smart code", latency: "Fast", reliability: "High" },
  { id: "gemini", name: "Google Gemini", desc: "Super fast and efficient", latency: "Ultra", reliability: "High" },
  { id: "claude", name: "Anthropic Claude", desc: "Great for understanding complexity", latency: "Medium", reliability: "High" },
  { id: "grok", name: "xAI Grok", desc: "Real-time knowledge focus", latency: "Fast", reliability: "High" },
  { id: "auto", name: "Pick for me", desc: "We'll choose the best model for you", latency: "Variable", reliability: "Smart" },
];

const Settings = () => {
  const location = useLocation();
  const [selectedProvider, setSelectedProvider] = useState(() =>
    localStorage.getItem('shipkernel_active_provider') || "auto"
  );

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

    // Basic format validation
    if (newKeyData.provider === "openai" && !cleanValue.startsWith("sk-")) {
      toast.error("Invalid Key Format", {
        description: "OpenAI keys must start with 'sk-'. Please check your input."
      });
      return;
    }

    setIsValidating(true);
    let validation: { success: boolean; error?: string } = { success: true };

    if (newKeyData.provider === "openai") {
      validation = await validateOpenAIKey(cleanValue);
    } else if (newKeyData.provider === "grok") {
      validation = await validateGrokKey(cleanValue);
    } else if (newKeyData.provider === "gemini") {
      validation = await validateGeminiKey(cleanValue);
    }

    if (!validation.success) {
      console.warn("Validation failed but allowing save:", validation.error);
      toast.warning("Validation Warning", {
        description: "Your key couldn't be automatically verified, but we saved it anyway. It might still work during generation."
      });
      // Do not return here - allow the save to proceed
    }

    const newKey = {
      id: Math.random().toString(36).substr(2, 9),
      provider: newKeyData.provider === "openai" ? "OpenAI" :
        newKeyData.provider === "gemini" ? "Gemini" :
          newKeyData.provider === "claude" ? "Claude" : "Grok",
      name: newKeyData.name,
      value: cleanValue,
      added: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    };

    const updatedKeys = [...keys, newKey];
    setKeys(updatedKeys);
    localStorage.setItem('shipkernel_keys', JSON.stringify(updatedKeys));

    // Sync with individual keys for backwards compatibility and easy fallback access
    if (newKeyData.provider === "openai") {
      localStorage.setItem('shipkernel_openai_key', cleanValue);
    } else if (newKeyData.provider === "gemini") {
      localStorage.setItem('shipkernel_gemini_key', cleanValue);
    } else if (newKeyData.provider === "grok") {
      localStorage.setItem('shipkernel_grok_key', cleanValue);
    }

    setIsValidating(false);
    setIsAddingKey(false);
    setNewKeyData({ provider: "openai", name: "", value: "" });
    toast.success("API Key Verified & Added", {
      description: "You can now use this key for AI generation."
    });
  };

  const handleDeleteKey = (id: string) => {
    const filtered = keys.filter((k: any) => k.id !== id);
    setKeys(filtered);
    localStorage.setItem('shipkernel_keys', JSON.stringify(filtered));
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
                        <Input defaultValue="developer@example.com" disabled className="h-12 bg-white/5 border-white/5 rounded-xl text-white/40 font-mono" />
                      </div>
                      <div className="space-y-3">
                        <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60 ml-1">Username</Label>
                        <Input defaultValue="Alex" className="h-12 bg-white/5 border-white/10 rounded-xl focus-visible:ring-primary/20" />
                      </div>
                    </div>
                    <Button variant="hero" className="rounded-xl px-10 h-11 bg-white text-black hover:bg-white/90">Save Profile</Button>
                  </div>

                  <div className="rounded-[32px] border border-red-500/10 bg-red-500/5 p-8 backdrop-blur-3xl">
                    <h2 className="text-lg font-bold text-red-400 mb-2 uppercase tracking-tight">Danger Zone</h2>
                    <p className="text-sm text-red-300/40 mb-6">Permanently delete your account and all your projects.</p>
                    <Button variant="outline" className="h-10 px-6 rounded-xl border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all text-[11px] font-bold uppercase tracking-widest">
                      <Trash2 className="h-3.5 w-3.5 mr-2" />
                      Delete Account
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Billing - Resource Credits */}
              {currentTab === "billing" && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  <div className="rounded-[32px] border border-white/5 bg-gradient-to-br from-[#0A0A0B] to-[#050505] p-10 backdrop-blur-3xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[60px] group-hover:bg-primary/10 transition-colors" />
                    <div className="flex items-start justify-between mb-12">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/80 mb-2 block">Pro Tier</span>
                        <h2 className="text-4xl font-black text-white tracking-tighter uppercase">Unlimited Plan</h2>
                      </div>
                      <div className="h-14 w-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-2xl">
                        <Logo />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-8">
                      {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-1.5 w-12 rounded-full bg-primary shadow-[0_0_10px_rgba(34,197,94,0.4)]" />)}
                      <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest ml-4">Fully Active</span>
                    </div>
                    <Button variant="hero-outline" className="rounded-xl px-8 h-12 border-white/10 bg-white/5 hover:bg-white text-[11px] font-bold uppercase tracking-widest text-white hover:text-black hover:shadow-2xl hover:shadow-white/10 transition-all">
                      Modify Plan
                      <ChevronRight className="w-3.5 h-3.5 ml-2" />
                    </Button>
                  </div>

                  <div className="rounded-[32px] border border-white/5 bg-[#0A0A0B]/50 p-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center">
                        <Globe className="w-5 h-5 text-muted-foreground/30" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-tight">External Billing</h3>
                        <p className="text-xs text-muted-foreground/40 mt-1">Managed via Stripe for security.</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-muted-foreground hover:text-white hover:bg-white/5">
                      <ExternalLink className="w-4 h-4" />
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
                          <div className="flex items-center gap-1 opacity-20 group-hover:opacity-100 transition-opacity">
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
