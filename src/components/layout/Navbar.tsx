import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Menu, X, Github, MessageSquare,
  Sparkles, Layout, LogIn, UserPlus,
  ChevronRight, Globe
} from "lucide-react";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMobileDrawer } from "@/hooks/use-mobile-drawer";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/templates", label: "Templates", icon: Layout },
  { href: "/pricing", label: "Pricing", icon: Sparkles },
  { href: "/faq", label: "FAQ", icon: MessageSquare },
  { href: "/changelog", label: "Changelog", icon: Layout },
];

export const Navbar = () => {
  const {
    open: mobileOpen,
    openDrawer,
    closeDrawer,
    overlayInteractive,
    onOverlayPointerDown,
  } = useMobileDrawer();
  const location = useLocation();
  const { user, logout } = useAuth();

  useEffect(() => {
    closeDrawer();
  }, [location.pathname, closeDrawer]);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/60 backdrop-blur-xl border-b border-white/5">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="hover:opacity-80 transition-opacity">
            <Logo showText />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`text-[13px] font-medium transition-colors hover:text-white ${location.pathname === link.href ? "text-white" : "text-muted-foreground"
                  }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-white" asChild>
                  <Link to="/app">Dashboard</Link>
                </Button>
                <div className="w-px h-6 bg-white/5 mx-2" />
                <Button
                  onClick={logout}
                  variant="outline"
                  size="sm"
                  className="rounded-full border-white/10 text-white/60 hover:text-white h-9 px-4"
                >
                  Log out
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-white" asChild>
                  <Link to="/auth/login">Log in</Link>
                </Button>
                <Button variant="hero" size="sm" className="bg-white text-black hover:bg-white/90 rounded-full px-5 h-9 font-bold" asChild>
                  <Link to="/auth/signup">Get Started</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            type="button"
            className="md:hidden p-2 text-foreground/80 touch-manipulation"
            onClick={openDrawer}
            aria-label="Open navigation"
            aria-expanded={mobileOpen}
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </nav>

      {/* Mobile drawer — CSS slide (Framer x + body position:fixed clipped on iOS) */}
      {mobileOpen && (
        <>
          <div
            onPointerDown={onOverlayPointerDown}
            onClick={onOverlayPointerDown}
            aria-hidden
            className={cn(
              "fixed inset-0 z-[60] bg-black/60",
              !overlayInteractive && "pointer-events-none"
            )}
          />

          <div
            className="fixed inset-y-0 right-0 z-[70] flex w-[min(100vw-2.5rem,24rem)] max-w-full flex-col overflow-x-hidden border-l border-white/10 bg-[#060606] shadow-2xl"
            style={{ transform: "translate3d(0,0,0)" }}
          >
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/5 p-6 min-w-0">
                <div className="min-w-0 truncate">
                  <Logo size="sm" showText />
                </div>
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="shrink-0 p-2 text-muted-foreground hover:text-white touch-manipulation"
                  aria-label="Close navigation"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="min-w-0 flex-1 space-y-8 overflow-x-hidden overflow-y-auto overscroll-contain p-6">
                <div className="grid grid-cols-1 gap-3">
                  {user ? (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/5 p-4 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-hero font-bold text-white">
                          {user.email?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate text-sm font-bold text-white">{user.email}</span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Active Session</span>
                        </div>
                      </div>
                      <Button className="h-12 w-full rounded-xl bg-white font-bold text-black" asChild>
                        <Link to="/app" onClick={closeDrawer}>Go to Dashboard</Link>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-10 w-full rounded-xl border-white/10 text-white/40"
                        onClick={() => {
                          logout();
                          closeDrawer();
                        }}
                      >
                        Sign Out
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <Button variant="outline" className="glass h-12 rounded-xl border-white/10 text-white" asChild>
                        <Link to="/auth/login" onClick={closeDrawer}>
                          <LogIn className="mr-2 h-4 w-4 shrink-0" />
                          Login
                        </Link>
                      </Button>
                      <Button className="h-12 rounded-xl bg-white font-bold text-black hover:bg-white/90" asChild>
                        <Link to="/auth/signup" onClick={closeDrawer}>
                          <UserPlus className="mr-2 h-4 w-4 shrink-0" />
                          Join
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <p className="mb-4 ml-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Platform</p>
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      to={link.href}
                      onClick={closeDrawer}
                      className="group flex min-w-0 items-center justify-between gap-2 rounded-xl p-3 transition-colors hover:bg-white/5"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-muted-foreground transition-colors group-hover:text-primary">
                          <link.icon className="h-4 w-4" />
                        </div>
                        <span className="truncate text-[15px] font-medium text-white">{link.label}</span>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-20" />
                    </Link>
                  ))}
                </div>

                <div className="space-y-1">
                  <p className="mb-4 ml-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Engineering</p>
                  <a
                    href="https://github.com"
                    className="group flex min-w-0 items-center gap-3 rounded-xl p-3 text-muted-foreground transition-colors hover:bg-white/5 hover:text-white"
                  >
                    <Github className="h-4 w-4 shrink-0" />
                    <span className="truncate text-[15px] font-medium">Source Documentation</span>
                  </a>
                  <div className="group flex min-w-0 cursor-pointer items-center gap-3 rounded-xl p-3 text-muted-foreground transition-colors hover:bg-white/5 hover:text-white">
                    <Globe className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate text-[15px] font-medium">System Status</span>
                    <div className="ml-auto h-2 w-2 shrink-0 rounded-full bg-green-500 animate-pulse" />
                  </div>
                </div>

                <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/20 to-transparent p-5">
                  <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-white">
                    <Sparkles className="h-4 w-4 shrink-0 text-primary" />
                    Pro Access
                  </h4>
                  <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
                    Unlock unlimited generations and dedicated infrastructure for your team.
                  </p>
                  <Button variant="link" className="h-auto p-0 text-xs font-bold text-primary" asChild>
                    <Link to="/pricing" onClick={closeDrawer}>Upgrade now →</Link>
                  </Button>
                </div>
              </div>

              <div className="shrink-0 border-t border-white/5 bg-black/40 p-6">
                <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                  <span>Asooju v2.4.1</span>
                  <div className="flex gap-4">
                    <Github className="h-4 w-4" />
                    <MessageSquare className="h-4 w-4" />
                  </div>
                </div>
              </div>
          </div>
        </>
      )}
    </>
  );
};
