/** Per-project Supabase URL/key for generated-app preview (builder iframe only). */

export type ProjectPreviewEnv = {
  url: string;
  anonKey: string;
};

const STORAGE_PREFIX = "shipkernel_project_preview_env:";

function storageKey(projectId: string): string {
  return `${STORAGE_PREFIX}${projectId}`;
}

export function readProjectPreviewEnv(projectId: string): ProjectPreviewEnv | null {
  if (typeof window === "undefined" || !projectId.trim()) return null;
  try {
    const raw = localStorage.getItem(storageKey(projectId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ProjectPreviewEnv>;
    if (typeof parsed.url !== "string" || typeof parsed.anonKey !== "string") return null;
    return { url: parsed.url, anonKey: parsed.anonKey };
  } catch {
    return null;
  }
}

export function writeProjectPreviewEnv(
  projectId: string,
  url: string,
  anonKey: string
): void {
  if (typeof window === "undefined" || !projectId.trim()) return;
  const payload: ProjectPreviewEnv = {
    url: url.trim(),
    anonKey: anonKey.trim(),
  };
  localStorage.setItem(storageKey(projectId), JSON.stringify(payload));
}

/** Preview iframe creds: saved per-project only — never ShipKernel platform `VITE_*`. */
export function resolveProjectPreviewEnv(projectId: string | undefined): ProjectPreviewEnv {
  const id = projectId?.trim();
  if (!id) return { url: "", anonKey: "" };
  return readProjectPreviewEnv(id) ?? { url: "", anonKey: "" };
}

export type ProjectPreviewEnvRecord = {
  preview_supabase_url?: string | null;
  preview_supabase_anon_key?: string | null;
};

/** Cloud or local project row — null if both fields empty/absent. */
export function previewEnvFromRecord(
  row: ProjectPreviewEnvRecord | null | undefined
): ProjectPreviewEnv | null {
  if (!row) return null;
  const url = String(row.preview_supabase_url ?? "").trim();
  const anonKey = String(row.preview_supabase_anon_key ?? "").trim();
  if (!url && !anonKey) return null;
  return { url, anonKey };
}

/** DB/local row → preview state; falls back to browser cache (Step 1). */
export function resolveProjectPreviewEnvFromSources(
  projectId: string | undefined,
  row?: ProjectPreviewEnvRecord | null
): ProjectPreviewEnv {
  return (
    previewEnvFromRecord(row) ??
    (projectId ? readProjectPreviewEnv(projectId) : null) ?? { url: "", anonKey: "" }
  );
}
