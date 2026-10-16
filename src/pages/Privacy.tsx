import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Shield, Eye, Lock, Database } from "lucide-react";
import { motion } from "framer-motion";

export default function Privacy() {
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
            <Shield className="w-3.5 h-3.5" />
            Privacy First
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase mb-6 leading-none">
            Privacy <span className="text-primary italic">Policy</span>
          </h1>
          <p className="text-lg text-muted-foreground/60 font-medium">Last updated: February 10, 2026</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-12 text-muted-foreground/80 leading-relaxed font-medium"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {[
              { icon: Lock, title: "Browser-local BYOK", desc: "If you use your own AI key, Asooju stores it locally in this browser on this device." },
              { icon: Eye, title: "No Data Selling", desc: "We never monetize your personal or project data with third parties." },
            ].map((item, i) => (
              <div key={i} className="p-6 rounded-3xl border border-white/5 bg-white/[0.01]">
                <item.icon className="w-6 h-6 text-primary mb-4" />
                <h4 className="text-sm font-bold text-white uppercase tracking-tight mb-2">{item.title}</h4>
                <p className="text-xs">{item.desc}</p>
              </div>
            ))}
          </div>

          <section>
            <h2 className="text-xl font-bold text-white uppercase tracking-tight mb-4 flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              1. Information We Collect
            </h2>
            <p>We collect account and usage information needed to operate Asooju. If you choose BYOK, your AI provider key is stored locally in your browser rather than in the Asooju project database.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white uppercase tracking-tight mb-4 flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              2. How We Use Your Data
            </h2>
            <p>Your data is used to provide the service, send transactional emails, and improve the platform context. API keys are used solely to make AI requests on your behalf.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white uppercase tracking-tight mb-4 flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              3. Data Storage & Security
            </h2>
            <p>Connections to Asooju and supported third-party services use HTTPS/TLS. Data stored by our infrastructure is protected using the security controls provided by our hosting and database providers. BYOK keys stored in your browser are not presented as server-side encrypted vault secrets.</p>
          </section>

          <section className="p-8 rounded-[32px] border border-white/5 bg-white/[0.01] flex items-start gap-6">
            <Database className="w-8 h-8 text-primary shrink-0" />
            <div>
              <h3 className="text-lg font-bold text-white uppercase tracking-tight mb-2">Data Portability</h3>
              <p className="text-sm">You have the right to request a full extract of your data or account deletion at any time. Simply contact privacy@asooju.dev to initiate the process.</p>
            </div>
          </section>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
