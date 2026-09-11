import * as BabelNS from "@babel/standalone";
import { PROJECT_TEMPLATES } from "../src/lib/templates.ts";

const Babel = (BabelNS as any).default || BabelNS;

function resolve(from: string, spec: string, vfs: Record<string, string>) {
  const parts = from.split("/");
  parts.pop();
  for (const p of spec.split("/")) {
    if (p === "..") parts.pop();
    else if (p !== ".") parts.push(p);
  }
  const base = parts.join("/");
  for (const e of ["", ".tsx", ".ts", ".js", ".jsx"]) {
    if (vfs[base + e]) return base + e;
  }
  return null;
}

function mockReact() {
  const React: any = {
    createElement: () => null,
    useState: (v: any) => [typeof v === "function" ? v() : v, () => {}],
    useMemo: (f: any) => f(),
    useEffect: () => {},
    useRef: () => ({ current: null }),
  };
  React.default = React;
  return React;
}

let failed = 0;
for (const t of PROJECT_TEMPLATES) {
  const cache: Record<string, { exports: any }> = {};
  const req = (spec: string, from: string) => {
    if (spec === "react") return mockReact();
    if (!spec.startsWith(".")) throw new Error(`external import ${spec}`);
    const resolved = resolve(from, spec, t.vfs);
    if (!resolved || !t.vfs[resolved]) throw new Error(`missing ${spec} from ${from}`);
    if (cache[resolved]) return cache[resolved].exports;
    const code = Babel.transform(t.vfs[resolved], {
      presets: [
        ["react", { runtime: "classic" }],
        "typescript",
        ["env", { modules: "commonjs" }],
      ],
      filename: resolved,
    }).code;
    const module = { exports: {} as any };
    cache[resolved] = module;
    const fn = new Function("require", "exports", "module", "React", code);
    fn((s: string) => req(s, resolved), module.exports, module, mockReact());
    return module.exports;
  };
  try {
    const m = req("./App.tsx", "index.js");
    const C = m.default || m.App || m;
    if (typeof C !== "function") throw new Error(`bad export ${typeof C}`);
    C({});
    console.log(`RUNTIME OK ${t.id}`);
  } catch (e: any) {
    failed++;
    console.error(`RUNTIME FAIL ${t.id}: ${e.message}`);
  }
}

process.exit(failed ? 1 : 0);
