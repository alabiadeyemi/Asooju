import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Menu, X, Zap, Github, MessageSquare,
  Sparkles, Layout, Settings, LogIn, UserPlus,
  ChevronRight, Globe
} from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { Logo } from "@/components/ui/logo";

const navLinks = [
  { href: "/templates", label: "Templates", icon: Layout },
  { href: "/pricing", label: "Pricing", icon: Sparkles },
  { href: "/faq", label: "FAQ", icon: MessageSquare },
  { href: "/changelog", label: "Changelog", icon: Layout },
];

export const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();

  // Prevent scroll when sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [mobileOpen]);

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
            className="md:hidden p-2 text-foreground/80"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </nav>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-[85%] max-w-sm bg-[#060606] border-l border-white/10 z-[70] shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <Logo size="sm" showText />
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-2 text-muted-foreground hover:text-white"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Auth Section */}
                <div className="grid grid-cols-1 gap-3">
                  {user ? (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5">
                        <div className="h-10 w-10 rounded-full bg-gradient-hero flex items-center justify-center text-white font-bold">
                          {user.email?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-white truncate max-w-[150px]">{user.email}</span>
                          <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Active Session</span>
                        </div>
                      </div>
                      <Button className="bg-white text-black font-bold h-12 rounded-xl w-full" asChild>
                        <Link to="/app" onClick={() => setMobileOpen(false)}>Go to Dashboard</Link>
                      </Button>
                      <Button variant="outline" className="border-white/10 text-white/40 h-10 rounded-xl w-full" onClick={() => { logout(); setMobileOpen(false); }}>
                        Sign Out
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <Button variant="outline" className="glass border-white/10 text-white rounded-xl h-12" asChild>
                        <Link to="/auth/login" onClick={() => setMobileOpen(false)}>
                          <LogIn className="w-4 h-4 mr-2" />
                          Login
                        </Link>
                      </Button>
                      <Button className="bg-white text-black hover:bg-white/90 rounded-xl h-12 font-bold" asChild>
                        <Link to="/auth/signup" onClick={() => setMobileOpen(false)}>
                          <UserPlus className="w-4 h-4 mr-2" />
                          Join
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>

                {/* Primary Nav */}
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-muted-foreground mb-4 ml-1">Platform</p>
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      to={link.href}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                          <link.icon className="w-4 h-4" />
                        </div>
                        <span className="text-[15px] font-medium text-white">{link.label}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground opacity-20" />
                    </Link>
                  ))}
                </div>

                {/* Advanced Features */}
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-muted-foreground mb-4 ml-1">Engineering</p>
                  <a href="https://github.com" className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group text-muted-foreground hover:text-white">
                    <Github className="w-4 h-4" />
                    <span className="text-[15px] font-medium">Source Documentation</span>
                  </a>
                  <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group text-muted-foreground hover:text-white cursor-pointer">
                    <Globe className="w-4 h-4" />
                    <span className="text-[15px] font-medium">System Status</span>
                    <div className="ml-auto w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  </div>
                </div>

                {/* Promotional Card */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-primary/20 to-transparent border border-primary/20">
                  <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Pro Access
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                    Unlock unlimited generations and dedicated infrastructure for your team.
                  </p>
                  <Button variant="link" className="p-0 h-auto text-primary text-xs font-bold" asChild>
                    <Link to="/pricing" onClick={() => setMobileOpen(false)}>Upgrade now →</Link>
                  </Button>
                </div>
              </div>

              <div className="p-6 border-t border-white/5 bg-black/40">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
                  <span>Asooju v2.4.1</span>
                  <div className="flex gap-4">
                    <Github className="w-4 h-4" />
                    <MessageSquare className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
