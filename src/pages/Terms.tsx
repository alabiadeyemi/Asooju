import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const Terms = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <div className="pt-32 pb-20 px-4">
      <div className="container mx-auto max-w-2xl prose prose-invert prose-sm">
        <h1 className="text-4xl font-bold text-foreground mb-8">Terms of Service</h1>
        <p className="text-muted-foreground mb-6">Last updated: February 10, 2026</p>

        <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">1. Acceptance of Terms</h2>
        <p className="text-muted-foreground mb-4">By accessing or using BuildShip, you agree to be bound by these Terms of Service. If you do not agree, do not use the service.</p>

        <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">2. Service Description</h2>
        <p className="text-muted-foreground mb-4">BuildShip provides AI-powered code generation tools. We generate code based on your prompts using third-party AI providers. Generated code is provided "as is" without warranty.</p>

        <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">3. Code Ownership</h2>
        <p className="text-muted-foreground mb-4">You own all code generated through BuildShip. We claim no intellectual property rights over your generated output.</p>

        <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">4. BYOK (Bring Your Own Key)</h2>
        <p className="text-muted-foreground mb-4">When using BYOK, you are responsible for your own API costs with third-party providers. BuildShip stores your keys encrypted and uses them solely to make requests on your behalf.</p>

        <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">5. Acceptable Use</h2>
        <p className="text-muted-foreground mb-4">You may not use BuildShip to generate malicious code, violate any laws, or infringe on intellectual property rights. We reserve the right to suspend accounts that violate these terms.</p>

        <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">6. Limitation of Liability</h2>
        <p className="text-muted-foreground mb-4">BuildShip is not liable for any damages arising from the use of generated code. You are responsible for reviewing, testing, and deploying code in your own environments.</p>
      </div>
    </div>
    <Footer />
  </div>
);

export default Terms;
