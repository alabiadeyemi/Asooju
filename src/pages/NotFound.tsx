import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, Ghost, Zap, Cpu, Sparkles } from "lucide-react";

const NotFound = () => {
  return (
    <div className="min-h-screen bg-[#020202] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden selection:bg-primary/30 font-sans">
      {/* Cinematic Background Atmosphere */}
      <div className="absolute inset-0 bg-noise opacity-[0.03] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 blur-[180px] pointer-events-none animate-pulse" />

      {/* Interactive Glitch Element */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative mb-8"
      >
        <div className="text-[180px] md:text-[240px] font-black tracking-tighter leading-none opacity-5 select-none italic">
          404
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Ghost className="w-24 h-24 text-primary animate-bounce opacity-80" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="text-center relative z-10"
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-white/5 bg-white/5 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-6 backdrop-blur-xl">
          <Zap className="w-3.5 h-3.5 fill-primary" />
          Lost in the Void
        </div>
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase mb-6 leading-none">
          Page Not <span className="text-primary italic">Found</span>
        </h1>
        <p className="text-muted-foreground/60 text-lg max-w-md mx-auto mb-12 font-medium leading-relaxed">
          The architecture you're looking for was either refactored out of existence or moved to a different coordinate.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            variant="hero"
            className="h-14 px-10 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-[11px] shadow-2xl transition-all active:scale-95 group"
            asChild
          >
            <Link to="/">
              <Home className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
          </Button>
          <Button
            variant="outline"
            className="h-14 px-10 rounded-2xl border-white/5 bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-widest text-[11px] group"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Go Back
          </Button>
        </div>
      </motion.div>

      {/* Decorative Technical Bits */}
      <div className="absolute bottom-12 left-12 flex items-center gap-4 opacity-20 hidden lg:flex">
        <div className="w-10 h-10 rounded-xl border border-white/10 flex items-center justify-center">
          <Cpu className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-widest text-white">System Error</span>
          <span className="text-[9px] font-mono text-muted-foreground">0x00404_VOID_ACCESS</span>
        </div>
      </div>

      <div className="absolute top-12 right-12 flex items-center gap-4 opacity-10 hidden lg:flex">
        <Sparkles className="w-8 h-8 text-primary" />
      </div>
    </div>
  );
};

export default NotFound;
