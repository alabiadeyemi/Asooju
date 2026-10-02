import { describe, it, expect, beforeEach } from "vitest";
import {
  previewEnvFromRecord,
  readProjectPreviewEnv,
  resolveProjectPreviewEnv,
  resolveProjectPreviewEnvFromSources,
  writeProjectPreviewEnv,
} from "@/lib/project-preview-env";

describe("project-preview-env", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("round-trips url and anon key per project id", () => {
    writeProjectPreviewEnv("proj-a", "https://a.supabase.co", "anon-a");
    writeProjectPreviewEnv("proj-b", "https://b.supabase.co", "anon-b");

    expect(readProjectPreviewEnv("proj-a")).toEqual({
      url: "https://a.supabase.co",
      anonKey: "anon-a",
    });
    expect(readProjectPreviewEnv("proj-b")).toEqual({
      url: "https://b.supabase.co",
      anonKey: "anon-b",
    });
    expect(readProjectPreviewEnv("missing")).toBeNull();
  });

  it("trims values on write", () => {
    writeProjectPreviewEnv("p1", "  https://x.co  ", "  key  ");
    expect(readProjectPreviewEnv("p1")).toEqual({
      url: "https://x.co",
      anonKey: "key",
    });
  });

  it("resolveProjectPreviewEnv returns empty when unsaved (no platform fallback)", () => {
    expect(resolveProjectPreviewEnv("no-save-yet")).toEqual({ url: "", anonKey: "" });
    expect(resolveProjectPreviewEnv(undefined)).toEqual({ url: "", anonKey: "" });
    writeProjectPreviewEnv("saved", "https://p.supabase.co", "anon");
    expect(resolveProjectPreviewEnv("saved")).toEqual({
      url: "https://p.supabase.co",
      anonKey: "anon",
    });
  });

  it("prefers cloud row over localStorage when both exist", () => {
    writeProjectPreviewEnv("p1", "https://local.supabase.co", "local-key");
    expect(
      resolveProjectPreviewEnvFromSources("p1", {
        preview_supabase_url: "https://cloud.supabase.co",
        preview_supabase_anon_key: "cloud-key",
      })
    ).toEqual({ url: "https://cloud.supabase.co", anonKey: "cloud-key" });
  });

  it("previewEnvFromRecord returns null when empty", () => {
    expect(previewEnvFromRecord(null)).toBeNull();
    expect(previewEnvFromRecord({ preview_supabase_url: "  ", preview_supabase_anon_key: "" })).toBeNull();
  });
});
