import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Loader2,
    Settings,
    Cpu,
    Key,
    Database,
    Sparkles,
    Zap
} from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface BuilderSettingsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    activeProvider: string;
    setActiveProvider: (provider: string) => void;
    openaiKey: string;
    setOpenaiKey: (key: string) => void;
    geminiKey: string;
    setGeminiKey: (key: string) => void;
    grokKey: string;
    setGrokKey: (key: string) => void;
    supabaseUrl: string;
    setSupabaseUrl: (url: string) => void;
    supabaseAnonKey: string;
    setSupabaseAnonKey: (key: string) => void;
    isValidating: boolean;
    onSave: () => void;
}

export const BuilderSettingsDialog: React.FC<BuilderSettingsDialogProps> = ({
    open,
    onOpenChange,
    activeProvider,
    setActiveProvider,
    openaiKey,
    setOpenaiKey,
    geminiKey,
    setGeminiKey,
    grokKey,
    setGrokKey,
    supabaseUrl,
    setSupabaseUrl,
    supabaseAnonKey,
    setSupabaseAnonKey,
    isValidating,
    onSave
}) => {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl bg-[#0A0A0B] border-white/5 text-white shadow-2xl p-0 overflow-hidden">
                <div className="flex flex-col h-[80vh] max-h-[600px]">
                    <DialogHeader className="p-8 border-b border-white/5 bg-[#080808]/50 overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-12 -mr-12 -mt-12 bg-primary/10 blur-[100px] rounded-full" />
                        <div className="flex items-center gap-3 relative z-10">
                            <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20">
                                <Settings className="w-5 h-5 text-primary" />
                            </div>
                            <div className="text-left">
                                <DialogTitle className="text-2xl font-black uppercase tracking-widest leading-none">System Core</DialogTitle>
                                <DialogDescription className="text-white/40 font-medium mt-1">Configure neural parameters & environmental bridges</DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                        <div className="space-y-10">
                            {/* Brain Selection */}
                            <section className="space-y-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <Cpu className="w-4 h-4 text-primary" />
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Cognitive Provider</h3>
                                </div>
                                <div className="grid grid-cols-1 gap-6">
                                    <div className="space-y-3">
                                        <Label className="text-[11px] font-bold text-white/60 uppercase tracking-widest pl-1">Primary Intelligence</Label>
                                        <Select value={activeProvider} onValueChange={setActiveProvider}>
                                            <SelectTrigger className="h-12 bg-white/5 border-white/10 rounded-xl px-4 focus:ring-primary/20">
                                                <SelectValue placeholder="Select provider" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-[#121214] border-white/10 text-white">
                                                <SelectItem value="openai" className="focus:bg-primary/20 focus:text-white">
                                                    <div className="flex items-center gap-2">
                                                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                                                        <span className="font-bold">OpenAI GPT-4o</span>
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="gemini" className="focus:bg-primary/20 focus:text-white">
                                                    <div className="flex items-center gap-2">
                                                        <Zap className="w-3.5 h-3.5 text-blue-400" />
                                                        <span className="font-bold">Google Gemini Elite</span>
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="grok" className="focus:bg-primary/20 focus:text-white">
                                                    <div className="flex items-center gap-2">
                                                        <Cpu className="w-3.5 h-3.5 text-orange-400" />
                                                        <span className="font-bold">xAI Grok Beta</span>
                                                    </div>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </section>

                            {/* API Foundations */}
                            <section className="space-y-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <Key className="w-4 h-4 text-primary" />
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Neural Keys</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <Label className="text-[11px] font-bold text-white/60 uppercase tracking-widest pl-1">OpenAI Key</Label>
                                        <Input
                                            type="password"
                                            placeholder="sk-..."
                                            value={openaiKey}
                                            onChange={(e) => setOpenaiKey(e.target.value)}
                                            className="h-11 bg-white/5 border-white/10 rounded-xl px-4 focus:ring-primary/20"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-[11px] font-bold text-white/60 uppercase tracking-widest pl-1">Gemini Key</Label>
                                        <Input
                                            type="password"
                                            placeholder="AIza..."
                                            value={geminiKey}
                                            onChange={(e) => setGeminiKey(e.target.value)}
                                            className="h-11 bg-white/5 border-white/10 rounded-xl px-4 focus:ring-primary/20"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-[11px] font-bold text-white/60 uppercase tracking-widest pl-1">Grok Key</Label>
                                        <Input
                                            type="password"
                                            placeholder="xai-..."
                                            value={grokKey}
                                            onChange={(e) => setGrokKey(e.target.value)}
                                            className="h-11 bg-white/5 border-white/10 rounded-xl px-4 focus:ring-primary/20"
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* Database Bridges */}
                            <section className="space-y-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <Database className="w-4 h-4 text-primary" />
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Persistence Bridge</h3>
                                </div>
                                <div className="grid grid-cols-1 gap-6">
                                    <div className="space-y-3">
                                        <Label className="text-[11px] font-bold text-white/60 uppercase tracking-widest pl-1">Supabase URL</Label>
                                        <Input
                                            placeholder="https://your-project.supabase.co"
                                            value={supabaseUrl}
                                            onChange={(e) => setSupabaseUrl(e.target.value)}
                                            className="h-11 bg-white/5 border-white/10 rounded-xl px-4 focus:ring-primary/20 font-mono text-[10px]"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-[11px] font-bold text-white/60 uppercase tracking-widest pl-1">Anon Key</Label>
                                        <Input
                                            type="password"
                                            placeholder="eyJhbG..."
                                            value={supabaseAnonKey}
                                            onChange={(e) => setSupabaseAnonKey(e.target.value)}
                                            className="h-11 bg-white/5 border-white/10 rounded-xl px-4 focus:ring-primary/20 font-mono text-[10px]"
                                        />
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>

                    <DialogFooter className="p-8 border-t border-white/5 bg-[#080808]/80 backdrop-blur-md">
                        <Button
                            variant="hero"
                            onClick={onSave}
                            disabled={isValidating}
                            className="w-full h-12 rounded-xl bg-primary text-black hover:bg-primary/90 font-black uppercase tracking-[0.2em] text-[12px] shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-all active:scale-95"
                        >
                            {isValidating ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin mr-3" />
                                    Encrypting neural channels...
                                </>
                            ) : (
                                "Initialize System Core"
                            )}
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
};
