import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { motion } from "framer-motion";
import { MessageSquare, HelpCircle, Zap, Search } from "lucide-react";

const faqs = [
  { q: "What is BYOK (Bring Your Own Key)?", a: "BYOK lets you use your own API keys from providers like OpenAI, Google Gemini, or Grok. You pay the provider directly for usage, and Asooju charges nothing for generations. This gives you full control over costs and no generation limits." },
  { q: "How do I export my code?", a: "You can export as a ZIP file or push directly to a GitHub repository. The generated code is standard React + TypeScript with no proprietary lock-in. Deploy it anywhere — Vercel, Netlify, AWS, or your own server." },
  { q: "What providers are supported?", a: "We support OpenAI (GPT), Google Gemini, and Grok. You can switch between providers per-project or set a default in your account settings. BYOK users can add keys for any supported provider." },
  { q: "Is my data and code private?", a: "Your projects are scoped to your account using database access controls. If you use BYOK, the key is stored locally in your browser on that device. Generation requests may be sent to the AI provider you select, so their terms and data-handling rules also apply. Do not save BYOK keys on a shared or untrusted device." },
  { q: "Can I get a refund?", a: "Premium subscriptions can be cancelled at any time. We offer a 14-day money-back guarantee — if you're not happy, contact support for a full refund." },
  { q: "What stack does Asooju generate?", a: "The default stack is React + TypeScript for the frontend, serverless API routes for the backend, and PostgreSQL for the database. We generate proper types, schemas, and connections between all layers." },
  { q: "Do I need to know how to code?", a: "Not necessarily. Asooju is designed for developers but can be used by anyone comfortable with basic tech concepts. The generated code is clean and well-documented, making it easy to modify even for beginners." },
  { q: "Can I use Asooju for commercial projects?", a: "Absolutely. You own 100% of the generated code. Use it for personal projects, client work, startups — anything you want." },
];

export default function FAQ() {
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
            <HelpCircle className="w-3.5 h-3.5" />
            Common Questions
          </motion.div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase mb-6 leading-none">
            Getting <span className="text-primary italic">Answers</span>
          </h1>
          <p className="text-lg text-muted-foreground/60 font-medium">
            Everything you need to know about building, scaling and shipping with Asooju.
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <AccordionItem
                  value={`item-${i}`}
                  className="border border-white/5 bg-white/[0.01] rounded-[24px] px-8 transition-all hover:bg-white/[0.02] hover:border-white/10 overflow-hidden"
                >
                  <AccordionTrigger className="text-left font-bold text-lg py-6 hover:no-underline text-white/80 group">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground/60 leading-relaxed pb-8 font-medium">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </div>

        <div className="mt-24 text-center">
          <div className="inline-block p-10 rounded-[40px] border border-white/5 bg-[#0A0A0B] relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <MessageSquare className="w-10 h-10 text-primary mb-6 mx-auto" />
            <h3 className="text-2xl font-black uppercase tracking-tight mb-2">Still have questions?</h3>
            <p className="text-sm text-muted-foreground/60 mb-8 max-w-xs mx-auto">
              Our engineering team is ready to help you with anything you need.
            </p>
            <button className="px-8 py-3 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-[11px] transition-all hover:bg-white/90 active:scale-95">
              Contact Support
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
