import { Link, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FolderOpen,
  Settings,
  CreditCard,
  Key,
  Cpu,
  ShieldCheck,
  Plus,
  Zap,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/ui/logo";

const sidebarLinks = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/projects", label: "Projects", icon: FolderOpen },
  { href: "/app/new", label: "New Project", icon: Plus },
  { divider: true },
  { href: "/app/settings", label: "Account", icon: Settings },
  { href: "/app/settings/billing", label: "Billing", icon: CreditCard },
  { href: "/app/settings/keys", label: "API Keys", icon: Key },
  { href: "/app/settings/providers", label: "AI Models", icon: Cpu },
  { divider: true },
  { href: "/admin", label: "Admin", icon: ShieldCheck },
] as const;

export const AppLayout = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[#020202]">
      {/* Mobile sidebar toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 rounded-xl bg-black border border-white/10 shadow-2xl backdrop-blur-xl"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X className="h-5 w-5 text-white" /> : <Menu className="h-5 w-5 text-white" />}
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-40 w-64 border-r border-white/5 bg-[#080808] flex flex-col transition-transform lg:translate-x-0 duration-300 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center gap-2 px-6 border-b border-white/5 bg-[#0A0A0B]">
          <Link to="/" className="hover:opacity-80 transition-opacity">
            <Logo showText />
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8">
          <div>
            <p className="px-3 text-[10px] uppercase font-bold tracking-[0.2em] text-muted-foreground/50 mb-4">Main</p>
            <nav className="space-y-1">
              {sidebarLinks.filter(l => !("divider" in l) && !l.href.includes("settings") && l.label !== "Admin").map((item) => {
                const Icon = (item as any).icon;
                const isActive = location.pathname === (item as any).href;
                return (
                  <Link
                    key={(item as any).href}
                    to={(item as any).href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all group relative",
                      isActive
                        ? "text-primary bg-primary/5"
                        : "text-muted-foreground hover:text-white hover:bg-white/5"
                    )}
                  >
                    <Icon className={cn("h-4 w-4", isActive ? "text-primary" : "opacity-50 group-hover:opacity-100 transition-opacity")} />
                    {(item as any).label}
                    {isActive && (
                      <motion.div layoutId="activeNav" className="absolute left-0 w-1 h-4 bg-primary rounded-full" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div>
            <p className="px-3 text-[10px] uppercase font-bold tracking-[0.2em] text-muted-foreground/50 mb-4">Settings</p>
            <nav className="space-y-1">
              {sidebarLinks.filter(l => !("divider" in l) && (l.href.includes("settings") || l.label === "Admin")).map((item) => {
                const Icon = (item as any).icon;
                const isActive = location.pathname === (item as any).href;
                return (
                  <Link
                    key={(item as any).href}
                    to={(item as any).href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all group relative",
                      isActive
                        ? "text-primary bg-primary/5"
                        : "text-muted-foreground hover:text-white hover:bg-white/5"
                    )}
                  >
                    <Icon className={cn("h-4 w-4", isActive ? "text-primary" : "opacity-50 group-hover:opacity-100 transition-opacity")} />
                    {(item as any).label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="p-4 border-t border-white/5 bg-[#060606]">
          <div className="p-4 rounded-xl bg-white/5 border border-white/5 mb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
              <span className="text-[11px] font-bold text-white uppercase tracking-wider">AI Active</span>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">Ready to help. AI is connected and waiting for you.</p>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-3 text-muted-foreground hover:text-white hover:bg-white/5 rounded-xl px-3" asChild>
            <Link to="/">
              <LogOut className="h-4 w-4" />
              Sign out
            </Link>
          </Button>
        </div>
      </aside>

      {/* Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-md"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto relative bg-background">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        <Outlet />
      </main>
    </div>
  );
};
