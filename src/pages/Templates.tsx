import { motion, AnimatePresence } from "framer-motion";
import {
    Search, Layout, ShoppingBag, MessageSquare,
    Monitor, Layers, RefreshCcw, ArrowRight, Target, FileCode
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useProjects } from "@/hooks/use-projects";
import { Logo } from "@/components/ui/logo";
import { PROJECT_TEMPLATES } from "@/lib/templates";
import { cloneVfs } from "@/lib/vfs";

const templateCategories = [
    "All", "Dashboards", "Blog", "E-Commerce", "Portfolio", "AI Apps", "Landing Pages"
];

const templateMeta: Record<string, { img: string; icon: any; views: string; likes: number }> = {
    blank: { img: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop", icon: Target, views: "—", likes: 0 },
    saas: { img: "https://images.unsplash.com/photo-1551288049-bbda38a10ad5?q=80&w=1200&auto=format&fit=crop", icon: Layout, views: "seed", likes: 0 },
    ecommerce: { img: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1200&auto=format&fit=crop", icon: ShoppingBag, views: "seed", likes: 0 },
    chat: { img: "https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=1200&auto=format&fit=crop", icon: MessageSquare, views: "seed", likes: 0 },
    portfolio: { img: "https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?q=80&w=1200&auto=format&fit=crop", icon: Monitor, views: "seed", likes: 0 },
    blog: { img: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?q=80&w=1200&auto=format&fit=crop", icon: Layers, views: "seed", likes: 0 },
};

const templates = PROJECT_TEMPLATES.map((t) => ({
    ...t,
    ...(templateMeta[t.id] || templateMeta.blank),
}));

const Templates = () => {
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");
    const { createProject, isCreating } = useProjects();

    const filteredTemplates = templates.filter(t =>
        (selectedCategory === "All" || t.category === selectedCategory) &&
        (t.title.toLowerCase().includes(searchQuery.toLowerCase()) || t.desc.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="min-h-screen bg-[#020202] text-white relative overflow-hidden selection:bg-primary/30 font-sans antialiased">
            {/* Soft Background Atmosphere */}
            <div className="fixed inset-0 bg-noise opacity-[0.03] pointer-events-none" />
            <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-primary/5 blur-[150px] pointer-events-none" />

            <Navbar />

            <main className="container mx-auto px-4 pt-32 pb-24 relative z-10">
                {/* Header Section */}
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-16">
                    <div className="max-w-2xl">
                        <div className="flex items-center gap-3 text-primary mb-4">
                            <Logo size="sm" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Community Marketplace</span>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase mb-6 leading-none">
                            Start with a <br /> <span className="text-primary italic">Template</span>
                        </h1>
                        <p className="text-lg text-muted-foreground font-medium leading-relaxed">
                            Real multifile starters — not just prompts. Open a template and the workspace is ready to preview.
                        </p>
                    </div>

                    <div className="lg:w-80">
                        <div className="rounded-3xl border border-white/5 bg-[#080808]/50 p-6 backdrop-blur-3xl">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                                    <FileCode className="w-5 h-5 text-primary" />
                                </div>
                                <div className="text-[11px] font-black uppercase tracking-widest leading-none">
                                    Seeded VFS
                                </div>
                            </div>
                            <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">
                                Each template ships with App.tsx + components. Customize in chat after you open it.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Filter & Search Bar */}
                <div className="flex flex-col md:flex-row items-center gap-6 mb-12 p-2 rounded-[28px] border border-white/5 bg-white/[0.02] backdrop-blur-xl">
                    <div className="relative flex-1 w-full pl-4">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/30" />
                        <input
                            type="text"
                            placeholder="Search for templates (e.g. 'Dashboard')..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-transparent border-none py-4 px-10 text-sm font-medium focus:ring-0 placeholder:text-white/10"
                        />
                    </div>

                    <div className="h-10 w-px bg-white/5 hidden md:block" />

                    <div className="flex items-center gap-2 pr-2 overflow-x-auto w-full md:w-auto custom-scrollbar no-scrollbar">
                        {templateCategories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${selectedCategory === cat
                                    ? "bg-white text-black shadow-2xl"
                                    : "text-muted-foreground/40 hover:text-white hover:bg-white/5"
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Templates Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <AnimatePresence mode="popLayout">
                        {filteredTemplates.map((t, i) => (
                            <motion.div
                                key={t.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.4, delay: i * 0.05 }}
                                className="group"
                            >
                                <div className="rounded-[32px] border border-white/5 bg-[#080808]/50 overflow-hidden backdrop-blur-3xl hover:border-primary/20 transition-all duration-500 flex flex-col h-full">
                                    {/* Image Preview */}
                                    <div className="relative h-56 overflow-hidden">
                                        <img src={t.img} alt={t.title} className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-1000" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#080808] to-transparent opacity-60" />
                                        <div className="absolute top-4 right-4 h-8 px-3 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center gap-2 text-[10px] font-bold">
                                            <FileCode className="w-3 h-3 text-primary" />
                                            {Object.keys(t.vfs).length} files
                                        </div>
                                        <div className="absolute bottom-4 left-6 flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-xl border border-white/10 flex items-center justify-center text-primary">
                                                <t.icon className="w-5 h-5" />
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white py-1.5 px-3 bg-black/40 rounded-lg border border-white/5">
                                                {t.category}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-8 flex-1 flex flex-col">
                                        <h3 className="text-xl font-bold uppercase tracking-tight mb-2 group-hover:text-primary transition-colors">{t.title}</h3>
                                        <p className="text-xs text-muted-foreground/50 mb-6">{t.desc}</p>
                                        <div className="flex items-center gap-4 text-xs text-muted-foreground/40 font-bold uppercase tracking-widest mb-8">
                                            <span>{Object.keys(t.vfs).length} files</span>
                                            <div className="w-1 h-1 rounded-full bg-white/10" />
                                            <span>Ready to use</span>
                                        </div>
                                        <div className="mt-auto flex items-center gap-3">
                                            <Button
                                                variant="hero"
                                                onClick={() =>
                                                    createProject(t.prompt, {
                                                        templateId: t.id,
                                                        name: t.title,
                                                        vfs: cloneVfs(t.vfs),
                                                    })
                                                }
                                                disabled={isCreating}
                                                className="flex-1 rounded-2xl h-12 bg-white text-black font-black uppercase tracking-widest text-[11px] shadow-xl shadow-white/5 active:scale-95 transition-all"
                                            >
                                                {isCreating ? <RefreshCcw className="w-4 h-4 animate-spin" /> : "Use Template"}
                                                {!isCreating && <ArrowRight className="w-4 h-4 ml-2" />}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {/* Empty State */}
                {filteredTemplates.length === 0 && (
                    <div className="py-32 text-center">
                        <div className="w-20 h-20 rounded-[32px] bg-white/5 border border-white/5 flex items-center justify-center mx-auto mb-8 text-muted-foreground/20">
                            <Search className="w-10 h-10" />
                        </div>
                        <h3 className="text-2xl font-black uppercase tracking-widest text-white/20">No matching templates</h3>
                        <p className="text-muted-foreground/30 font-medium">Try searching for something else or browse categories.</p>
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
};

export default Templates;
