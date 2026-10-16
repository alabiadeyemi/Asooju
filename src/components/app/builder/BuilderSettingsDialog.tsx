import React, { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Settings, Cpu, Key, Database, Sparkles, CheckCircle2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PROVIDER_META } from "@/services/ai-service";
import { ApiKeyTestButton } from "@/components/app/ApiKeyTestButton";

interface BuilderSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeProvider: string;
  setActiveProvider: (provider: string) => void;
  providerKeys: Record<string, string>;
  setProviderKey: (provider: string, key: string) => void;
  supabaseUrl: string;
  setSupabaseUrl: (url: string) => void;
  supabaseAnonKey: string;
  setSupabaseAnonKey: (key: string) => void;
  isValidating: boolean;
  onSave: () => void;
}

const PROVIDER_OPTIONS = ["openai", "gemini", "claude", "grok", "deepseek"] as const;

export const BuilderSettingsDialog: React.FC<BuilderSettingsDialogProps> = ({
  open,
  onOpenChange,
  activeProvider,
  setActiveProvider,
  providerKeys,
  setProviderKey,
  supabaseUrl,
  setSupabaseUrl,
  supabaseAnonKey,
  setSupabaseAnonKey,
  isValidating,
  onSave,
}) => {
  const [resolvedModel, setResolvedModel] = useState<string | null>(
    () => localStorage.getItem(`asooju_resolved_model_${activeProvider}`)
  );

  const meta = PROVIDER_META[activeProvider] || PROVIDER_META.openai;
  const activeKey = providerKeys[activeProvider] || "";

  const providerLabel = useMemo(
    () => PROVIDER_META[activeProvider]?.label || activeProvider,
    [activeProvider]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-[#0A0A0B] border-white/5 text-white shadow-2xl p-0 overflow-hidden">
        <div className="flex flex-col max-h-[85vh]">
          <DialogHeader className="p-8 border-b border-white/5 bg-[#080808]/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20">
                <Settings className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <DialogTitle className="text-xl font-black uppercase tracking-widest leading-none">
                  AI Settings
                </DialogTitle>
                <DialogDescription className="text-white/40 font-medium mt-1">
                  Pick a provider, paste your key, then test — we pick the model.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-8 space-y-8">
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-primary" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                  Provider
                </h3>
              </div>
              <Select
                value={activeProvider}
                onValueChange={(p) => {
                  setActiveProvider(p);
                  setResolvedModel(localStorage.getItem(`asooju_resolved_model_${p}`));
                }}
              >
                <SelectTrigger className="h-12 bg-white/5 border-white/10 rounded-xl px-4">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent className="bg-[#121214] border-white/10 text-white">
                  {PROVIDER_OPTIONS.map((id) => (
                    <SelectItem key={id} value={id} className="focus:bg-primary/20 focus:text-white">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                        <span className="font-bold">{PROVIDER_META[id].label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-primary" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                  {providerLabel} API key
                </h3>
              </div>
              <div className="space-y-3">
                <Label className="text-[11px] font-bold text-white/60 uppercase tracking-widest pl-1">
                  Secret key
                </Label>
                <Input
                  type="password"
                  placeholder={meta.placeholder}
                  value={activeKey}
                  onChange={(e) => {
                    setProviderKey(activeProvider, e.target.value);
                    setResolvedModel(null);
                  }}
                  className="h-11 bg-white/5 border-white/10 rounded-xl px-4 font-mono text-xs"
                />
                <p className="text-[11px] text-white/35 pl-1">
                  Get a key from {meta.hint}. Test runs a live ping and auto-selects a model.
                </p>
                {resolvedModel && (
                  <div className="flex items-center gap-2 text-[11px] text-primary/80 pl-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Using <span className="font-mono text-white/70">{resolvedModel}</span>
                  </div>
                )}
                <ApiKeyTestButton
                  provider={activeProvider}
                  apiKey={activeKey}
                  onResult={(r) => {
                    if (r.success && r.model) setResolvedModel(r.model);
                  }}
                />
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-primary" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                  Supabase (optional)
                </h3>
              </div>
              <div className="space-y-3">
                <Input
                  placeholder="https://your-project.supabase.co"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  className="h-11 bg-white/5 border-white/10 rounded-xl px-4 font-mono text-[10px]"
                />
                <Input
                  type="password"
                  placeholder="Anon / publishable key"
                  value={supabaseAnonKey}
                  onChange={(e) => setSupabaseAnonKey(e.target.value)}
                  className="h-11 bg-white/5 border-white/10 rounded-xl px-4 font-mono text-[10px]"
                />
              </div>
            </section>
          </div>

          <DialogFooter className="p-8 border-t border-white/5 bg-[#080808]/80">
            <Button
              variant="hero"
              onClick={onSave}
              disabled={isValidating}
              className="w-full h-12 rounded-xl bg-primary text-black hover:bg-primary/90 font-black uppercase tracking-[0.2em] text-[12px]"
            >
              {isValidating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-3" />
                  Saving…
                </>
              ) : (
                "Save settings"
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};
