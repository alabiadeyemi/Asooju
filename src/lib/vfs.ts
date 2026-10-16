/** Deep-enough copy of a string VFS map (avoids shared mutable template refs). */
export function cloneVfs(vfs: Record<string, string>): Record<string, string> {
  return { ...vfs };
}

/** Minimal blank canvas — never brand projects as Asooju */
export const DEFAULT_VFS: Record<string, string> = {
  "App.tsx": `import React from "react";

export default function App() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-8">
      <div className="max-w-md text-center space-y-3">
        <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">New project</p>
        <h1 className="text-2xl font-semibold tracking-tight">Describe what to build</h1>
        <p className="text-sm text-neutral-400 leading-relaxed">
          The agent will generate a unique multifile React app for your prompt — not a generic template.
        </p>
      </div>
    </div>
  );
}
`,
  "index.css": `* { box-sizing: border-box; }
body { margin: 0; background: #0a0a0a; color: #f5f5f5; font-family: Inter, system-ui, sans-serif; }
`,
};

export function isSeedWorkspace(vfs: Record<string, string>): boolean {
  const keys = Object.keys(vfs);
  if (keys.length === 0) return true;
  const app = vfs["App.tsx"] || vfs["App.jsx"] || "";
  return /Describe what to build|New project|Asooju|Blank canvas|Waiting for your prompt/i.test(
    app
  );
}

export function buildFileTree(files: Record<string, string>) {
  const root: Array<{
    name: string;
    type: "file" | "folder";
    path: string;
    children?: Array<{ name: string; type: "file" | "folder"; path: string; children?: any[] }>;
  }> = [];

  Object.keys(files)
    .sort()
    .forEach((fullPath) => {
      const parts = fullPath.split("/");
      let current = root;
      let acc = "";
      parts.forEach((part, idx) => {
        acc = acc ? `${acc}/${part}` : part;
        const isFile = idx === parts.length - 1;
        let node = current.find((n) => n.name === part);
        if (!node) {
          node = {
            name: part,
            type: isFile ? "file" : "folder",
            path: acc,
            children: isFile ? undefined : [],
          };
          current.push(node);
        }
        if (!isFile && node.children) current = node.children;
      });
    });

  return root;
}

export function applyFileUpdates(
  vfs: Record<string, string>,
  files: { path: string; content: string }[]
): Record<string, string> {
  const next = { ...vfs };
  for (const f of files) {
    if (!f?.path) continue;
    next[f.path.replace(/^\.\//, "").replace(/^\/+/, "")] = f.content ?? "";
  }
  return next;
}

export function deriveCodeFromVfs(vfs: Record<string, string>): string {
  return vfs["App.tsx"] || vfs["App.jsx"] || Object.values(vfs)[0] || "";
}
