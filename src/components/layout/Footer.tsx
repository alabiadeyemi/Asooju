import { Link } from "react-router-dom";
import { Zap } from "lucide-react";
import { Logo } from "@/components/ui/logo";

const footerLinks = {
  Product: [
    { label: "Pricing", href: "/pricing" },
    { label: "Changelog", href: "/changelog" },
    { label: "FAQ", href: "/faq" },
  ],
  Legal: [
    { label: "Terms", href: "/terms" },
    { label: "Privacy", href: "/privacy" },
  ],
};

export const Footer = () => (
  <footer className="border-t border-border bg-background relative overflow-hidden">
    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
    <div className="container mx-auto px-4 py-20 relative z-10">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
        <div className="col-span-2">
          <Link to="/" className="hover:opacity-80 transition-opacity mb-6 inline-block">
            <Logo showText />
          </Link>
          <p className="text-sm text-muted-foreground max-w-sm leading-relaxed mb-6">
            The next generation of AI-orchestrated software development.
            Build, deploy, and scale with engineering precision.
          </p>
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-muted/20 border border-border flex items-center justify-center hover:bg-primary/10 hover:border-primary/30 transition-colors cursor-pointer group">
              <div className="w-4 h-4 rounded-sm bg-muted-foreground group-hover:bg-primary transition-colors" />
            </div>
            <div className="w-8 h-8 rounded-full bg-muted/20 border border-border flex items-center justify-center hover:bg-primary/10 hover:border-primary/30 transition-colors cursor-pointer group">
              <div className="w-4 h-4 rounded-sm bg-muted-foreground group-hover:bg-primary transition-colors" />
            </div>
          </div>
        </div>
        {Object.entries(footerLinks).map(([category, links]) => (
          <div key={category}>
            <h4 className="text-[12px] uppercase font-bold tracking-[0.2em] text-foreground mb-6">{category}</h4>
            <ul className="space-y-4">
              {links.map((link) => (
                <li key={link.href}>
                  <Link to={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-20 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
        <div className="flex gap-6">
          <span>© {new Date().getFullYear()} ShipKernel Inc.</span>
          <Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
          <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span>System Operational</span>
        </div>
      </div>
    </div>
  </footer>
);
