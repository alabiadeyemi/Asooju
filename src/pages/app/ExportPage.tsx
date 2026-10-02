import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Download,
  GitBranch,
  Rocket,
  Check,
  Github,
  Loader2,
  FileCode,
  ListChecks,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { pushVfsToGitHub } from "@/services/github-service";
import { toast } from "sonner";
import { Logo } from "@/components/ui/logo";
import { deriveCodeFromVfs } from "@/lib/vfs";
import { prepareExportBundle } from "@/lib/export-bundle";
import { buildShipChecklist } from "@/lib/ship-checklist";
import { ShipChecklistPanel } from "@/components/app/export/ShipChecklistPanel";
import { readLocalProjects } from "@/hooks/use-projects";

const ExportPage = () => {
  const { projectId } = useParams();
  const [isPushing, setIsPushing] = useState(false);
  const [vfsFiles, setVfsFiles] = useState<Record<string, string>>({});
  const [projectName, setProjectName] = useState("shipkernel-export");
  const { user, loginWithGitHub, gitHubToken, isGuest } = useAuth();

  useEffect(() => {
    if (projectId) fetchProject();
  }, [projectId]);

  const fetchProject = async () => {
    // Guest local projects
    const local = readLocalProjects().find((p) => p.id === projectId);
    if (local) {
      setVfsFiles(local.vfs_files || { "App.tsx": local.code || "" });
      setProjectName(local.name || "local-project");
      return;
    }

    const { data, error } = await supabase
      .from("projects")
      .select("name, code, vfs_files")
      .eq("id", projectId!)
      .single();

    if (error || !data) {
      toast.error("Could not load project for export");
      return;
    }

    setProjectName(data.name || "shipkernel-export");
    if (data.vfs_files && typeof data.vfs_files === "object") {
      setVfsFiles(data.vfs_files as Record<string, string>);
    } else {
      setVfsFiles({ "App.tsx": data.code || "" });
    }
  };

  const fileCount = Object.keys(vfsFiles).length;
  const isGitHubConnected = !!gitHubToken;
  const exportBundle = useMemo(
    () => prepareExportBundle(vfsFiles, { projectName }),
    [vfsFiles, projectName]
  );
  const bundledCount = Object.keys(exportBundle).length;
  const shipChecklist = useMemo(
    () => buildShipChecklist(vfsFiles, projectName),
    [vfsFiles, projectName]
  );

  const handlePush = async () => {
    if (!gitHubToken) {
      toast.error("Connect GitHub first");
      return;
    }
    if (fileCount === 0) {
      toast.error("No files to push");
      return;
    }

    setIsPushing(true);
    const toastId = toast.loading(`Pushing ${bundledCount} files to GitHub (incl. run scaffold)...`);

    try {
      const repoName = `shipkernel-${projectId?.slice(0, 8) || "export"}`;
      const { url, fileCount: n } = await pushVfsToGitHub(gitHubToken, repoName, vfsFiles);
      toast.success(`Pushed ${n} files`, {
        id: toastId,
        description: url,
      });
    } catch (error: any) {
      toast.error("Push Failed", { id: toastId, description: error.message });
    } finally {
      setIsPushing(false);
    }
  };

  const handleDownloadZip = async () => {
    if (fileCount === 0) {
      toast.error("No files to download");
      return;
    }

    // Lightweight ZIP via Blob of concatenated text archive if JSZip isn't installed —
    // ship a multi-file downloadable folder as a single .txt bundle + individual files via a simple zip-less approach:
    // Prefer real zip: create a data URL of JSON + offer App.tsx fallback.
    try {
      const { default: JSZip } = await import("jszip").catch(() => ({ default: null as any }));
      if (!JSZip) {
        // Fallback: download App.tsx + a manifest
        const blob = new Blob(
          [
            `// ShipKernel export: ${projectName}\n// Files: ${Object.keys(vfsFiles).join(", ")}\n\n` +
              Object.entries(vfsFiles)
                .map(([path, content]) => `========== ${path} ==========\n${content}\n`)
                .join("\n"),
          ],
          { type: "text/plain" }
        );
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${projectName.replace(/\s+/g, "-")}-source.txt`;
        a.click();
        toast.success("Downloaded source archive (.txt). Install jszip for ZIP.");
        return;
      }

      const zip = new JSZip();
      Object.entries(exportBundle).forEach(([path, content]) => zip.file(path, content));
      const blob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${projectName.replace(/\s+/g, "-")}.zip`;
      a.click();
      toast.success(`Downloaded ${bundledCount} files`, {
        description:
          bundledCount > fileCount
            ? `Includes README, .env.example, and run scaffold (+${bundledCount - fileCount})`
            : undefined,
      });
    } catch (e: any) {
      toast.error("Download failed", { description: e.message });
    }
  };

  return (
    <div className="min-h-full bg-[#020202] text-white p-6 lg:p-12 relative overflow-hidden font-sans">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-primary/5 blur-[120px] pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">
        <div className="mb-12">
          <div className="flex items-center gap-2 text-primary mb-3">
            <Logo size="sm" />
            <span className="text-[10px] uppercase font-black tracking-[0.3em]">Export</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter uppercase mb-3">Release</h1>
          <p className="text-muted-foreground text-sm">
            {projectName} · {fileCount} file{fileCount === 1 ? "" : "s"} in workspace
            {isGuest ? " · guest (local)" : ""}
          </p>
        </div>

        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[28px] border border-white/5 bg-[#080808]/50 p-8"
          >
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-black">
                  <GitBranch className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="text-lg font-bold uppercase tracking-tight">GitHub</h3>
                  <p className="text-sm text-muted-foreground">
                    Same bundle as ZIP: Vite scaffold, README, .env.example, .gitignore — not secrets or
                    node_modules. You add <code className="text-white/60">.env</code> after clone.
                  </p>
                </div>
              </div>
              <Button
                onClick={isGitHubConnected ? handlePush : loginWithGitHub}
                disabled={isPushing || (isGitHubConnected && fileCount === 0)}
                variant="hero"
                className="rounded-xl bg-white text-black font-black uppercase tracking-widest px-8"
              >
                {isPushing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Pushing...
                  </>
                ) : isGitHubConnected ? (
                  <>
                    <Check className="w-4 h-4 mr-2" /> Push {bundledCount} files
                  </>
                ) : (
                  <>
                    <Github className="w-4 h-4 mr-2" /> Connect GitHub
                  </>
                )}
              </Button>
            </div>
            {isGitHubConnected && (
              <div className="mt-6 pt-6 border-t border-white/5 text-xs font-mono text-white/40">
                {user?.email?.split("@")[0] || "user"}/shipkernel-{projectId?.slice(0, 8)}
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-[28px] border border-white/5 bg-[#080808]/50 p-8"
          >
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 border border-white/10">
                  <Download className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="text-lg font-bold uppercase tracking-tight">Download source</h3>
                  <p className="text-sm text-muted-foreground">
                    Export all VFS files ({deriveCodeFromVfs(vfsFiles).length} chars in App.tsx).
                  </p>
                </div>
              </div>
              <Button
                onClick={handleDownloadZip}
                variant="outline"
                className="rounded-xl border-white/10 bg-white/5 font-black uppercase tracking-widest px-8"
              >
                <FileCode className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="rounded-[28px] border border-white/5 bg-[#080808]/50 p-8"
          >
            <div className="flex items-start gap-5 mb-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ListChecks className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold uppercase tracking-tight">Ship checklist</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  From workspace → local run → database → env → GitHub → Vercel. Copy SQL and env
                  blocks below.
                </p>
              </div>
            </div>
            <ShipChecklistPanel checklist={shipChecklist} disabled={fileCount === 0} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-[28px] border border-dashed border-white/10 bg-[#080808]/30 p-8 opacity-70"
          >
            <div className="flex items-center gap-5">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Rocket className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold uppercase tracking-tight">Live hosting</h3>
                <p className="text-sm text-muted-foreground">
                  One-click Vercel deploy is not wired yet. Follow the ship checklist above after
                  GitHub push.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ExportPage;
