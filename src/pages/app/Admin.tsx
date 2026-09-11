import { Shield, Users, Folder, Zap, Info } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

/**
 * Internal admin console.
 * Access: /admin only — not linked in the user sidebar.
 * Grant access by setting app_metadata.role = "admin" on the user,
 * or list emails in VITE_ADMIN_EMAILS (comma-separated).
 */
const Admin = () => {
  const { user, isAdmin } = useAuth();

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <Shield className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Admin</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-8">
        Restricted console. This path is not shown in the normal dashboard sidebar.
      </p>

      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 mb-6">
        <div className="flex items-start gap-3 mb-4">
          <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div className="text-sm text-muted-foreground leading-relaxed">
            <p className="text-foreground font-medium mb-2">How access works</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>
                Set <code className="text-xs bg-white/5 px-1 rounded">role: &quot;admin&quot;</code> in
                the user&apos;s Supabase <code className="text-xs bg-white/5 px-1 rounded">app_metadata</code>
              </li>
              <li>
                Or add emails to <code className="text-xs bg-white/5 px-1 rounded">VITE_ADMIN_EMAILS</code>{" "}
                in <code className="text-xs bg-white/5 px-1 rounded">.env</code>
              </li>
            </ul>
          </div>
        </div>
        <div className="text-xs text-muted-foreground border-t border-white/5 pt-4">
          Signed in as <span className="text-foreground">{user?.email || "unknown"}</span>
          {isAdmin ? " · admin access granted" : ""}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 opacity-60">
        {[
          { label: "Users", icon: Users, note: "Wire to Supabase Auth admin API" },
          { label: "Projects", icon: Folder, note: "Aggregate count from projects table" },
          { label: "Generations", icon: Zap, note: "Add usage logging when ready" },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <item.icon className="h-4 w-4" />
              <span className="text-xs">{item.label}</span>
            </div>
            <div className="text-lg font-bold text-foreground">—</div>
            <p className="text-[10px] text-muted-foreground mt-2">{item.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Admin;
