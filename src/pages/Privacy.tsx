import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const Privacy = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <div className="pt-32 pb-20 px-4">
      <div className="container mx-auto max-w-2xl prose prose-invert prose-sm">
        <h1 className="text-4xl font-bold text-foreground mb-8">Privacy Policy</h1>
        <p className="text-muted-foreground mb-6">Last updated: February 10, 2026</p>

        <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">1. Information We Collect</h2>
        <p className="text-muted-foreground mb-4">We collect your email address, usage data, and optionally your API keys (encrypted). We do not sell your personal data.</p>

        <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">2. How We Use Your Data</h2>
        <p className="text-muted-foreground mb-4">Your data is used to provide the service, send transactional emails, and improve the platform. API keys are used solely to make AI requests on your behalf.</p>

        <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">3. Data Storage</h2>
        <p className="text-muted-foreground mb-4">All data is encrypted at rest and in transit. API keys are stored with AES-256 encryption. Project data is stored in isolated environments.</p>

        <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">4. Third-Party Services</h2>
        <p className="text-muted-foreground mb-4">We use Stripe for payments and third-party AI providers for code generation. These services have their own privacy policies.</p>

        <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">5. Your Rights</h2>
        <p className="text-muted-foreground mb-4">You may request deletion of your account and data at any time. Contact support@buildship.dev for data requests.</p>

        <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">6. Contact</h2>
        <p className="text-muted-foreground mb-4">For privacy-related inquiries, email privacy@buildship.dev.</p>
      </div>
    </div>
    <Footer />
  </div>
);

export default Privacy;
