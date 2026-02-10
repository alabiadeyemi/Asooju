import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Layout, ShoppingBag, FileText, MessageSquare } from "lucide-react";
import { useState } from "react";

const templates = [
  { id: "blank", name: "Blank", desc: "Start from scratch", icon: Layout },
  { id: "saas", name: "SaaS Dashboard", desc: "Auth, billing, admin", icon: Layout },
  { id: "ecommerce", name: "E-commerce", desc: "Products, cart, checkout", icon: ShoppingBag },
  { id: "blog", name: "Blog / CMS", desc: "Posts, categories, editor", icon: FileText },
  { id: "chat", name: "Chat App", desc: "Real-time messaging", icon: MessageSquare },
];

const NewProject = () => {
  const [name, setName] = useState("");
  const [template, setTemplate] = useState("blank");
  const navigate = useNavigate();

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-2">New project</h1>
      <p className="text-sm text-muted-foreground mb-8">Give your project a name and pick a template to get started.</p>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">Project name</Label>
          <Input
            id="name"
            placeholder="my-awesome-app"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="space-y-3">
          <Label>Template</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {templates.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setTemplate(t.id)}
                  className={`rounded-lg border p-4 text-left transition-colors ${
                    template === t.id
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-primary/30"
                  }`}
                >
                  <Icon className={`h-5 w-5 mb-2 ${template === t.id ? "text-primary" : "text-muted-foreground"}`} />
                  <div className="text-sm font-medium text-foreground">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        <Button
          variant="hero"
          className="w-full sm:w-auto"
          onClick={() => navigate("/app/projects/new-project")}
          disabled={!name.trim()}
        >
          Create project
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};

export default NewProject;
