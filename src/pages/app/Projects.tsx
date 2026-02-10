import { Link } from "react-router-dom";
import { Folder } from "lucide-react";

const projects = [
  { id: "1", name: "SaaS Dashboard", updatedAt: "2 hours ago", files: 24, provider: "GPT" },
  { id: "2", name: "E-commerce API", updatedAt: "1 day ago", files: 18, provider: "Gemini" },
  { id: "3", name: "Blog Platform", updatedAt: "3 days ago", files: 12, provider: "Grok" },
  { id: "4", name: "Portfolio Site", updatedAt: "5 days ago", files: 8, provider: "GPT" },
  { id: "5", name: "Task Manager", updatedAt: "1 week ago", files: 15, provider: "Gemini" },
];

const Projects = () => (
  <div className="p-6 lg:p-8 max-w-6xl mx-auto">
    <h1 className="text-2xl font-bold text-foreground mb-6">All projects</h1>
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {projects.map((project) => (
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
    </div>
  </div>
);

export default Projects;
