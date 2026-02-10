import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Check, ArrowRight } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    desc: "Try it out with 5 free generations.",
    features: ["5 AI generations", "Export ZIP", "Community support"],
    cta: "Get started",
    href: "/auth/signup",
    variant: "outline" as const,
  },
  {
    name: "BYOK",
    price: "$0",
    period: "bring your key",
    desc: "Unlimited generations with your own API keys.",
    features: ["Unlimited generations", "Your own API keys", "Export ZIP & GitHub", "All providers", "Priority support"],
    cta: "Start with BYOK",
    href: "/auth/signup",
    variant: "hero" as const,
    popular: true,
  },
  {
    name: "Premium",
    price: "$29",
    period: "/month",
    desc: "We handle the API costs. Just build.",
    features: ["Unlimited generations", "No API key needed", "Export ZIP & GitHub", "All providers", "Deploy to Vercel", "Priority support"],
    cta: "Go Premium",
    href: "/auth/signup",
    variant: "hero-outline" as const,
  },
];

const Pricing = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <div className="pt-32 pb-20 px-4">
      <div className="container mx-auto">
        <div className="text-center mb-14">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Simple, transparent pricing</h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Start free. Scale with your own keys. Or let us handle everything.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-xl border p-6 md:p-8 flex flex-col ${
                plan.popular
                  ? "border-primary/50 bg-gradient-card glow-primary"
                  : "border-border bg-card"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-hero text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                  Most Popular
                </div>
              )}
              <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
              <div className="mt-3 mb-1">
                <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                <span className="text-sm text-muted-foreground ml-1">{plan.period}</span>
              </div>
              <p className="text-sm text-muted-foreground mb-6">{plan.desc}</p>
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-primary shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button variant={plan.variant} className="w-full" asChild>
                <Link to={plan.href}>
                  {plan.cta}
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
    <Footer />
  </div>
);

export default Pricing;
