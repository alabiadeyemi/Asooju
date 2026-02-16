import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Folder, Search, LayoutGrid, List, Filter,
  MoreVertical, ArrowUpRight, Clock, Plus,
  ShieldCheck, Activity, BrainCircuit, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

// Types for project
interface ProjectData {
  id: string;
  name: string;
  created_at: string;
  prompt: string;
  is_published: boolean;
  code?: string;
}

const Projects = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState("");
  const [projectsList, setProjectsList] = useState<ProjectData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchUserProjects();
    }
  }, [user]);

  const fetchUserProjects = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProjectsList(data || []);
    } catch (error: any) {
      console.error("Error fetching projects:", error);
      toast.error("Failed to load projects");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProjects = projectsList.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  return (
    <div className="min-h-screen bg-[#020202] text-white p-6 lg:p-12 selection:bg-primary/30 relative">
      {/* Background Atmosphere */}
      <div className="fixed inset-0 bg-noise opacity-[0.02] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-primary/5 blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="space-y-2">
            <h1 className="text-4xl font-black uppercase tracking-tighter text-white">Your Projects</h1>
            <p className="text-muted-foreground/60 text-sm">
              {isLoading ? "Retrieving from cloud..." : `You have ${projectsList.length} architecture blueprints.`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" className="rounded-xl border-white/5 bg-white/5 hover:bg-white/10 text-[11px] font-bold uppercase tracking-widest px-5 h-10">
              <Filter className="w-3.5 h-3.5 mr-2" />
              Sort By
            </Button>
            <Button variant="hero" asChild className="rounded-xl bg-white text-black hover:bg-white/90 text-[11px] font-bold uppercase tracking-widest px-6 h-10 shadow-xl shadow-white/5">
              <Link to="/app/new">
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Link>
            </Button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-2 bg-[#0A0A0B]/80 backdrop-blur-3xl border border-white/5 rounded-[22px] mb-8">
          <div className="relative w-full sm:w-80 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground opacity-30 group-hover:opacity-100 transition-opacity" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none pl-12 h-11 text-sm focus-visible:ring-0 placeholder:text-muted-foreground/30"
            />
          </div>

          <div className="flex items-center bg-black border border-white/5 rounded-2xl p-1 shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-muted-foreground hover:text-white'}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-muted-foreground hover:text-white'}`}
            >
              <List className="w-3.5 h-3.5" />
              List
            </button>
          </div>
        </div>

        {/* Dynamic Content Area */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Accessing Vault</span>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredProjects.map((project, idx) => (
                <motion.div
                  key={project.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Link
                    to={`/app/projects/${project.id}`}
                    className="group relative block p-6 rounded-[28px] bg-[#0A0A0B]/50 border border-white/5 hover:border-primary/20 transition-all hover:bg-[#0C0C0D] hover:shadow-2xl hover:shadow-primary/5 active:scale-[0.98]"
                  >
                    <div className="flex items-start justify-between mb-8">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                          <BrainCircuit className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-white leading-tight">{project.name}</h3>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/50">GPT-4o Managed</span>
                            <div className="w-1 h-1 rounded-full bg-white/10" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/50">{project.is_published ? 'Live' : 'Blueprint'}</span>
                          </div>
                        </div>
                      </div>
                      <div className={`px-2.5 py-1 rounded-full border border-white/5 bg-white/5 flex items-center gap-2`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${project.is_published ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-primary'}`} />
                        <span className="text-[9px] font-bold uppercase tracking-wider text-white opacity-50">{project.is_published ? 'Published' : 'Active'}</span>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground/60 leading-relaxed mb-8 line-clamp-2">
                      {project.prompt || "No architecture prompt available."}
                    </p>

                    <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 text-muted-foreground/30" />
                        <span className="text-[10px] font-medium text-muted-foreground/40">{formatTime(project.created_at)}</span>
                      </div>
                      <div className="flex -space-x-2">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="w-6 h-6 rounded-full border-2 border-[#0A0A0B] bg-white/5 flex items-center justify-center">
                            <Activity className="w-3 h-3 text-muted-foreground/30" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="bg-[#0A0A0B]/50 border border-white/5 rounded-[32px] overflow-hidden backdrop-blur-3xl">
            <table className="w-full text-left">
              <thead className="border-b border-white/5 bg-white/5">
                <tr>
                  <th className="px-8 py-5 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">Project Name</th>
                  <th className="px-8 py-5 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40 hidden md:table-cell">Status</th>
                  <th className="px-8 py-5 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40 hidden lg:table-cell">AI Model</th>
                  <th className="px-8 py-5 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40 text-right">Last Saved</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredProjects.map((project) => (
                  <tr key={project.id} className="group hover:bg-white/[0.02] transition-colors cursor-pointer">
                    <td className="px-8 py-6">
                      <Link to={`/app/projects/${project.id}`} className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center shrink-0">
                          <Folder className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <div>
                          <div className="text-[15px] font-bold text-white group-hover:text-primary transition-colors">{project.name}</div>
                          <div className="text-xs text-muted-foreground/40 mt-1">{project.prompt?.slice(0, 45)}...</div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-8 py-6 hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${project.is_published ? 'bg-green-500' : 'bg-primary'}`} />
                        <span className="text-[11px] font-medium text-muted-foreground">{project.is_published ? 'Published' : 'Active'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 hidden lg:table-cell">
                      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/5 w-fit">
                        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/60">GPT-4o</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <span className="text-[11px] font-medium text-muted-foreground/30">{formatTime(project.created_at)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty State */}
        {filteredProjects.length === 0 && (
          <div className="py-32 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/5 flex items-center justify-center">
              <Search className="w-8 h-8 text-muted-foreground/20" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white opacity-40 uppercase tracking-widest">Nothing found</h3>
              <p className="text-sm text-muted-foreground/30">We couldn't find any projects matching your search.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Projects;
