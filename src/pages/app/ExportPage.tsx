import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Download, GitBranch, Rocket, Copy, Check,
  Globe, ShieldCheck, Zap, ArrowRight,
  ExternalLink, Github, Terminal, Cpu,
  Cloud, Lock, RefreshCcw, Loader2
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { pushToGitHub } from "@/services/github-service";
import { toast } from "sonner";
import { Logo } from "@/components/ui/logo";

const ExportPage = () => {
  const { projectId } = useParams();
  const [isDeploying, setIsDeploying] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [projectCode, setProjectCode] = useState("");
  const { user, loginWithGitHub, gitHubToken } = useAuth();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (projectId) {
      fetchProject();
    }
  }, [projectId]);

  const fetchProject = async () => {
    const { data } = await supabase.from("projects").select("code").eq("id", projectId).single();
    if (data) setProjectCode(data.code || "");
  };

  const isGitHubConnected = !!gitHubToken;

  const handlePush = async () => {
    if (!gitHubToken) {
      toast.error("GitHub token not found. Please reconnect.");
      return;
    }

    setIsPushing(true);
    const toastId = toast.loading("Creating repository and pushing code...");

    try {
      const { url } = await pushToGitHub(
        gitHubToken,
        `shipkernel-${projectId?.slice(0, 8)}`,
        "App.tsx",
        projectCode
      );
      toast.success("Push Successful!", {
        id: toastId,
        description: `Source code is now live at ${url}`,
      });
    } catch (error: any) {
      toast.error("Push Failed", {
        id: toastId,
        description: error.message,
      });
    } finally {
      setIsPushing(false);
    }
  };

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeploy = () => {
    setIsDeploying(true);
    setTimeout(() => setIsDeploying(false), 3000);
  };

  return (
    <div className="min-h-full bg-[#020202] text-white p-6 lg:p-12 relative overflow-hidden font-sans">
      {/* Background Ambience */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-primary/5 blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-16">
          <div>
            <div className="flex items-center gap-2 text-primary mb-3">
              <Logo size="sm" />
              <span className="text-[10px] uppercase font-black tracking-[0.3em]">Ready for Launch</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase mb-4">Release Dashboard</h1>
            <p className="text-muted-foreground font-medium max-w-xl">
              Project ID: <span className="text-white font-mono text-xs">{projectId}</span> • Prepare your architecture for production deployment on ShipKernel.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
              <span className="text-[10px] font-black uppercase tracking-widest">ShipKernel Engine Active</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Deployment Options */}
          <div className="lg:col-span-8 space-y-6">

            {/* GitHub Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="group relative rounded-[32px] border border-white/5 bg-[#080808]/50 p-8 backdrop-blur-3xl overflow-hidden hover:border-primary/20 transition-all duration-500"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <Github className="w-32 h-32" />
              </div>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
                <div className="flex items-center gap-6">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-black shadow-2xl">
                    <GitBranch className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-1 uppercase tracking-tight">Version Control</h3>
                    <p className="text-sm text-muted-foreground">Push your code directly to a GitHub repository.</p>
                  </div>
                </div>
                <Button
                  onClick={isGitHubConnected ? undefined : loginWithGitHub}
                  variant={isGitHubConnected ? "outline" : "hero"}
                  className={isGitHubConnected ? "rounded-xl border-white/10 bg-white/5" : "rounded-xl bg-white text-black font-black uppercase tracking-widest px-8"}
                >
                  {isGitHubConnected ? <><Check className="w-4 h-4 mr-2" /> Connected</> : "Connect GitHub"}
                </Button>
              </div>

              {isGitHubConnected && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-8 pt-8 border-t border-white/5 flex flex-col md:flex-row gap-4"
                >
                  <div className="flex-1">
                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 ml-1">Repository Name</div>
                    <div className="flex gap-2">
                      <div className="flex-1 h-12 bg-white/5 border border-white/5 rounded-xl px-4 flex items-center text-sm font-mono text-white/40">
                        {user?.email?.split('@')[0] || 'user'}/shipkernel-{projectId?.slice(0, 8)}
                      </div>
                      <Button
                        onClick={handlePush}
                        disabled={isPushing}
                        variant="outline"
                        className="h-12 rounded-xl border-white/5 hover:bg-white/10 px-6 font-bold uppercase tracking-widest text-[11px] disabled:opacity-50"
                      >
                        {isPushing ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : null}
                        {isPushing ? "Pushing..." : "Push Now"}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>

            {/* Vercel / Cloud Deployment */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="group relative rounded-[32px] border border-white/5 bg-[#080808]/50 p-8 backdrop-blur-3xl overflow-hidden hover:border-primary/20 transition-all duration-500"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <Cloud className="w-32 h-32" />
              </div>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
                <div className="flex items-center gap-6">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-2xl">
                    <Rocket className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-1 uppercase tracking-tight">Live Hosting</h3>
                    <p className="text-sm text-muted-foreground">One-click deployment to global production servers.</p>
                  </div>
                </div>
                <Button
                  onClick={handleDeploy}
                  disabled={isDeploying}
                  variant="hero"
                  className="rounded-xl bg-primary text-primary-foreground font-black uppercase tracking-widest px-8 shadow-xl shadow-primary/20 active:scale-95 disabled:opacity-50"
                >
                  {isDeploying ? <><RefreshCcw className="w-4 h-4 mr-2 animate-spin" /> Deploying...</> : "Ship Live"}
                </Button>
              </div>

              {isDeploying && (
                <div className="mt-8 pt-8 border-t border-white/5">
                  <div className="flex justify-between mb-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">Provisioning Infrastructure...</span>
                    <span className="text-[10px] font-black text-muted-foreground">42%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 3 }}
                      className="h-full bg-primary"
                    />
                  </div>
                </div>
              )}
            </motion.div>

            {/* Static Export */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="group relative rounded-[32px] border border-white/5 bg-[#080808]/50 p-8 backdrop-blur-3xl overflow-hidden hover:border-white/10 transition-all duration-500"
            >
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-white shadow-2xl">
                    <Download className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-1 uppercase tracking-tight">Source Archive</h3>
                    <p className="text-sm text-muted-foreground">Download the complete source code as a ZIP file.</p>
                  </div>
                </div>
                <Button variant="outline" className="rounded-xl border-white/5 bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-widest px-8">
                  Download
                </Button>
              </div>
            </motion.div>
          </div>

          {/* Sidebar Stats/Info */}
          <div className="lg:col-span-4 space-y-6">
            <div className="rounded-[32px] border border-white/5 bg-[#080808] p-8">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-6">Build Vitals</h4>
              <div className="space-y-6">
                {[
                  { label: "Assets", value: "14.2 MB", icon: Globe },
                  { label: "Components", value: "48 Total", icon: Cpu },
                  { label: "Security", value: "Verified", icon: ShieldCheck, color: "text-green-500" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <item.icon className={`h-4 w-4 ${item.color || 'text-white/20'}`} />
                      <span className="text-xs font-bold text-white/60">{item.label}</span>
                    </div>
                    <span className="text-[11px] font-mono font-bold">{item.value}</span>
                  </div>
                ))}
              </div>

              <div className="mt-10 pt-8 border-t border-white/5">
                <div className="flex items-center gap-2 mb-4">
                  <Lock className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-white">Production Lock</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  All deployments are encrypted and follow SOC2 best practices. Your code ownership is 100% guaranteed.
                </p>
              </div>
            </div>

            <div className="rounded-[32px] bg-gradient-to-br from-primary/20 via-blue-500/5 to-transparent border border-primary/20 p-8 shadow-2xl">
              <Terminal className="w-8 h-8 text-white mb-6" />
              <h4 className="text-lg font-bold mb-2 uppercase tracking-tight">Advanced CLI</h4>
              <p className="text-sm text-muted-foreground mb-6">Want to deploy from your terminal? Grab the CLI tool.</p>
              <div className="bg-black/50 rounded-xl p-3 font-mono text-[10px] text-primary mb-6 border border-white/5">
                npm i -g @shipkernel/cli
              </div>
              <Button variant="ghost" className="w-full text-xs font-black uppercase tracking-widest hover:text-white group">
                Read Documentation
                <ExternalLink className="w-3 h-3 ml-2 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportPage;
