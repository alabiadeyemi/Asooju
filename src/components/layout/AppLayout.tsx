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

const sidebarLinks = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/projects", label: "Projects", icon: FolderOpen },
  { href: "/app/new", label: "New Project", icon: Plus },
  { divider: true },
  { href: "/app/settings", label: "Settings", icon: Settings },
  { href: "/app/settings/billing", label: "Billing", icon: CreditCard },
  { href: "/app/settings/keys", label: "API Keys", icon: Key },
  { href: "/app/settings/providers", label: "Providers", icon: Cpu },
  { divider: true },
  { href: "/admin", label: "Admin", icon: ShieldCheck },
] as const;

export const AppLayout = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile sidebar toggle */}
      <button
        className="lg:hidden fixed top-3 left-3 z-50 p-2 rounded-md bg-card border border-border"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-40 w-60 border-r border-border bg-sidebar flex flex-col transition-transform lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 items-center gap-2 px-4 border-b border-border">
          <Link to="/" className="flex items-center gap-2 font-bold text-sm">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-hero">
              <Zap className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="text-foreground">BuildShip</span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {sidebarLinks.map((item, i) => {
            if ("divider" in item) {
              return <div key={i} className="my-2 border-t border-border" />;
            }
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground" asChild>
            <Link to="/">
              <LogOut className="h-4 w-4" />
              Sign out
            </Link>
          </Button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-background/80 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};
