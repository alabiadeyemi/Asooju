import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, Code2, Rocket, Shield, GitBranch, Download,
  ArrowRight, Star, Users, Layers, File, Folder, Plus,
  Sparkles, Heart, Smartphone, Smile, Send,
  Terminal as TerminalIcon, Cpu, Globe, Search, ChevronRight,
  Monitor, Layout, ShoppingBag, MessageSquare, Briefcase,
  RefreshCcw
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useProjects } from "@/hooks/use-projects";
import { Logo } from "@/components/ui/logo";

const templates = [
  { id: 1, title: "SaaS Dashboard", desc: "Manage users & billing", icon: Layout, color: "text-blue-500", bg: "bg-blue-500/10" },
  { id: 2, title: "E-Commerce", desc: "Sell products online", icon: ShoppingBag, color: "text-primary", bg: "bg-primary/10" },
  { id: 3, title: "Chat Platform", desc: "Real-time messaging", icon: MessageSquare, color: "text-purple-500", bg: "bg-purple-500/10" },
  { id: 4, title: "Business Tool", desc: "Organize your workflow", icon: Briefcase, color: "text-orange-500", bg: "bg-orange-500/10" },
  { id: 5, title: "Portfolio Site", desc: "Showcase your work", icon: Monitor, color: "text-cyan-500", bg: "bg-cyan-500/10" },
  { id: 6, title: "API Backend", desc: "Fast data processing", icon: Cpu, color: "text-emerald-500", bg: "bg-emerald-500/10" },
];

