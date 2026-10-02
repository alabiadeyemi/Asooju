import { describe, it, expect, beforeEach } from "vitest";
import {
  isBuildVerifyBundlerEnabled,
  isSandpackPreviewEnabled,
  shouldUseBundlerVerify,
} from "@/lib/preview-v2-flag";

describe("preview verify bundler flag", () => {
  beforeEach(() => localStorage.clear());

  it("shouldUseBundlerVerify when UI off but flag in localStorage", () => {
    localStorage.setItem("shipkernel_build_verify_bundler", "1");
    expect(isBuildVerifyBundlerEnabled()).toBe(true);
    expect(shouldUseBundlerVerify(false)).toBe(true);
    expect(shouldUseBundlerVerify(true)).toBe(true);
  });

  it("defaults to iframe verify when UI and flag off", () => {
    expect(shouldUseBundlerVerify(false)).toBe(false);
  });

  it("defaults to Draft iframe UI when no saved preference", () => {
    expect(isSandpackPreviewEnabled()).toBe(false);
    localStorage.setItem("shipkernel_preview_v2", "1");
    expect(isSandpackPreviewEnabled()).toBe(true);
  });
});
