import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation, Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  User, CreditCard, Key, Cpu, Trash2, ExternalLink,
  Plus, Eye, EyeOff, Check,
} from "lucide-react";

const tabs = [
  { id: "account", label: "Account", icon: User, href: "/app/settings" },
  { id: "billing", label: "Billing", icon: CreditCard, href: "/app/settings/billing" },
  { id: "keys", label: "API Keys", icon: Key, href: "/app/settings/keys" },
  { id: "providers", label: "Providers", icon: Cpu, href: "/app/settings/providers" },
];

const providers = [
  { id: "openai", name: "OpenAI (GPT)", desc: "Best overall quality" },
  { id: "gemini", name: "Google Gemini", desc: "Fast and efficient" },
  { id: "grok", name: "Grok", desc: "Great for creative tasks" },
  { id: "auto", name: "Auto", desc: "Let BuildShip choose the best" },
];

const Settings = () => {
  const location = useLocation();
  const [selectedProvider, setSelectedProvider] = useState("auto");
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});

  const currentTab = location.pathname === "/app/settings/billing"
    ? "billing"
    : location.pathname === "/app/settings/keys"
    ? "keys"
    : location.pathname === "/app/settings/providers"
    ? "providers"
    : "account";

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-6">Settings</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 overflow-x-auto border-b border-border">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.id}
              to={tab.href}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors -mb-px",
                currentTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Account */}
      {currentTab === "account" && (
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Profile</h2>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input defaultValue="developer@example.com" disabled />
            </div>
            <div className="space-y-2">
              <Label>Display name</Label>
              <Input defaultValue="Developer" />
            </div>
            <Button variant="hero" size="sm">Save changes</Button>
          </div>
          <div className="rounded-lg border border-destructive/30 bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground mb-2">Danger zone</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Permanently delete your account and all associated data.
            </p>
            <Button variant="destructive" size="sm">
              <Trash2 className="h-4 w-4 mr-1" />
              Delete account
            </Button>
          </div>
        </div>
      )}

      {/* Billing */}
      {currentTab === "billing" && (
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground mb-1">Current plan</h2>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl font-bold text-gradient">BYOK</span>
              <span className="text-sm text-muted-foreground">· Unlimited generations</span>
            </div>
            <Button variant="hero-outline" size="sm" asChild>
              <Link to="/pricing">
                Upgrade plan
                <ExternalLink className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          </div>
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground mb-3">Billing portal</h2>
            <p className="text-sm text-muted-foreground mb-4">Manage your subscription, payment methods, and invoices.</p>
            <Button variant="outline" size="sm">
              Open Stripe portal
              <ExternalLink className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* API Keys */}
      {currentTab === "keys" && (
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Your API keys</h2>
            <div className="space-y-3">
              {[
                { provider: "OpenAI", key: "sk-proj-...7x4f", added: "Jan 15, 2026" },
                { provider: "Gemini", key: "AIza...9kL2", added: "Jan 20, 2026" },
              ].map((k) => (
                <div key={k.provider} className="flex items-center justify-between rounded-md border border-border p-3">
                  <div>
                    <div className="text-sm font-medium text-foreground">{k.provider}</div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {showKey[k.provider] ? k.key : "••••••••••••"}
                      <span className="ml-2 text-muted-foreground">Added {k.added}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setShowKey((p) => ({ ...p, [k.provider]: !p[k.provider] }))}
                    >
                      {showKey[k.provider] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="mt-4">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add API key
            </Button>
          </div>
        </div>
      )}

      {/* Providers */}
      {currentTab === "providers" && (
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Default provider</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {providers.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProvider(p.id)}
                  className={cn(
                    "rounded-lg border p-4 text-left transition-colors",
                    selectedProvider === p.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-foreground">{p.name}</div>
                    {selectedProvider === p.id && <Check className="h-4 w-4 text-primary" />}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
