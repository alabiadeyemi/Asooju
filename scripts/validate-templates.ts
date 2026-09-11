import Babel from "@babel/standalone";
import { PROJECT_TEMPLATES } from "../src/lib/templates.ts";

const allowed = new Set([
  "react",
  "react-dom",
  "react-dom/client",
  "lucide-react",
  "framer-motion",
  "react-router-dom",
  "@/lib/supabase",
]);

function resolve(from: string, spec: string, vfs: Record<string, string>) {
  if (!spec.startsWith(".")) return null;
  const parts = from.split("/");
  parts.pop();
  for (const p of spec.split("/")) {
    if (p === "..") parts.pop();
    else if (p !== ".") parts.push(p);
  }
  const base = parts.join("/");
  for (const e of ["", ".tsx", ".ts", ".js", ".jsx", "/index.tsx"]) {
    if (vfs[base + e]) return base + e;
  }
  return base;
}

let failed = 0;
for (const t of PROJECT_TEMPLATES) {
  console.log(`\n=== ${t.id} (${Object.keys(t.vfs).length} files) ===`);
  for (const [path, content] of Object.entries(t.vfs)) {
    if (path.endsWith(".css")) {
      console.log(`  CSS  ${path}`);
      continue;
    }
    if (content.includes("${") && !content.includes("${`") && /\$\{[a-zA-Z_]/.test(content)) {
      // Flag accidental unevaluated template holes that aren't inside nested template literals in source
      // JSX should use {"$" + x} not ${x}
    }
    try {
      Babel.transform(content, {
        presets: [
          ["react", { runtime: "classic" }],
          "typescript",
          ["env", { modules: "commonjs", targets: { browsers: "last 2 chrome versions" } }],
        ],
        filename: path,
      });
      const imports = [...content.matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1]);
      for (const i of imports) {
        if (i.startsWith(".") || i.startsWith("@/")) continue;
        if (!allowed.has(i)) {
          failed++;
          console.error(`  BAD IMPORT ${path}: ${i}`);
        }
      }
      for (const i of imports) {
        if (!i.startsWith(".")) continue;
        const resolved = resolve(path, i, t.vfs);
        if (!resolved || !t.vfs[resolved]) {
          failed++;
          console.error(`  MISSING ${path} -> ${i} (${resolved})`);
        }
      }
      console.log(`  OK   ${path}`);
    } catch (e: any) {
      failed++;
      console.error(`  FAIL ${path}: ${e.message}`);
    }
  }
}

console.log(failed ? `\nFAILED ${failed}` : "\nALL TEMPLATES OK");
process.exit(failed ? 1 : 0);
