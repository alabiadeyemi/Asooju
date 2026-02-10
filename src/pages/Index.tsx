import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Zap, Code2, Rocket, Shield, GitBranch, Download,
  ArrowRight, Star, Users, Layers,
} from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 },
};

const features = [
  { icon: Code2, title: "AI Code Generation", desc: "Describe your app in plain English. Get production-ready React, API routes, and database schemas." },
  { icon: Layers, title: "Full-Stack Output", desc: "Frontend, backend, database — generated together with proper types and connections." },
  { icon: GitBranch, title: "Export to GitHub", desc: "One-click push to a GitHub repo. Your code, your ownership, no lock-in." },
  { icon: Download, title: "Download ZIP", desc: "Export your entire project as a ZIP file. Deploy anywhere you want." },
  { icon: Shield, title: "Bring Your Own Key", desc: "Use your own OpenAI, Gemini, or Grok API key. Full control over costs." },
  { icon: Rocket, title: "Deploy Instantly", desc: "Ship to Vercel with a single click. From idea to production in minutes." },
];

const stats = [
  { value: "10k+", label: "Projects shipped" },
  { value: "50k+", label: "Developers" },
  { value: "99.9%", label: "Uptime" },
  { value: "<2s", label: "Avg generation" },
];

const faqs = [
  { q: "What is BYOK?", a: "Bring Your Own Key — use your own API keys from OpenAI, Gemini, or Grok for unlimited generations at your own cost." },
  { q: "Can I export my code?", a: "Yes! Download as ZIP or push directly to GitHub. You own 100% of the generated code." },
  { q: "What stack does it generate?", a: "React + TypeScript frontend, serverless API routes, and PostgreSQL database schemas." },
  { q: "Is there a free tier?", a: "Yes — 5 free generations to try the platform, no credit card required." },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

        <div className="container mx-auto text-center relative">
          <motion.div {...fadeUp}>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs text-muted-foreground mb-6">
              <Zap className="h-3 w-3 text-primary" />
              Now with Gemini, GPT & Grok support
            </div>
          </motion.div>

          <motion.h1
            {...fadeUp}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight mb-6"
          >
            Ship apps with
            <br />
            <span className="text-gradient">AI-powered code</span>
          </motion.h1>

          <motion.p
            {...fadeUp}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
          >
            Describe what you want to build. Get a full-stack, production-ready application
            in seconds. Export, deploy, and iterate — all from your browser.
          </motion.p>

          <motion.div
            {...fadeUp}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button variant="hero" size="lg" asChild>
              <Link to="/auth/signup">
                Start building
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
            <Button variant="hero-outline" size="lg" asChild>
              <Link to="/auth/signup">Try free — 5 generations</Link>
            </Button>
          </motion.div>

          {/* Code preview mockup */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mt-16 mx-auto max-w-4xl rounded-xl border border-border bg-card overflow-hidden shadow-2xl"
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-destructive/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-green-500/60" />
              </div>
              <span className="text-xs text-muted-foreground font-mono ml-2">project-builder.tsx</span>
            </div>
            <div className="p-6 font-mono text-sm text-left leading-relaxed">
              <div className="text-muted-foreground">
                <span className="text-purple-400">const</span>{" "}
                <span className="text-primary">app</span> ={" "}
                <span className="text-purple-400">await</span>{" "}
                <span className="text-yellow-400">generate</span>({"{"}<br />
                <span className="ml-4 text-green-400">"Build a SaaS dashboard with auth,</span><br />
                <span className="ml-4 text-green-400">stripe billing, and a project manager"</span><br />
                {"}"});<br /><br />
                <span className="text-muted-foreground/60">{"// "}✓ 12 files generated</span><br />
                <span className="text-muted-foreground/60">{"// "}✓ Database schema ready</span><br />
                <span className="text-muted-foreground/60">{"// "}✓ API routes configured</span><br />
                <span className="text-muted-foreground/60">{"// "}✓ Ready to deploy</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 border-y border-border bg-card/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-gradient">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything you need to ship</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              From idea to production in minutes. No boilerplate, no config files, no headaches.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="group rounded-xl border border-border bg-gradient-card p-6 hover:border-primary/30 transition-colors"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4 group-hover:glow-primary transition-shadow">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="py-20 px-4 border-t border-border bg-card/20">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center gap-1 mb-3">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-5 w-5 fill-yellow-500 text-yellow-500" />
            ))}
          </div>
          <p className="text-lg md:text-xl font-medium text-foreground max-w-2xl mx-auto mb-2">
            "BuildShip turned a weekend project into a production app in 2 hours.
            The code quality is surprisingly good."
          </p>
          <p className="text-sm text-muted-foreground">— Senior Engineer at a YC startup</p>
          <div className="flex items-center justify-center gap-2 mt-6 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            Trusted by 50,000+ developers
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-2xl">
          <h2 className="text-3xl font-bold text-center mb-10">Frequently asked questions</h2>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <div key={faq.q} className="rounded-lg border border-border bg-card p-5">
                <h3 className="font-medium text-foreground mb-2">{faq.q}</h3>
                <p className="text-sm text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <div className="rounded-2xl border border-primary/20 bg-gradient-card p-12 md:p-16 relative overflow-hidden">
            <div className="absolute inset-0 bg-primary/5 blur-3xl pointer-events-none" />
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to build?</h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Start with 5 free generations. No credit card required.
              </p>
              <Button variant="hero" size="lg" asChild>
                <Link to="/auth/signup">
                  Get started free
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
