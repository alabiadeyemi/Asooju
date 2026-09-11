import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Plus, Folder, Zap, BarChart3,
  ShieldCheck, Activity, BrainCircuit,
  Clock, ArrowUpRight, Search,
  Settings2, ChevronRight, LayoutGrid,
  List, Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Logo } from "@/components/ui/logo";

interface ProjectData {
  id: string;
  name: string;
  created_at: string;
  prompt: string;
  is_published: boolean;
  code?: string;
}

const Dashboard = () => {
  const [projectsList, setProjectsList] = useState<ProjectData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isGuest } = useAuth();

  const activityFeed = [
    {
      type: "Sync",
      message: projectsList.length > 0
        ? `Maintained sync with ${projectsList[0].name}`
        : "Checking cloud repository connectivity",
      time: "Just now",
      icon: ShieldCheck,
      color: "text-green-500"
    },
    { type: "System", message: "AI Engine warmed up and ready for blueprints", time: "1h ago", icon: BrainCircuit, color: "text-primary" },
    { type: "Security", message: "Session active", time: "3d ago", icon: Activity, color: "text-purple-500" },
  ];

  useEffect(() => {
    if (user) fetchUserProjects();
    else setIsLoading(false);
  }, [user, isGuest]);

  const fetchUserProjects = async () => {
    try {
      setIsLoading(true);
      if (isGuest || user?.id === "guest-user-000") {
        const { readLocalProjects } = await import("@/hooks/use-projects");
        setProjectsList(readLocalProjects().slice(0, 3) as any);
        return;
      }
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      setProjectsList(data || []);
    } catch (error: any) {
      console.error("Error fetching projects:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (mins > 0) return `${mins}m ago`;
    return 'just now';
  };

  const calculateStorage = () => {
    const totalBytes = projectsList.reduce((acc, p) => acc + (p.code?.length || 0), 0);
    if (totalBytes === 0) return "0.0 KB";
    return (totalBytes / 1024).toFixed(1) + " KB";
  };

  const stats = [
    { label: "Projects", value: projectsList.length.toString(), sub: isGuest ? "Stored locally" : "In your account", icon: BrainCircuit, color: "from-blue-500/10 to-transparent" },
    { label: "Storage", value: calculateStorage(), sub: "Approx. code size", icon: BarChart3, color: "from-orange-500/10 to-transparent" },
    { label: "Mode", value: isGuest ? "Guest" : "Cloud", sub: isGuest ? "Local only" : "Supabase sync", icon: ShieldCheck, color: "from-green-500/10 to-transparent" },
    { label: "Workspace", value: "VFS", sub: "Multifile preview", icon: Activity, color: "from-purple-500/10 to-transparent" },
  ];

  return (
    <div className="min-h-full bg-[#020202] text-white p-6 lg:p-10">
      {/* Background Ambience */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-primary/5 blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Logo size="sm" />
              <span className="text-[10px] uppercase font-bold tracking-[0.3em] text-primary">Dashboard</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white mb-2">My Overview</h1>
            <p className="text-sm text-muted-foreground font-medium">
              {isLoading ? "Retrieving from cloud..." : `You have ${projectsList.length} architecture blueprints.`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-white/5 border border-white/5 rounded-full px-4 py-2 mr-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input type="text" placeholder="Search projects..." className="bg-transparent border-none outline-none text-xs w-32 placeholder:text-muted-foreground/50" />
            </div>
            <Button variant="hero" className="rounded-full px-6 h-11 bg-white text-black hover:bg-white/90 font-bold shadow-xl shadow-white/5" asChild>
              <Link to="/app/new">
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Link>
            </Button>
          </div>
        </div>

        {/* Vital Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`rounded-2xl border border-white/5 bg-white/[0.02] p-6 hover:bg-white/[0.04] transition-all relative overflow-hidden group`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-white/5 border border-white/5 shadow-2xl">
                    <Logo size="sm" />
                  </div>
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</div>
                </div>
                <div className="text-3xl font-black mb-1">{stat.value}</div>
                <div className="text-[11px] text-muted-foreground font-medium">{stat.sub}</div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main List Section */}
          <div className="lg:col-span-8 space-y-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Folder className="w-5 h-5 text-primary" />
                Running Projects
              </h2>
              <div className="flex gap-2 p-1 bg-white/5 rounded-lg border border-white/5">
                <button className="p-1.5 rounded-md bg-white/10 text-white"><LayoutGrid className="w-4 h-4" /></button>
                <button className="p-1.5 rounded-md text-muted-foreground hover:text-white"><List className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Syncing with Mainframe</span>
                </div>
              ) : projectsList.length > 0 ? (
                projectsList.map((project, i) => (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                  >
                    <Link
                      to={`/app/projects/${project.id}`}
                      className="group flex flex-col md:flex-row items-center gap-6 rounded-2xl border border-white/5 bg-white/[0.02] p-6 hover:border-primary/20 hover:bg-white/[0.04] transition-all"
                    >
                      <div className="w-full md:w-32 h-24 rounded-xl bg-black border border-white/5 overflow-hidden relative grayscale group-hover:grayscale-0 transition-all text-primary/10">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <BrainCircuit className="w-8 h-8 opacity-20 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                        </div>
                      </div>

                      <div className="flex-1 text-center md:text-left">
                        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold group-hover:text-primary transition-colors">{project.name}</h3>
                          <div className={`flex items-center gap-2 justify-center md:justify-start`}>
                            <div className={`w-2 h-2 rounded-full ${project.is_published ? 'bg-green-500' : 'bg-primary'} shadow-[0_0_8px_rgba(34,197,94,0.3)]`} />
                            <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">{project.is_published ? 'Live' : 'Blueprint'}</span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed max-w-md line-clamp-1">{project.prompt}</p>
                      </div>

                      <div className="flex flex-row md:flex-col items-center md:items-end gap-6 md:gap-2">
                        <span className="text-[11px] font-bold bg-white/5 px-3 py-1 rounded-full text-muted-foreground">GPT-4o</span>
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {formatTime(project.created_at)}
                        </div>
                      </div>

                      <div className="hidden md:flex items-center justify-center w-10 h-10 rounded-full border border-white/10 group-hover:bg-primary group-hover:border-primary group-hover:text-black transition-all">
                        <ChevronRight className="w-5 h-5" />
                      </div>
                    </Link>
                  </motion.div>
                ))
              ) : (
                <div className="p-12 text-center rounded-[32px] border-2 border-dashed border-white/5 bg-white/[0.01]">
                  <Folder className="w-12 h-12 text-muted-foreground/10 mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground/40 font-bold uppercase tracking-widest">No Active Blueprints</p>
                </div>
              )}

              <Link
                to="/app/new"
                className="group rounded-2xl border-2 border-dashed border-white/5 p-8 flex items-center justify-center hover:border-primary/30 hover:bg-primary/[0.02] transition-all"
              >
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 group-hover:text-primary transition-all">
                    <Plus className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-bold text-muted-foreground group-hover:text-primary transition-colors">Start New Project</span>
                </div>
              </Link>
            </div>
          </div>

          {/* Activity/Logs Sidebar */}
          <div className="lg:col-span-4 space-y-8">
            <div className="rounded-[32px] border border-white/5 bg-[#080808] p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-sm font-bold uppercase tracking-widest text-white/50">Recent Activity</h2>
                <Settings2 className="w-4 h-4 text-muted-foreground hover:text-white cursor-pointer" />
              </div>

              <div className="space-y-8">
                {activityFeed.map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 + i * 0.1 }}
                    className="flex gap-4 relative"
                  >
                    {i !== activityFeed.length - 1 && (
                      <div className="absolute left-[17px] top-10 bottom-[-32px] w-px bg-white/5" />
                    )}
                    <div className={`w-9 h-9 shrink-0 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center ${item.color}`}>
                      <item.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-bold text-white uppercase tracking-wider">{item.type}</span>
                        <span className="text-[10px] text-muted-foreground">• {item.time}</span>
                      </div>
                      <p className="text-[13px] text-muted-foreground leading-relaxed">{item.message}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <Button variant="ghost" className="w-full mt-12 text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-white group" asChild>
                <Link to="/app/projects">
                  View All Projects
                  <ArrowUpRight className="w-3 h-3 ml-2 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </Link>
              </Button>
            </div>

            {/* AI Capability Highlight */}
            <div className="rounded-[32px] bg-gradient-to-br from-primary/20 via-blue-500/5 to-transparent border border-primary/20 p-8 shadow-2xl shadow-primary/5">
              <div className="w-12 h-12 rounded-2xl bg-white text-black flex items-center justify-center mb-6 shadow-xl">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Better Plan</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                Get faster updates and better security for all your projects.
              </p>
              <Button className="w-full rounded-xl bg-white text-black font-bold h-11 hover:bg-white/90" asChild>
                <Link to="/pricing">View Pricing</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
