import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Zap, Bug, Sparkles } from "lucide-react";

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

const Changelog = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <div className="pt-32 pb-20 px-4">
      <div className="container mx-auto max-w-2xl">
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-4">Changelog</h1>
        <p className="text-lg text-muted-foreground text-center mb-12">What's new in BuildShip.</p>
        <div className="space-y-8">
          {entries.map((entry) => {
            const Icon = entry.icon;
            return (
              <div key={entry.version} className="rounded-lg border border-border bg-card p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{entry.title}</h3>
                    <p className="text-xs text-muted-foreground">{entry.date} · {entry.version}</p>
                  </div>
                </div>
                <ul className="space-y-1.5 ml-11">
                  {entry.items.map((item) => (
                    <li key={item} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-1.5 shrink-0">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
    <Footer />
  </div>
);

export default Changelog;
