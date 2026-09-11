import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { DEFAULT_VFS, cloneVfs, deriveCodeFromVfs } from "@/lib/vfs";
import { getTemplate, matchTemplateByTitle, type TemplateId } from "@/lib/templates";

const LOCAL_PROJECTS_KEY = "shipkernel_local_projects";

export type LocalProject = {
  id: string;
  name: string;
  prompt: string;
  vfs_files: Record<string, string>;
  code: string;
  created_at: string;
  user_id: string;
};

function readLocalProjects(): LocalProject[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_PROJECTS_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeLocalProjects(projects: LocalProject[]) {
  localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(projects));
}

export type CreateProjectOptions = {
  name?: string;
  templateId?: TemplateId | string;
  vfs?: Record<string, string>;
};

export const useProjects = () => {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);

  const createProject = async (prompt: string, options: CreateProjectOptions = {}) => {
    if (!prompt.trim() && !options.templateId && !options.vfs) {
      toast.error("Please enter a description for your project.");
      return;
    }

    setIsCreating(true);
    const toastId = toast.loading("Creating project...");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const template =
        (options.templateId && getTemplate(options.templateId)) ||
        matchTemplateByTitle(prompt) ||
        null;

      const vfs = cloneVfs(
        options.vfs
          ? options.vfs
          : template
            ? template.vfs
            : DEFAULT_VFS
      );

      const name =
        options.name ||
        template?.title ||
        prompt.slice(0, 40) + (prompt.length > 40 ? "..." : "");

      const finalPrompt = prompt.trim() || template?.prompt || name;
      const code = deriveCodeFromVfs(vfs);

      if (!session) {
        const guest = localStorage.getItem("shipkernel_mock_user");
        if (!guest) {
          toast.error("Please log in to create projects", { id: toastId });
          navigate("/auth/login");
          return;
        }

        const project: LocalProject = {
          id: crypto.randomUUID(),
          name,
          prompt: finalPrompt,
          vfs_files: vfs,
          code,
          created_at: new Date().toISOString(),
          user_id: "guest-user-000",
        };
        writeLocalProjects([project, ...readLocalProjects()]);
        toast.success(
          template ? `Template “${template.title}” ready` : "Local project created",
          { id: toastId }
        );
        navigate(`/app/projects/${project.id}`);
        return;
      }

      const { data, error } = await supabase
        .from("projects")
        .insert([
          {
            name,
            prompt: finalPrompt,
            user_id: session.user.id,
            vfs_files: vfs,
            code,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      toast.success(
        template ? `Template “${template.title}” ready` : "Project created",
        { id: toastId }
      );
      navigate(`/app/projects/${data.id}`);
    } catch (error: any) {
      console.error("Project creation error:", error);
      toast.error("Could not create project", {
        description:
          error.message ||
          "Run supabase/schema.sql in your Supabase SQL Editor, then try again.",
        id: toastId,
      });
    } finally {
      setIsCreating(false);
    }
  };

  return {
    createProject,
    isCreating,
    readLocalProjects,
    writeLocalProjects,
  };
};

export { readLocalProjects, writeLocalProjects, LOCAL_PROJECTS_KEY };
