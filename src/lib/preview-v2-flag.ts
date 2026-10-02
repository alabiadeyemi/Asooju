/** Default preview = Draft iframe (stable). Live Sandpack = export-shaped bundler (opt-in). */

export function isSandpackPreviewEnabled(): boolean {
  if (import.meta.env.VITE_PREVIEW_V2 === "0") return false;
  if (import.meta.env.VITE_PREVIEW_V2 === "1") return true;
  if (typeof window === "undefined") return false;
  const pref = localStorage.getItem("shipkernel_preview_v2");
  if (pref === "0") return false;
  if (pref === "1") return true;
  return false;
}

export function setSandpackPreviewEnabled(on: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("shipkernel_preview_v2", on ? "1" : "0");
}

/** Export-bundle Sandpack for build/auto-fix verify when UI is iframe-only. */
export function isBuildVerifyBundlerEnabled(): boolean {
  if (typeof window === "undefined") {
    return import.meta.env.VITE_BUILD_VERIFY_BUNDLER === "1";
  }
  if (import.meta.env.VITE_BUILD_VERIFY_BUNDLER === "1") return true;
  return localStorage.getItem("shipkernel_build_verify_bundler") === "1";
}

export function shouldUseBundlerVerify(sandpackPreviewUi: boolean): boolean {
  return sandpackPreviewUi || isBuildVerifyBundlerEnabled();
}
