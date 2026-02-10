import { Link } from "react-router-dom";
import { Zap } from "lucide-react";

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
  <footer className="border-t border-border bg-gradient-subtle">
    <div className="container mx-auto px-4 py-12">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="col-span-2 md:col-span-2">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg mb-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-hero">
              <Zap className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="text-foreground">BuildShip</span>
          </Link>
          <p className="text-sm text-muted-foreground max-w-xs">
            Ship full-stack apps with AI. Describe what you want, get production-ready code.
          </p>
        </div>
        {Object.entries(footerLinks).map(([category, links]) => (
          <div key={category}>
            <h4 className="text-sm font-semibold text-foreground mb-3">{category}</h4>
            <ul className="space-y-2">
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
      <div className="mt-10 pt-6 border-t border-border text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} BuildShip. All rights reserved.
      </div>
    </div>
  </footer>
);
