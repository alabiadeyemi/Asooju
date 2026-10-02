import { useEffect, useState } from "react";
import { Loader2, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { adminFetch, formatWhen } from "./admin-api";

type ProjectDetail = {
  project: {
    id: string;
    user_id: string;
    name: string;
    prompt: string | null;
    created_at: string;
    updated_at: string;
    fileCount: number;
    chatCount: number;
    files: Array<{ path: string; bytes: number }>;
  };
  owner: { id: string; email: string | null; plan: string } | null;
};

type Props = {
  projectId: string | null;
  onClose: () => void;
  onDeleted: () => void;
  onOpenOwner: (userId: string) => void;
};

export function ProjectInspectSheet({
  projectId,
  onClose,
  onDeleted,
  onOpenOwner,
}: Props) {
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!projectId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void adminFetch<ProjectDetail>(
      `/api/admin/project?id=${encodeURIComponent(projectId)}`
    )
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch((e: any) => {
        if (!cancelled) setError(e?.message || "Failed to load project");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (!projectId) return null;

  const remove = async () => {
    if (
      !window.confirm(
        `Delete project "${detail?.project.name || projectId}" permanently? This cannot be undone.`
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await adminFetch(`/api/admin/project?id=${encodeURIComponent(projectId)}`, {
        method: "DELETE",
      });
      toast.success("Project deleted");
      onDeleted();
      onClose();
    } catch (e: any) {
      toast.error("Delete failed", { description: e?.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label="Close overlay"
        className="fixed inset-0 z-40 bg-black/60 md:bg-black/40"
        onClick={onClose}
      />
      <aside
        className="fixed inset-0 z-50 flex flex-col bg-[#0a0a0a] border-white/10 md:inset-y-0 md:left-auto md:right-0 md:w-[440px] md:border-l"
        role="dialog"
        aria-modal="true"
      >
        <div className="shrink-0 flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold truncate">
              {detail?.project.name || "Project"}
            </h2>
            <p className="text-[11px] text-white/35 font-mono truncate">{projectId}</p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-white/40">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          )}
          {error && <p className="text-sm text-red-300/90">{error}</p>}
          {detail && (
            <>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-[10px] uppercase text-white/35">Files</dt>
                  <dd className="tabular-nums">{detail.project.fileCount}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase text-white/35">Chat msgs</dt>
                  <dd className="tabular-nums">{detail.project.chatCount}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase text-white/35">Created</dt>
                  <dd className="text-xs">{formatWhen(detail.project.created_at)}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase text-white/35">Updated</dt>
                  <dd className="text-xs">{formatWhen(detail.project.updated_at)}</dd>
                </div>
              </dl>

              <div>
                <h3 className="text-[10px] uppercase tracking-wider text-white/35 mb-1">
                  Owner
                </h3>
                <button
                  type="button"
                  className="text-sm text-primary/90 hover:underline"
                  onClick={() => onOpenOwner(detail.project.user_id)}
                >
                  {detail.owner?.email || detail.project.user_id}
                </button>
                {detail.owner?.plan ? (
                  <span className="ml-2 text-[10px] text-white/40 uppercase">
                    {detail.owner.plan}
                  </span>
                ) : null}
              </div>

              {detail.project.prompt ? (
                <div>
                  <h3 className="text-[10px] uppercase tracking-wider text-white/35 mb-1">
                    Prompt
                  </h3>
                  <p className="text-xs text-white/55 whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
                    {detail.project.prompt}
                  </p>
                </div>
              ) : null}

              <div>
                <h3 className="text-[10px] uppercase tracking-wider text-white/35 mb-1">
                  Files (paths only)
                </h3>
                <ul className="max-h-56 overflow-y-auto text-xs font-mono text-white/50 space-y-1">
                  {detail.project.files.map((f) => (
                    <li
                      key={f.path}
                      className="flex justify-between gap-2 border-b border-white/5 py-1"
                    >
                      <span className="truncate">{f.path}</span>
                      <span className="tabular-nums text-white/30 shrink-0">
                        {f.bytes} B
                      </span>
                    </li>
                  ))}
                  {!detail.project.files.length && (
                    <li className="text-white/30">No files</li>
                  )}
                </ul>
              </div>
            </>
          )}
        </div>

        {detail && (
          <div className="shrink-0 border-t border-white/10 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={busy}
              onClick={() => void remove()}
            >
              {busy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Delete project
                </>
              )}
            </Button>
          </div>
        )}
      </aside>
    </>
  );
}
