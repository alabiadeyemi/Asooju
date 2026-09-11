import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowRight, Layout, ShoppingBag, FileText,
  MessageSquare, Zap, Target, BrainCircuit,
  ShieldCheck, Cpu, Globe, Rocket, ChevronLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/ui/logo";
import { PROJECT_TEMPLATES } from "@/lib/templates";
import { cloneVfs } from "@/lib/vfs";
import { useProjects } from "@/hooks/use-projects";

const templates = PROJECT_TEMPLATES.map((t) => ({
  id: t.id,
  name: t.title,
  desc: t.desc,
  icon:
    t.id === "saas"
      ? ShieldCheck
      : t.id === "ecommerce"
        ? ShoppingBag
        : t.id === "blog"
          ? FileText
          : t.id === "chat"
            ? MessageSquare
            : t.id === "portfolio"
              ? Globe
              : Target,
  complexity: Object.keys(t.vfs).length > 3 ? "Medium" : "Simple",
  prompt: t.prompt,
  vfs: t.vfs,
}));

const NewProject = () => {
  const [name, setName] = useState("");
  const [template, setTemplate] = useState("blank");
  const [step, setStep] = useState(1);
  const { createProject, isCreating } = useProjects();

  const handleCreate = () => {
    const selected = templates.find((t) => t.id === template) || templates[0];
    createProject(selected.prompt, {
      templateId: selected.id,
      name: name.trim() || selected.name,
      vfs: cloneVfs(selected.vfs),
    });
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white p-6 lg:p-24 selection:bg-primary/30 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="fixed inset-0 bg-noise opacity-[0.02] pointer-events-none" />
      <div className="absolute top-1/4 -left-20 w-[600px] h-[600px] bg-primary/10 blur-[150px] pointer-events-none rounded-full" />
      <div className="absolute bottom-0 right-0 w-[800px] h-[400px] bg-blue-500/5 blur-[120px] pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Navigation / Progress */}
        <div className="mb-16 flex items-center justify-between">
          <Link to="/app" className="group flex items-center gap-2 text-muted-foreground/50 hover:text-white transition-colors text-[10px] uppercase font-bold tracking-[0.2em]">
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Go Back
          </Link>
          <div className="flex gap-2">
            {[1, 2].map((s) => (
              <div key={s} className={`h-1 rounded-full transition-all duration-500 ${step >= s ? 'w-12 bg-primary shadow-[0_0_8px_rgba(34,197,94,0.3)]' : 'w-8 bg-white/5'}`} />
            ))}
          </div>
        </div>

        {/* Content Stages */}
        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-12"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-white/5 border border-white/5 shadow-2xl">
                    <Logo size="sm" />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-[0.3em] text-primary/80">Step 1 of 2</span>
                </div>
                <h1 className="text-5xl font-black uppercase tracking-tighter leading-none text-white">Name your project</h1>
                <p className="text-muted-foreground/60 max-w-lg text-[15px]">Give your project a name to help you keep track of it later.</p>
              </div>

              <div className="space-y-8 max-w-xl">
                <div className="relative group">
                  <label className="absolute left-4 -top-2.5 px-2 bg-[#020202] text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 group-focus-within:text-primary transition-colors">Project Name</label>
                  <Input
                    autoFocus
                    placeholder="e.g. My Website"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-16 bg-white/[0.02] border-white/10 rounded-3xl px-6 text-xl font-bold tracking-tight focus-visible:ring-primary/20 transition-all placeholder:text-white/[0.05]"
                  />
                </div>

                <Button
                  size="lg"
                  variant="hero"
                  disabled={name.length < 3}
                  onClick={() => setStep(2)}
                  className="h-14 px-10 rounded-full bg-white text-black hover:bg-white/90 text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-white/5 disabled:opacity-20"
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-3" />
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-12"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-white/5 border border-white/5 shadow-2xl" onClick={() => setStep(1)}>
                    <Cpu className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-[0.3em] text-primary/80">Step 2 of 2</span>
                </div>
                <h1 className="text-5xl font-black uppercase tracking-tighter leading-none text-white">Choose a template</h1>
                <p className="text-muted-foreground/60 max-w-lg text-[15px]">The name <span className="text-white font-bold">{name}</span> is set. Now pick a starter template to begin.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map((t) => {
                  const Icon = t.icon;
                  const isActive = template === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTemplate(t.id)}
                      className={`relative group flex flex-col items-start p-6 rounded-[32px] border transition-all duration-500 overflow-hidden ${isActive
                        ? "border-primary/40 bg-primary/5 shadow-2xl shadow-primary/5"
                        : "border-white/5 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                        }`}
                    >
                      <div className={`p-4 rounded-2xl mb-6 transition-all duration-500 ${isActive ? 'bg-primary text-black' : 'bg-white/5 text-muted-foreground'}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <h3 className={`text-lg font-bold mb-1 transition-colors ${isActive ? 'text-white' : 'text-muted-foreground/70'}`}>{t.name}</h3>
                      <p className="text-[13px] text-muted-foreground/50 text-left mb-6 leading-relaxed">
                        {isActive ? "Great choice! This template is ready to go." : t.desc}
                      </p>

                      <div className="mt-auto flex items-center justify-between w-full">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/30">Difficulty: {t.complexity}</span>
                        {isActive && (
                          <motion.div layoutId="check" className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-[0_0_12px_rgba(34,197,94,0.5)]">
                            <ArrowRight className="w-3 h-3 text-black" />
                          </motion.div>
                        )}
                      </div>

                      {/* Sparkle Effect on Select */}
                      {isActive && (
                        <div className="absolute top-0 right-0 p-4">
                          <Sparkle className="w-4 h-4 text-primary animate-pulse" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="pt-8 flex items-center gap-6">
                <Button
                  size="lg"
                  variant="hero"
                  disabled={isCreating}
                  onClick={handleCreate}
                  className="h-14 px-12 rounded-full bg-white text-black hover:bg-white/90 text-[11px] font-black uppercase tracking-[0.3em] shadow-xl group"
                >
                  {isCreating ? "Creating..." : "Create Project"}
                  <Rocket className="w-4 h-4 ml-3 group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setStep(1)}
                  className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground animate-pulse"
                >
                  Change Name
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Background HUD Graphics */}
      <div className="absolute bottom-20 left-20 hidden lg:block opacity-[0.05]">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-1 w-12 bg-white" />
            <span className="text-[9px] font-mono whitespace-nowrap">STATUS: ONLINE</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1 w-12 bg-white" />
            <span className="text-[9px] font-mono whitespace-nowrap">LOCAL: ACTIVE</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const Sparkle = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
  </svg>
);

export default NewProject;
