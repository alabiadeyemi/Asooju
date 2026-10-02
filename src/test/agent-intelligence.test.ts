import { describe, it, expect } from "vitest";
import {
  applyDeterministicPreviewFixes,
  compactConversation,
  composeFixPrompt,
  diagnoseWorkspace,
  errorSignature,
  extractErrorPaths,
  limitFixPayload,
  pickFixScale,
  resolveImport,
  runPreviewPreflight,
  windowAroundLine,
} from "@/lib/agent-intelligence";
import { buildSmartVfsContext } from "@/lib/generation-prompt";
import { classifyBuildScale } from "@/lib/complexity";

const vfs = {
  "App.tsx": `import { MemoryRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
export default function App() {
  return (
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/orders" element={<Orders />} />
      </Routes>
    </MemoryRouter>
  );
}
`,
  "pages/Dashboard.tsx": `import { MemoryRouter } from "react-router-dom";
export default function Dashboard() {
  return <MemoryRouter><div>Dash</div></MemoryRouter>;
}
`,
  "pages/Orders.tsx": `export default function Orders() { return <div>Orders</div>; }`,
  "lib/db.ts": `export const db = {};`,
  "index.css": `body { margin: 0 }`,
};

describe("agent intelligence", () => {
  it("extracts cited files and component names from stacks", () => {
    const paths = extractErrorPaths(
      `Cannot find module 'pages/Orders.tsx'\nCheck the render method of \`Dashboard\`.`,
      vfs
    );
    expect(paths).toContain("pages/Orders.tsx");
    expect(paths).toContain("pages/Dashboard.tsx");
  });

  it("pins error files in VFS context even when they wouldn't score high", () => {
    const big: Record<string, string> = { ...vfs };
    for (let i = 0; i < 30; i++) {
      big[`pages/Filler${i}.tsx`] = `export default function Filler${i}(){return <div>${"x".repeat(400)}</div>}`;
    }
    const { context } = buildSmartVfsContext(
      big,
      "please continue",
      "fix",
      "simple",
      { errorText: "Element type is invalid. Check the render method of `Orders`." }
    );
    expect(context).toContain("pages/Orders.tsx");
    expect(context).toMatch(/OMITTED FILE INDEX/);
  });

  it("diagnoses nested routers and unwraps inner ones without an LLM", () => {
    const dx = diagnoseWorkspace(
      vfs,
      "You cannot render a <Router> inside another <Router>."
    );
    expect(dx.nestedRouterFiles.length).toBeGreaterThan(1);
    expect(dx.issues[0]).toMatch(/Nested routers/);

    const { vfs: next, notes } = applyDeterministicPreviewFixes(
      vfs,
      "You cannot render a <Router> inside another <Router>."
    );
    expect(notes.some((n) => n.includes("pages/Dashboard.tsx"))).toBe(true);
    expect(next["pages/Dashboard.tsx"]).not.toMatch(/<MemoryRouter\b/);
    expect(next["pages/Dashboard.tsx"]).not.toMatch(/import\s*\{[^}]*MemoryRouter/);
    expect(next["App.tsx"]).toMatch(/MemoryRouter/);
  });

  it("does not repeat a failed fix prompt", () => {
    const prompt = composeFixPrompt({
      error: "module not found pages/Foo.tsx",
      attempt: 2,
      maxAttempts: 2,
      prior: {
        error: "module not found pages/Foo.tsx",
        files: ["App.tsx"],
        thought: "rewrote App shell",
        wroteAny: true,
      },
    });
    expect(prompt).toMatch(/do NOT repeat/i);
    expect(prompt).toMatch(/App\.tsx/);
  });

  it("drops no-op and unrelated autofix rewrites", () => {
    const { files, dropped } = limitFixPayload(
      [
        { path: "pages/Orders.tsx", content: "export default function Orders(){return <b/>}" },
        { path: "index.css", content: vfs["index.css"] },
        { path: "lib/db.ts", content: "export const db = { n: 1 };" },
      ],
      vfs,
      ["pages/Orders.tsx"],
      1
    );
    expect(files.map((f) => f.path)).toEqual(["pages/Orders.tsx"]);
    expect(dropped).toContain("lib/db.ts");
    expect(dropped).not.toContain("index.css");
  });

  it("picks a larger fix scale for big workspaces", () => {
    expect(pickFixScale("simple", 22)).toBe("enterprise");
    expect(classifyBuildScale("tiny", 22)).toBe("enterprise");
  });

  it("windows around a stack line", () => {
    const content = Array.from({ length: 200 }, (_, i) => `line${i + 1}`).join("\n");
    const win = windowAroundLine(content, 100, 5);
    expect(win).toContain("line100");
    expect(win).not.toContain("line1\n");
    expect(win).toMatch(/omitted/);
  });

  it("resolves relative imports", () => {
    expect(resolveImport("App.tsx", "./pages/Dashboard", vfs)).toBe("pages/Dashboard.tsx");
    expect(resolveImport("App.tsx", "./missing", vfs)).toBeNull();
  });

  it("compacts long chats without dropping the latest user ask", () => {
    const messages = Array.from({ length: 20 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `msg-${i} ${"word ".repeat(80)}`,
    }));
    const { digest, olderHint } = compactConversation(messages, { maxMessages: 6 });
    expect(digest).toContain("msg-19");
    expect(olderHint).toContain("Earlier user");
  });

  it("normalizes identical crash signatures", () => {
    expect(errorSignature("Boom at https://x.test/a.js:12")).toBe(
      errorSignature("Boom at https://y.test/b.js:99")
    );
  });

  it("runPreviewPreflight unwraps nested routers without error text", () => {
    const pre = runPreviewPreflight(vfs, "");
    expect(pre.changed).toBe(true);
    expect(pre.notes.some((n) => n.includes("Dashboard"))).toBe(true);
  });

  it("runPreviewPreflight adds default export when default-imported", () => {
    const broken = {
      ...vfs,
      "pages/Orders.tsx": `export function Orders() { return <div>Orders</div>; }`,
      "App.tsx": vfs["App.tsx"].replace(
        `import Orders from "./pages/Orders";`,
        `import Orders from "./pages/Orders";`
      ),
    };
    const pre = runPreviewPreflight(
      broken,
      "Element type is invalid. Check the render method of `Orders`."
    );
    expect(pre.notes.some((n) => n.includes("default export"))).toBe(true);
    expect(pre.vfs["pages/Orders.tsx"]).toMatch(/export default Orders/);
  });

  it("runPreviewPreflight stubs a missing module on module-not-found errors", () => {
    const broken = {
      "App.tsx": `import Widget from "./components/Widget";
export default function App() { return <Widget />; }`,
    };
    const pre = runPreviewPreflight(
      broken,
      "Module not found: Can't resolve './components/Widget' in App.tsx"
    );
    expect(pre.vfs["components/Widget.tsx"]).toMatch(/export default function Widget/);
    expect(pre.notes.some((n) => n.includes("Stubbed"))).toBe(true);
  });
});
