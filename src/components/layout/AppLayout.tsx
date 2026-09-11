import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FolderOpen,
  Settings,
  CreditCard,
  Key,
  Cpu,
  Plus,
  LogOut,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/ui/logo";
import { useAuth } from "@/hooks/use-auth";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const mainLinks = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/projects", label: "Projects", icon: FolderOpen },
  { href: "/app/new", label: "New Project", icon: Plus },
] as const;

const settingsLinks = [
  { href: "/app/settings", label: "Account", icon: Settings },
  { href: "/app/settings/billing", label: "Billing", icon: CreditCard },
  { href: "/app/settings/keys", label: "API Keys", icon: Key },
  { href: "/app/settings/providers", label: "AI Models", icon: Cpu },
] as const;

const STORAGE_KEY = "shipkernel_sidebar_collapsed";

export const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, isGuest, user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved != null) return saved === "1";
    // Builder pages start collapsed for a Lovable-style canvas
    return /\/app\/projects\/[^/]+/.test(window.location.pathname);
  });

  const isBuilder = /\/app\/projects\/[^/]+/.test(location.pathname);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  // Entering a project collapses the rail once (user can expand)
  useEffect(() => {
    if (isBuilder && localStorage.getItem(STORAGE_KEY) == null) {
      setCollapsed(true);
    }
  }, [isBuilder]);

  const handleSignOut = async () => {
    await logout();
    navigate("/");
  };

  const toggleCollapsed = () => setCollapsed((c) => !c);

  const renderLink = (item: { href: string; label: string; icon: any }) => {
    const Icon = item.icon;
    const isActive =
      item.href === "/app"
        ? location.pathname === "/app"
        : location.pathname === item.href || location.pathname.startsWith(item.href + "/");

    const link = (
      <Link
        key={item.href}
        to={item.href}
        onClick={() => setMobileOpen(false)}
        className={cn(
          "flex items-center rounded-lg text-[13px] font-medium transition-all group relative",
          collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2",
          isActive
            ? "text-primary bg-primary/5"
            : "text-muted-foreground hover:text-white hover:bg-white/5"
        )}
      >
        <Icon
          className={cn(
            "h-4 w-4 shrink-0",
            isActive ? "text-primary" : "opacity-50 group-hover:opacity-100 transition-opacity"
          )}
        />
        {!collapsed && <span className="truncate">{item.label}</span>}
        {isActive && !collapsed && (
          <motion.div layoutId="activeNav" className="absolute left-0 w-0.5 h-3.5 bg-primary rounded-full" />
        )}
      </Link>
    );

    if (!collapsed) return link;

    return (
      <Tooltip key={item.href} delayDuration={0}>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" className="text-xs">
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#020202]">
      <button
        className="lg:hidden fixed top-3 left-3 z-50 p-2 rounded-lg bg-black/80 border border-white/10 backdrop-blur-xl"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle navigation"
      >
        {mobileOpen ? <X className="h-4 w-4 text-white" /> : <Menu className="h-4 w-4 text-white" />}
      </button>

      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-40 border-r border-white/5 bg-[#080808] flex flex-col transition-all duration-200 ease-out",
          collapsed ? "lg:w-14" : "lg:w-56",
          "w-56",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div
          className={cn(
            "flex h-12 items-center border-b border-white/5 bg-[#0A0A0B] shrink-0",
            collapsed ? "justify-center px-1" : "justify-between px-3"
          )}
        >
          <Link to="/" className="hover:opacity-80 transition-opacity min-w-0">
            {collapsed ? <Logo size="sm" /> : <Logo showText size="sm" />}
          </Link>
          {!collapsed && (
            <button
              type="button"
              onClick={toggleCollapsed}
              className="hidden lg:inline-flex p-1.5 rounded-md text-white/30 hover:text-white hover:bg-white/5"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {collapsed && (
          <div className="hidden lg:flex justify-center py-2 border-b border-white/5">
            <button
              type="button"
              onClick={toggleCollapsed}
              className="p-1.5 rounded-md text-white/30 hover:text-white hover:bg-white/5"
              title="Expand sidebar"
            >
              <PanelLeftOpen className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div className={cn("flex-1 overflow-y-auto py-3 space-y-5", collapsed ? "px-1.5" : "px-2.5")}>
          <div>
            {!collapsed && (
              <p className="px-2.5 text-[9px] uppercase font-bold tracking-[0.18em] text-muted-foreground/40 mb-2">
                Main
              </p>
            )}
            <nav className="space-y-0.5">{mainLinks.map(renderLink)}</nav>
          </div>

          <div>
            {!collapsed && (
              <p className="px-2.5 text-[9px] uppercase font-bold tracking-[0.18em] text-muted-foreground/40 mb-2">
                Settings
              </p>
            )}
            <nav className="space-y-0.5">{settingsLinks.map(renderLink)}</nav>
          </div>
        </div>

        <div className={cn("border-t border-white/5 bg-[#060606] shrink-0", collapsed ? "p-1.5" : "p-2.5")}>
          {!collapsed && (
            <div className="px-2.5 py-2 rounded-lg bg-white/[0.03] border border-white/5 mb-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-semibold text-white/70 uppercase tracking-wider">
                  {isGuest ? "Guest" : "Signed in"}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground truncate">
                {isGuest ? "Local only" : user?.email || "Account"}
              </p>
            </div>
          )}
          {collapsed ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-full h-9 text-muted-foreground hover:text-white"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Sign out</TooltipContent>
            </Tooltip>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2.5 text-muted-foreground hover:text-white hover:bg-white/5 rounded-lg px-2.5 h-9 text-xs"
              onClick={handleSignOut}
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </Button>
          )}
        </div>
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-md"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      <main
        className={cn(
          "flex-1 relative bg-background min-w-0",
          isBuilder ? "overflow-hidden" : "overflow-y-auto"
        )}
      >
        <Outlet />
      </main>
    </div>
  );
};
