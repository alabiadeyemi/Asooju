import { describe, it, expect } from "vitest";
import {
  collectNpmPackageImports,
  mergeExportPackageJson,
} from "@/lib/export-deps";

describe("export-deps", () => {
  it("collects scoped and bare imports", () => {
    const pkgs = collectNpmPackageImports({
      "App.tsx": `import { motion } from "framer-motion";
import { Routes } from "react-router-dom";`,
    });
    expect(pkgs).toContain("framer-motion");
    expect(pkgs).toContain("react-router-dom");
  });

  it("merges missing deps into agent package.json without removing custom name", () => {
    const vfs = {
      "App.tsx": `import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";`,
      "package.json": JSON.stringify({
        name: "my-custom-app",
        dependencies: { react: "^18.3.1" },
      }),
    };
    const merged = JSON.parse(mergeExportPackageJson("Ignored", vfs, vfs["package.json"]));
    expect(merged.name).toBe("my-custom-app");
    expect(merged.dependencies["react-dom"]).toBeDefined();
    expect(merged.dependencies["react-router-dom"]).toBeDefined();
    expect(merged.scripts.dev).toBe("vite");
    expect(merged.devDependencies.vite).toBeDefined();
  });
});
