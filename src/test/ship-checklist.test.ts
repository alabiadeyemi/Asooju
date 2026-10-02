import { describe, it, expect } from "vitest";
import { buildShipChecklist, buildVercelEnvBlock } from "@/lib/ship-checklist";

describe("ship-checklist", () => {
  it("includes SQL copy when schema exists", () => {
    const vfs = {
      "App.tsx": "export default function App(){return null}",
      "lib/supabase.ts": "export const hasBackend = true",
      "supabase/schema.sql": "create table items (id uuid primary key);",
    };
    const { items, schemaPath } = buildShipChecklist(vfs, "Shop");
    expect(schemaPath).toBe("supabase/schema.sql");
    const sql = items.find((i) => i.id === "sql");
    expect(sql?.copyText).toContain("create table items");
    expect(sql?.copyLabel).toBe("Copy SQL");
  });

  it("lists env keys for Vercel block", () => {
    const block = buildVercelEnvBlock(["VITE_SUPABASE_URL", "VITE_FOO"]);
    expect(block).toContain("VITE_SUPABASE_URL=");
    expect(block).toContain("VITE_FOO=");
  });

  it("marks missing schema when supabase client without sql", () => {
    const { items } = buildShipChecklist({
      "App.tsx": "x",
      "lib/supabase.ts": "x",
    });
    const sql = items.find((i) => i.id === "sql");
    expect(sql?.done).toBe(false);
  });
});
