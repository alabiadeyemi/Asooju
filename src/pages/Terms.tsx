import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ShieldCheck, FileText } from "lucide-react";
import { motion } from "framer-motion";

export default function Terms() {
  return (
    <div className="min-h-screen bg-[#020202] text-white relative overflow-hidden selection:bg-primary/30 font-sans antialiased">
      {/* Background Ambience */}
      <div className="fixed inset-0 bg-noise opacity-[0.03] pointer-events-none" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-primary/5 blur-[150px] pointer-events-none" />

      <Navbar />

      <main className="container mx-auto px-4 pt-48 pb-32 relative z-10 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16 text-center md:text-left"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-white/5 bg-white/5 px-4 py-1.5 text-[11px] font-black uppercase tracking-widest text-primary mb-8 backdrop-blur-xl">
            <FileText className="w-3.5 h-3.5" />
            Legal Framework
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase mb-6 leading-none">
            Terms of <span className="text-primary italic">Service</span>
          </h1>
          <p className="text-lg text-muted-foreground/60 font-medium">Last updated: February 10, 2026</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-12 text-muted-foreground/80 leading-relaxed font-medium"
        >
          <section>
            <h2 className="text-xl font-bold text-white uppercase tracking-tight mb-4 flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              1. Acceptance of Terms
            </h2>
            <p>By accessing or using ShipKernel, you agree to be bound by these Terms of Service. If you do not agree, do not use the service.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white uppercase tracking-tight mb-4 flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              2. Service Description
            </h2>
            <p>ShipKernel provides AI-powered code generation tools. We generate code based on your prompts using third-party AI providers. Generated code is provided "as is" without warranty.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white uppercase tracking-tight mb-4 flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              3. Code Ownership
            </h2>
            <p>You own all code generated through ShipKernel. We claim no intellectual property rights over your generated output. You are free to commit, ship, and monetize the results.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white uppercase tracking-tight mb-4 flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              4. BYOK (Bring Your Own Key)
            </h2>
            <p>When using BYOK, you are responsible for charges, limits and terms imposed by the selected third-party AI provider. In the current browser-local BYOK mode, the key is stored on your device and used for generation requests. You are responsible for securing the device and revoking a key if you believe it has been exposed.</p>
          </section>

          <section className="p-8 rounded-[32px] border border-white/5 bg-white/[0.01] flex items-start gap-6">
            <ShieldCheck className="w-8 h-8 text-primary shrink-0" />
            <div>
              <h3 className="text-lg font-bold text-white uppercase tracking-tight mb-2">Secure Infrastructure</h3>
              <p className="text-sm">We take security seriously. Platform connections use HTTPS/TLS, and we follow industry-standard practices to protect account and project data.</p>
            </div>
          </section>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
