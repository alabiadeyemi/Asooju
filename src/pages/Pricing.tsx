import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Check, ArrowRight, Zap, Shield, Rocket, Cpu, Globe, Heart, RefreshCcw, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useCheckout } from "@/hooks/use-checkout";
import { useAuth } from "@/hooks/use-auth";
import { Logo } from "@/components/ui/logo";
import { FREE_WELCOME_CREDITS, PRO_MONTHLY_CREDITS, PRO_PRICE_LABEL } from "@/lib/billing";

const plans = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "to start",
    desc: `Build with our platform key — ${FREE_WELCOME_CREDITS} prompts included.`,
    features: [
      `${FREE_WELCOME_CREDITS} platform prompts (our API key)`,
      "Live preview + templates",
      "Export ZIP",
      "Upgrade anytime",
    ],
    cta: "Start free",
    variant: "outline" as const,
    icon: Sparkles,
  },
  {
    id: "byok",
    name: "BYOK",
    price: "$0",
    period: "bring your key",
    desc: "Unlimited builds on your own OpenAI / Gemini / Claude / Grok / DeepSeek keys.",
    features: [
      "Unlimited generations",
      "Your keys stay in the browser",
      "All providers",
      "Export ZIP & GitHub",
      "No platform credit burn",
    ],
    cta: "Use your keys",
    variant: "hero" as const,
    popular: true,
    icon: Cpu,
  },
  {
    id: "pro",
    name: "Pro",
    price: PRO_PRICE_LABEL,
    period: "/month",
    desc: `We host the models. ${PRO_MONTHLY_CREDITS} credits / month via Stripe — same pattern as Lovable.`,
    features: [
      `${PRO_MONTHLY_CREDITS} platform credits / month`,
      "No API key required",
      "Stripe Customer Portal",
      "Priority generation",
      "Export ZIP & GitHub",
    ],
    cta: "Subscribe with Stripe",
    variant: "outline" as const,
    icon: Rocket,
  },
];

export default function Pricing() {
  const { startCheckout, isProcessing } = useCheckout();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handlePlanSelection = (plan: (typeof plans)[0]) => {
    if (plan.id === "free" || plan.id === "byok") {
      if (user) navigate(plan.id === "byok" ? "/app/settings/keys" : "/app");
      else navigate("/auth/signup");
      return;
    }
    startCheckout("Pro", plan.price);
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white relative overflow-hidden selection:bg-primary/30 font-sans antialiased">
      <div className="fixed inset-0 bg-noise opacity-[0.03] pointer-events-none" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-primary/5 blur-[150px] pointer-events-none" />

      <Navbar />

      <main className="container mx-auto px-4 pt-32 pb-32 relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-20"
        >
          <div className="inline-flex items-center gap-3 rounded-full border border-white/5 bg-white/5 px-4 py-1.5 text-[11px] font-black uppercase tracking-widest text-primary mb-8 backdrop-blur-xl">
            <Logo size="sm" />
            Credits · Stripe · BYOK
          </div>
          <h1 className="text-5xl md:text-8xl font-black tracking-tighter uppercase mb-6 leading-none">
            Choose your <br /> <span className="text-primary italic">Strategy</span>
          </h1>
          <p className="text-lg text-muted-foreground/60 max-w-2xl mx-auto font-medium">
            Free users get {FREE_WELCOME_CREDITS} prompts on our key. Pro renews monthly credits through Stripe
            (Lovable-style). Or bring your own key and never touch our balance.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`group relative rounded-[40px] border p-10 flex flex-col items-start text-left transition-all duration-500 overflow-hidden ${
                plan.popular
                  ? "border-primary/20 bg-primary/[0.02] shadow-[0_0_80px_rgba(34,197,94,0.05)]"
                  : "border-white/5 bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/10"
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-10 -translate-y-1/2 bg-primary text-black text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-full shadow-2xl">
                  Most Popular
                </div>
              )}

              <div className="absolute -top-10 -right-10 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                <plan.icon className="w-48 h-48" />
              </div>

              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-8 border ${
                  plan.popular
                    ? "bg-primary/20 border-primary/20 text-primary"
                    : "bg-white/5 border-white/10 text-white/40"
                }`}
              >
                <plan.icon className="w-6 h-6" />
              </div>

              <h3 className="text-2xl font-black uppercase tracking-tight mb-2">{plan.name}</h3>
              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-5xl font-black tracking-tighter">{plan.price}</span>
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground/40">
                  {plan.period}
                </span>
              </div>
              <p className="text-sm text-muted-foreground/60 font-medium mb-10 leading-relaxed">{plan.desc}</p>

              <div className="w-full h-px bg-white/5 mb-10" />

              <ul className="space-y-4 mb-12 flex-1 w-full">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm font-medium text-white/80">
                    <Check className="h-4 w-4 text-primary shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                variant={plan.variant}
                className={`w-full h-14 rounded-2xl font-black uppercase tracking-widest text-[12px] shadow-2xl transition-all active:scale-95 flex items-center gap-3 ${
                  plan.variant === "hero"
                    ? "bg-white text-black hover:bg-white/90"
                    : "border-white/10 text-white hover:bg-white/5"
                }`}
                onClick={() => handlePlanSelection(plan)}
                disabled={isProcessing && plan.id === "pro"}
              >
                {isProcessing && plan.id === "pro" ? (
                  <RefreshCcw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {plan.cta}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </motion.div>
          ))}
        </div>

        <div className="mt-32 pt-20 border-t border-white/5 grid grid-cols-2 md:grid-cols-4 gap-12 max-w-4xl mx-auto opacity-20 hover:opacity-40 transition-opacity">
          <div className="flex items-center gap-3 justify-center">
            <Shield className="w-5 h-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Stripe checkout</span>
          </div>
          <div className="flex items-center gap-3 justify-center">
            <Globe className="w-5 h-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Server-side keys</span>
          </div>
          <div className="flex items-center gap-3 justify-center">
            <Heart className="w-5 h-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Credits metered</span>
          </div>
          <div className="flex items-center gap-3 justify-center">
            <Zap className="w-5 h-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">BYOK escape hatch</span>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
