import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Folder, Zap, BarChart3 } from "lucide-react";

const recentProjects = [
  { id: "1", name: "SaaS Dashboard", updatedAt: "2 hours ago", files: 24, provider: "GPT" },
  { id: "2", name: "E-commerce API", updatedAt: "1 day ago", files: 18, provider: "Gemini" },
  { id: "3", name: "Blog Platform", updatedAt: "3 days ago", files: 12, provider: "Grok" },
];

const Dashboard = () => (
  <div className="p-6 lg:p-8 max-w-6xl mx-auto">
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Welcome back. Here's what's happening.</p>
      </div>
      <Button variant="hero" asChild>
        <Link to="/app/new">
          <Plus className="h-4 w-4 mr-1" />
          New Project
        </Link>
      </Button>
    </div>

    {/* Stats */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {[
        { label: "Projects", value: "12", icon: Folder },
        { label: "Generations", value: "47 / 50", icon: Zap },
        { label: "Tokens used", value: "124k", icon: BarChart3 },
        { label: "Plan", value: "BYOK", icon: Zap },
      ].map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.label} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Icon className="h-4 w-4" />
              <span className="text-xs">{stat.label}</span>
            </div>
            <div className="text-xl font-bold text-foreground">{stat.value}</div>
          </div>
        );
      })}
    </div>

    {/* Recent projects */}
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-4">Recent projects</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {recentProjects.map((project) => (
          <Link
            key={project.id}
            to={`/app/projects/${project.id}`}
            className="group rounded-lg border border-border bg-card p-5 hover:border-primary/30 transition-colors"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Folder className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-medium text-foreground group-hover:text-primary transition-colors text-sm">{project.name}</h3>
                <p className="text-xs text-muted-foreground">{project.updatedAt}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{project.files} files</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground">
                {project.provider}
              </span>
            </div>
          </Link>
        ))}

        {/* New project card */}
        <Link
          to="/app/new"
          className="rounded-lg border border-dashed border-border p-5 flex items-center justify-center text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors min-h-[120px]"
        >
          <div className="text-center">
            <Plus className="h-6 w-6 mx-auto mb-2" />
            <span className="text-sm">New project</span>
          </div>
        </Link>
      </div>
    </div>
  </div>
);

export default Dashboard;
