import { describe, it, expect } from "vitest";
import {
  auditWorkspaceCompleteness,
  buildWaveTargetPaths,
  isHollowStubContent,
  mergeWaveNextPaths,
} from "@/lib/wave-completeness";

describe("wave completeness (6d/6e)", () => {
  it("detects hollow Coming soon screens", () => {
    const stub = `export default function Pricing() {
  return <div className="p-8"><h1>Pricing</h1><p>Coming soon</p></div>;
}`;
    expect(isHollowStubContent(stub)).toBe(true);
  });

  it("mergeWaveNextPaths adds missing import targets beyond model list", () => {
    const vfs = {
      "App.tsx": `import Settings from "./pages/Settings";
export default function App(){ return <Settings />; }`,
    };
    const merged = mergeWaveNextPaths(["pages/Dashboard.tsx"], vfs, { wave: 0, maxWaves: 2 });
    expect(merged).toContain("pages/Dashboard.tsx");
    expect(merged).toContain("pages/Settings.tsx");
  });

  it("buildWaveTargetPaths prioritizes hollow stubs on final wave", () => {
    const vfs = {
      "App.tsx": `import { Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import About from "./pages/About";
export default function App(){
  return <Routes><Route path="/" element={<Home />} /><Route path="/about" element={<About />} /></Routes>;
}`,
      "pages/Home.tsx": `export default function Home(){ return <main>Home live</main>; }`,
      "pages/About.tsx": `export default function About(){ return <div>About — coming soon</div>; }`,
    };
    const audit = auditWorkspaceCompleteness(vfs);
    expect(audit.hollowStubs).toContain("pages/About.tsx");

    const mid = buildWaveTargetPaths({
      vfs,
      sessionNextPaths: ["pages/Checkout.tsx"],
      wave: 0,
      maxWaves: 2,
    });
    expect(mid).toContain("pages/Checkout.tsx");

    const final = buildWaveTargetPaths({
      vfs,
      sessionNextPaths: [],
      wave: 1,
      maxWaves: 2,
    });
    expect(final).toContain("pages/About.tsx");
  });
});
