import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Zap, Bug, Sparkles, Calendar, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

const entries = [
  {
    date: "Feb 8, 2026",
    version: "v0.4.0",
    icon: Sparkles,
    title: "Grok provider support",
    items: ["Added Grok as an AI provider", "BYOK users can now add Grok API keys", "Improved generation speed by 40%"],
  },
  {
    date: "Jan 25, 2026",
    version: "v0.3.0",
    icon: Zap,
    title: "GitHub export & deploy",
    items: ["One-click push to GitHub", "Vercel deploy integration", "Improved TypeScript generation quality"],
  },
  {
    date: "Jan 10, 2026",
    version: "v0.2.0",
    icon: Bug,
    title: "Bug fixes & improvements",
    items: ["Fixed file tree rendering issues", "Improved chat context handling", "Better error messages for failed generations"],
  },
  {
    date: "Dec 20, 2025",
    version: "v0.1.0",
    icon: Sparkles,
    title: "Initial launch",
    items: ["AI-powered code generation", "OpenAI & Gemini support", "ZIP export", "Free tier with 5 generations"],
  },
];

export default function Changelog() {
  return (
    <div className="min-h-screen bg-[#020202] text-white relative overflow-hidden selection:bg-primary/30 font-sans antialiased">
      {/* Soft Background Atmosphere */}
      <div className="fixed inset-0 bg-noise opacity-[0.03] pointer-events-none" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-primary/5 blur-[150px] pointer-events-none" />

      <Navbar />

      <main className="container mx-auto px-4 pt-32 pb-32 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 rounded-full border border-white/5 bg-white/5 px-4 py-1.5 text-[11px] font-black uppercase tracking-widest text-primary mb-8 backdrop-blur-xl"
          >
            <Calendar className="w-3.5 h-3.5" />
            Timeline
          </motion.div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase mb-6 leading-none">
            Fresh <span className="text-primary italic">Updates</span>
          </h1>
          <p className="text-lg text-muted-foreground/60 font-medium">
            Tracking every detail of the platform's evolution.
          </p>
        </div>

        <div className="max-w-4xl mx-auto relative">
          {/* Timeline Line */}
          <div className="absolute left-1/2 -translate-x-1/2 top-10 bottom-10 w-px bg-white/5 hidden md:block" />

          <div className="space-y-16">
            {entries.map((entry, i) => (
              <motion.div
                key={entry.version}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`relative flex flex-col md:flex-row items-center gap-10 ${i % 2 === 0 ? 'md:flex-row-reverse' : ''}`}
              >
                {/* Content Card */}
                <div className="flex-1 w-full">
                  <div className="rounded-[32px] border border-white/5 bg-[#0A0A0B]/80 backdrop-blur-3xl p-8 hover:bg-[#0C0C0D] transition-all group overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.02]">
                      <entry.icon className="w-24 h-24" />
                    </div>

                    <div className="flex items-center gap-3 mb-6">
                      <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest">
                        {entry.version}
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">{entry.date}</span>
                    </div>

                    <h3 className="text-2xl font-black uppercase tracking-tight mb-6 group-hover:text-primary transition-colors">{entry.title}</h3>

                    <ul className="space-y-3">
                      {entry.items.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-sm font-medium text-white/60 leading-relaxed">
                          <ChevronRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Center Dot */}
                <div className="hidden md:flex items-center justify-center z-10">
                  <div className="w-4 h-4 rounded-full bg-[#020202] border-4 border-primary shadow-[0_0_15px_rgba(34,197,94,0.5)]" />
                </div>

                {/* Empty space for balance */}
                <div className="hidden md:block flex-1" />
              </motion.div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
