import { Users, Folder, Zap, DollarSign } from "lucide-react";

const stats = [
  { label: "Total signups", value: "12,847", icon: Users, change: "+248 this week" },
  { label: "Total projects", value: "34,291", icon: Folder, change: "+1,203 this week" },
  { label: "Generations", value: "892,104", icon: Zap, change: "+42k this week" },
  { label: "Revenue (MRR)", value: "$18,420", icon: DollarSign, change: "+$2,100" },
];

const recentUsers = [
  { email: "alice@startup.com", plan: "Premium", projects: 8, joined: "2h ago" },
  { email: "bob@dev.io", plan: "BYOK", projects: 3, joined: "5h ago" },
  { email: "carol@agency.co", plan: "Free", projects: 1, joined: "1d ago" },
  { email: "dave@tech.com", plan: "Premium", projects: 12, joined: "1d ago" },
  { email: "eve@company.org", plan: "BYOK", projects: 5, joined: "2d ago" },
];

const Admin = () => (
  <div className="p-6 lg:p-8 max-w-6xl mx-auto">
    <h1 className="text-2xl font-bold text-foreground mb-6">Admin</h1>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.label} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Icon className="h-4 w-4" />
              <span className="text-xs">{stat.label}</span>
            </div>
            <div className="text-xl font-bold text-foreground">{stat.value}</div>
            <div className="text-xs text-primary mt-1">{stat.change}</div>
          </div>
        );
      })}
    </div>

    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Recent signups</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground text-xs">
              <th className="text-left px-4 py-2 font-medium">Email</th>
              <th className="text-left px-4 py-2 font-medium">Plan</th>
              <th className="text-left px-4 py-2 font-medium">Projects</th>
              <th className="text-left px-4 py-2 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {recentUsers.map((user) => (
              <tr key={user.email} className="border-b border-border last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 text-foreground">{user.email}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                    {user.plan}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{user.projects}</td>
                <td className="px-4 py-3 text-muted-foreground">{user.joined}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

export default Admin;
