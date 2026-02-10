import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const faqs = [
  { q: "What is BYOK (Bring Your Own Key)?", a: "BYOK lets you use your own API keys from providers like OpenAI, Google Gemini, or Grok. You pay the provider directly for usage, and BuildShip charges nothing for generations. This gives you full control over costs and no generation limits." },
  { q: "How do I export my code?", a: "You can export as a ZIP file or push directly to a GitHub repository. The generated code is standard React + TypeScript with no proprietary lock-in. Deploy it anywhere — Vercel, Netlify, AWS, or your own server." },
  { q: "What providers are supported?", a: "We support OpenAI (GPT), Google Gemini, and Grok. You can switch between providers per-project or set a default in your account settings. BYOK users can add keys for any supported provider." },
  { q: "Is my data and code private?", a: "Yes. Your projects, code, and API keys are encrypted at rest and in transit. We never share your data with third parties. API keys are stored encrypted and are only used to make requests on your behalf." },
  { q: "Can I get a refund?", a: "Premium subscriptions can be cancelled at any time. We offer a 14-day money-back guarantee — if you're not happy, contact support for a full refund." },
  { q: "What stack does BuildShip generate?", a: "The default stack is React + TypeScript for the frontend, serverless API routes for the backend, and PostgreSQL for the database. We generate proper types, schemas, and connections between all layers." },
  { q: "Do I need to know how to code?", a: "Not necessarily. BuildShip is designed for developers but can be used by anyone comfortable with basic tech concepts. The generated code is clean and well-documented, making it easy to modify even for beginners." },
  { q: "Can I use BuildShip for commercial projects?", a: "Absolutely. You own 100% of the generated code. Use it for personal projects, client work, startups — anything you want." },
];

const FAQ = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <div className="pt-32 pb-20 px-4">
      <div className="container mx-auto max-w-3xl">
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-4">FAQ</h1>
        <p className="text-lg text-muted-foreground text-center mb-12">
          Everything you need to know about BuildShip.
        </p>
        <div className="space-y-4">
          {faqs.map((faq) => (
            <div key={faq.q} className="rounded-lg border border-border bg-card p-6">
              <h3 className="font-semibold text-foreground mb-2">{faq.q}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
    <Footer />
  </div>
);

export default FAQ;
