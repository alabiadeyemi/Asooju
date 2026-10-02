import { collectViteEnvKeys, prepareExportBundle } from "@/lib/export-bundle";

export type ShipChecklistItem = {
  id: string;
  title: string;
  detail: string;
  done: boolean;
  /** Text for clipboard when user taps Copy */
  copyText?: string;
  copyLabel?: string;
};

export type ShipChecklist = {
  items: ShipChecklistItem[];
  envKeys: string[];
  schemaPath: string | null;
  vercelEnvBlock: string;
  previewNote: string;
};

function findSchemaPath(vfs: Record<string, string>): string | null {
  const exact = vfs["supabase/schema.sql"];
  if (exact != null) return "supabase/schema.sql";
  const key = Object.keys(vfs).find((p) => /schema\.sql$/i.test(p));
  return key || null;
}

export function buildVercelEnvBlock(keys: string[]): string {
  if (keys.length === 0) {
    return "# Add any VITE_* variables your app reads (Project Settings → Environment Variables)";
  }
  return keys.map((k) => `${k}=`).join("\n");
}

/** Export-page ship steps derived from workspace VFS (+ export bundle artifacts). */
export function buildShipChecklist(
  vfs: Record<string, string>,
  projectName = "app"
): ShipChecklist {
  const bundled = prepareExportBundle(vfs, { projectName });
  const envKeys = collectViteEnvKeys(vfs);
  const envExample = bundled[".env.example"] || "";
  const schemaPath = findSchemaPath(vfs);
  const schemaSql = schemaPath ? vfs[schemaPath] || bundled[schemaPath] || "" : "";
  const hasSupabaseClient = Boolean(vfs["lib/supabase.ts"] || bundled["lib/supabase.ts"]);
  const readme = bundled["README.md"] || "";

  const items: ShipChecklistItem[] = [
    {
      id: "download",
      title: "Download source ZIP",
      detail: "Includes README, .env.example, and a minimal Vite scaffold when missing from the workspace.",
      done: Object.keys(vfs).length > 0,
    },
    {
      id: "local",
      title: "Run locally",
      detail: "Copy .env.example → .env, then npm install && npm run dev (see README in the ZIP).",
      done: Boolean(readme || bundled["package.json"]),
      copyText: envExample || undefined,
      copyLabel: "Copy .env.example",
    },
  ];

  if (schemaPath && schemaSql.trim()) {
    items.push({
      id: "sql",
      title: "Apply database schema",
      detail: `Run ${schemaPath} in Supabase → SQL Editor (creates tables + RLS for production).`,
      done: true,
      copyText: schemaSql,
      copyLabel: "Copy SQL",
    });
  } else if (hasSupabaseClient) {
    items.push({
      id: "sql",
      title: "Database schema",
      detail: "App references Supabase but no supabase/schema.sql found — add SQL or use demo/local data only.",
      done: false,
    });
  }

  if (envKeys.length > 0) {
    items.push({
      id: "env",
      title: "Set environment variables",
      detail: `Add these in Vercel (or .env locally): ${envKeys.join(", ")}`,
      done: true,
      copyText: buildVercelEnvBlock(envKeys),
      copyLabel: "Copy for Vercel",
    });
  }

  items.push({
    id: "github",
    title: "Push to GitHub",
    detail:
      "Same runnable bundle as ZIP (Vite scaffold, README, .env.example, .gitignore). GitHub does not run the app or store secrets — clone, copy .env.example → .env, npm install, npm run dev.",
    done: false,
  });

  items.push({
    id: "vercel",
    title: "Deploy on Vercel",
    detail: "Import GitHub repo · Framework: Vite · Build: npm run build · Output: dist · Add env vars from step above.",
    done: false,
  });

  return {
    items,
    envKeys,
    schemaPath,
    vercelEnvBlock: buildVercelEnvBlock(envKeys),
    previewNote:
      "Builder preview is a draft (iframe or beta bundler). Production uses the downloaded ZIP + env + schema above.",
  };
}

export async function copyShipText(text: string): Promise<boolean> {
  if (!text.trim()) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
