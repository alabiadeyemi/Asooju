import { describe, it, expect } from "vitest";
import {
  vfsToSandpackFiles,
  sandpackRuntimeDependencies,
  prepareSandpackPreviewFiles,
} from "@/lib/sandpack-vfs";

describe("sandpack-vfs", () => {
  it("maps app sources with leading slash and keeps Sandpack template package.json", () => {
    const files = vfsToSandpackFiles(
      { "App.tsx": "export default function App(){return null}" },
      "Demo"
    );
    expect(files["/App.tsx"]).toContain("export default");
    expect(files["/package.json"]).toBeUndefined();
    expect(files["/vite.config.ts"]).toContain("@vitejs/plugin-react");
    expect(files["/vite.config.ts"]).not.toContain("plugin-react-swc");
    // Nodebox has no readline.clearScreenDown — Vite must not clear the TTY
    expect(files["/vite.config.ts"]).toContain("clearScreen: false");
  });

  it("always injects Sandpack vite.config (ignores project export vite config)", () => {
    const files = prepareSandpackPreviewFiles({
      "App.tsx": "export default function App(){return null}",
      "vite.config.ts": "export default { clearScreen: true }",
    });
    expect(files["/vite.config.ts"]).toContain("clearScreen: false");
    expect(files["/vite.config.ts"]).not.toContain("clearScreen: true");
  });

  it("does not inject export main.tsx (template uses /index.tsx)", () => {
    const files = prepareSandpackPreviewFiles({
      "App.tsx": "export default function App(){return null}",
      "index.css": "body{margin:0}",
    });
    expect(files["/main.tsx"]).toBeUndefined();
    expect(files["/styles.css"]).toContain("margin:0");
  });

  it("collects runtime deps for Sandpack customSetup", () => {
    const deps = sandpackRuntimeDependencies({
      "App.tsx": `import { BrowserRouter } from "react-router-dom";`,
    });
    expect(deps["react-router-dom"]).toBeDefined();
  });

  it("does not override Sandpack template react/react-dom (version mismatch crash)", () => {
    const deps = sandpackRuntimeDependencies({
      "App.tsx": `import React from "react";\nimport { createRoot } from "react-dom/client";`,
    });
    expect(deps.react).toBeUndefined();
    expect(deps["react-dom"]).toBeUndefined();
  });
});