const Index = () => {
  const [prompt, setPrompt] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { createProject, isCreating } = useProjects();

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [prompt]);

  // Auto-scroll logic for carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % templates.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#020202] text-white relative overflow-hidden selection:bg-primary/30 font-sans antialiased">
      {/* Soft Background Atmosphere */}
      <div className="fixed inset-0 bg-noise opacity-[0.03] pointer-events-none" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-primary/5 blur-[150px] pointer-events-none" />

      {/* Dynamic Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 px-4 md:pt-48 md:pb-20">
        <div className="container mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="flex justify-center mb-8"
          >
            <Logo size="lg" />
          </motion.div>


          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-6xl sm:text-8xl lg:text-[10rem] font-black tracking-tighter leading-[0.85] mb-12 text-white uppercase"
          >
            Design. Build.
            <br />
            <span className="text-primary-foreground italic stroke-text">Ship.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground/60 max-w-2xl mx-auto mb-16 leading-relaxed font-medium"
          >
            Create professional software without touching a single line of code.
            Just describe your idea and watch it come to life.
          </motion.p>

          {/* Interactive Multi-Line Prompt Box */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="max-w-3xl mx-auto mb-16 relative group"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-blue-500/20 to-primary/20 rounded-[32px] blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
            <div className="relative flex flex-col p-4 rounded-[32px] border border-white/10 bg-[#0A0A0B]/80 backdrop-blur-3xl shadow-3xl overflow-hidden transition-all duration-500 focus-within:border-primary/30 focus-within:bg-[#0A0A0B]">

              {/* Textarea Area */}
              <div className="flex items-start gap-4 mb-4">
                <div className="pt-2 shrink-0">
                  <Sparkles className="w-5 h-5 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
                </div>
                <textarea
                  ref={textareaRef}
                  rows={1}
                  placeholder="What do you want to build today?"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={isCreating}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      createProject(prompt);
                    }
                  }}
                  className="w-full bg-transparent border-none p-0 pt-1 text-lg font-medium text-white placeholder:text-white/10 outline-none focus:ring-0 resize-none min-h-[44px] max-h-[200px] overflow-y-auto custom-scrollbar"
                />
              </div>

              {/* Prompt actions */}
              <div className="flex items-center justify-between border-t border-white/5 pt-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/25 hidden sm:block">
                  {prompt.length > 0 ? `${prompt.length} chars` : "Describe your app"}
                </span>
                <Button
                  variant="hero"
                  disabled={!prompt || isCreating}
                  onClick={() => createProject(prompt)}
                  className="rounded-2xl h-11 px-8 text-[11px] font-black uppercase tracking-widest bg-white text-black hover:bg-white/90 shadow-2xl transition-all flex items-center gap-2 active:scale-95 disabled:opacity-10 ml-auto"
                >
                  {isCreating ? (
                    <><RefreshCcw className="w-3.5 h-3.5 animate-spin mr-2" /> Building...</>
                  ) : (
                    <>
                      Create App
                      <Send className="w-3.5 h-3.5" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>

          {/* New Interactive Template Carousel */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="w-full max-w-6xl mx-auto overflow-hidden relative py-10"
          >
            <div className="flex items-center gap-6 animate-swipe md:justify-center">
              {templates.map((t, idx) => (
                <motion.button
                  key={t.id}
                  onClick={() => setActiveIndex(idx)}
                  animate={{
                    scale: activeIndex === idx ? 1.05 : 1,
                    opacity: activeIndex === idx ? 1 : 0.4,
                    borderColor: activeIndex === idx ? "rgba(34, 197, 94, 0.4)" : "rgba(255, 255, 255, 0.05)"
                  }}
                  className={`flex-shrink-0 flex items-center gap-4 p-5 rounded-[24px] border bg-white/[0.02] backdrop-blur-md transition-all duration-500 w-64 text-left group`}
                >
                  <div className={`w-10 h-10 rounded-xl ${t.bg} flex items-center justify-center ${t.color}`}>
                    <t.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-widest text-white/80">{t.title}</div>
                    <div className="text-[10px] text-muted-foreground/50 font-medium">{t.desc}</div>
                  </div>
                </motion.button>
              ))}
            </div>
            {/* Progress indicator */}
            <div className="flex justify-center gap-1.5 mt-8">
              {templates.map((_, idx) => (
                <div key={idx} className={`h-1 rounded-full transition-all duration-500 ${activeIndex === idx ? 'w-8 bg-primary shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'w-2 bg-white/5'}`} />
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Rugged Workspace Preview */}
      <section className="pb-32 px-4">
        <div className="container mx-auto max-w-6xl relative">
          {/* Decorative Anchors */}
          <div className="absolute -top-4 -left-4 w-8 h-8 border-t-2 border-l-2 border-white/10" />
          <div className="absolute -top-4 -right-4 w-8 h-8 border-t-2 border-r-2 border-white/10" />
          <div className="absolute -bottom-4 -left-4 w-8 h-8 border-b-2 border-l-2 border-white/10" />
          <div className="absolute -bottom-4 -right-4 w-8 h-8 border-b-2 border-r-2 border-white/10" />

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="relative rounded-[24px] border border-white/10 bg-[#050505] p-3 shadow-[0_0_100px_rgba(34,197,94,0.05)] overflow-hidden group"
          >
            {/* Texture Overlay */}
            <div className="absolute inset-0 opacity-[0.03] bg-grain pointer-events-none" />

            <div className="rounded-[18px] border border-white/5 bg-[#0A0A0B] overflow-hidden flex flex-col h-[600px]">
              {/* Rugged Header */}
              <div className="h-10 bg-black/40 border-b border-white/10 flex items-center px-4 justify-between font-mono shrink-0">
                <div className="flex gap-4 items-center">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-white/5 border border-white/5" />
                    <div className="w-2 h-2 rounded-full bg-white/5 border border-white/5" />
                    <div className="w-2 h-2 rounded-full bg-white/5 border border-white/5" />
                  </div>
                  <span className="text-[10px] text-muted-foreground/30 uppercase tracking-[0.2em] font-black">Local_Environment_v1.0</span>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-[9px] text-primary font-bold uppercase tracking-wider">Active</span>
                  </div>
                  <TerminalIcon className="w-3.5 h-3.5 text-muted-foreground/30" />
                </div>
              </div>

              <div className="flex-1 grid md:grid-cols-[200px_1fr] overflow-hidden">
                {/* Rugged Sidebar */}
                <div className="hidden md:flex flex-col border-r border-white/10 bg-black/20 p-4 font-mono">
                  <div className="flex items-center justify-between mb-8 opacity-20">
                    <span className="text-[9px] font-black uppercase tracking-widest">Workspace</span>
                    <ChevronRight className="w-3 h-3" />
                  </div>
                  <div className="space-y-3">
                    {['Components', 'Hooks', 'Styles', 'Assets'].map((item, i) => (
                      <div key={item} className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest ${i === 2 ? 'text-primary/60' : 'text-muted-foreground/20'}`}>
                        <Folder className="w-3 h-3" /> {item}
                      </div>
                    ))}
                  </div>
                  <div className="mt-auto pt-8 border-t border-white/5 opacity-10">
                    <div className="text-[8px] font-mono leading-tight">CPU: 24%<br />MEM: 1.2GB</div>
                  </div>
                </div>

                {/* Rugged Editor Container */}
                <div className="flex flex-col overflow-hidden relative">
                  <div className="h-8 bg-black/20 border-b border-white/5 flex items-center px-6 gap-6">
                    <div className="text-[9px] font-mono font-bold text-primary uppercase tracking-widest border-b border-primary h-full flex items-center">index.tsx</div>
                    <div className="text-[9px] font-mono font-bold text-white/10 uppercase tracking-widest">style.css</div>
                  </div>

                  <div className="flex-1 p-8 text-sm font-mono overflow-auto custom-scrollbar relative">
                    {/* Line Numbers */}
                    <div className="absolute left-0 top-0 bottom-0 w-10 bg-black/20 border-r border-white/5 flex flex-col items-center py-8 text-[10px] font-mono text-white/5 font-light pointer-events-none">
                      {Array.from({ length: 20 }).map((_, i) => <div key={i} className="h-6 leading-6">{i + 1}</div>)}
                    </div>

                    <div className="pl-6 space-y-1">
                      <div className="opacity-40"><span className="text-primary italic">import</span> React <span className="text-primary italic">from</span> <span className="text-primary/60">"react"</span>;</div>
                      <div className="opacity-20"><span className="text-primary italic">import</span> {"{"} Builder {"}"} <span className="text-primary italic">from</span> <span className="text-primary/60">"@asooju/core"</span>;</div>
                      <div className="h-4" />
                      <div className="opacity-60"><span className="text-primary">export default function</span> <span className="text-white">App()</span> {"{"}</div>
                      <div className="ml-6 opacity-80"><span className="text-primary">return</span> (</div>
                      <div className="ml-12 text-primary shadow-sm bg-primary/5 border-l-2 border-primary/50 py-1 px-4 my-2 relative">
                        &lt;div <span className="text-white/60">className</span>=<span className="text-white/40">"bg-obsidian-900"</span>&gt;
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: [0, 1, 0] }}
                          transition={{ repeat: Infinity, duration: 0.8 }}
                          className="inline-block w-2 h-4 bg-primary ml-1 align-middle"
                        />
                      </div>
                      <div className="ml-12 opacity-80">&lt;h1&gt; Hello World &lt;/h1&gt;</div>
                      <div className="ml-6 opacity-60">);</div>
                      <div className="opacity-40">{"}"}</div>
                    </div>

                    {/* Rugged AI Message */}
                    <div className="absolute bottom-10 left-10 right-10">
                      <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        whileInView={{ y: 0, opacity: 1 }}
                        className="bg-black/80 backdrop-blur-3xl border border-primary/30 rounded-2xl p-6 shadow-2xl flex items-start gap-6 relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                          <Cpu className="w-12 h-12" />
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/20 flex items-center justify-center shrink-0">
                          <Sparkles className="w-5 h-5 text-primary" />
                        </div>
                        <div className="space-y-1">
                          <div className="text-[10px] font-mono font-black text-primary uppercase tracking-[0.2em]">Assistant_Output</div>
                          <p className="text-sm text-white/70 font-medium">Generating a high-performance, dark-themed dashboard...</p>
                          <div className="flex gap-1 pt-2">
                            <div className="h-0.5 w-12 bg-primary/40" />
                            <div className="h-0.5 w-4 bg-primary/20" />
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Simplified Features */}
      <section className="py-24 px-4 container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: Sparkles,
              title: "Simple AI Chat",
              desc: "Talk to your AI helper like a friend. It understands exactly what you want to build."
            },
            {
              icon: Smartphone,
              title: "Mobile Ready",
              desc: "Everything you build looks perfect on phones, tablets, and computers automatically."
            },
            {
              icon: Heart,
              title: "You Own It",
              desc: "Everything you create is yours. Download your files anytime and keep them forever."
            },
          ].map((f, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -5 }}
              className="p-10 rounded-[40px] border border-white/5 bg-[#0A0A0B]/50 hover:bg-[#0C0C0D] transition-all relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-[0.02]">
                <f.icon className="w-32 h-32" />
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-10 text-primary shadow-xl">
                <f.icon className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-white uppercase tracking-tight">{f.title}</h3>
              <p className="text-muted-foreground/60 leading-relaxed text-sm font-medium">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-40 px-4">
        <div className="container mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto rounded-[50px] border border-white/10 bg-gradient-to-b from-[#0A0A0B] to-black p-16 md:p-32 shadow-3xl relative overflow-hidden"
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-hero" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-primary/10 blur-[100px] pointer-events-none" />

            <h2 className="text-5xl md:text-8xl font-black uppercase tracking-tighter text-white mb-10 leading-[0.9]">Start building Now</h2>
            <p className="text-lg text-muted-foreground/60 max-w-sm mx-auto mb-12 font-medium">
              Join thousands of builders shipping real software. It's free to try!
            </p>
            <Button variant="hero" size="lg" className="h-16 px-12 text-[15px] font-black uppercase tracking-widest rounded-[22px] bg-white text-black hover:bg-white/90 shadow-2xl transition-all" asChild>
              <Link to="/auth/signup">
                Create Free Account
                <ArrowRight className="h-5 w-5 ml-3" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      <Footer />

      <style dangerouslySetInnerHTML={{
        __html: `
        .stroke-text {
          -webkit-text-stroke: 1px rgba(255,255,255,0.1);
          color: transparent;
        }
        .bg-grain {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
        }
        @keyframes swipe {
           0% { transform: translateX(0); }
           10% { transform: translateX(0); }
           20% { transform: translateX(-10%); }
           100% { transform: translateX(-50%); }
        }
      `}} />
    </div>
  );
};

export default Index;
