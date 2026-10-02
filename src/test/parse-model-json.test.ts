import { describe, it, expect } from "vitest";
import { parseModelJson, parseJsonLoose, cleanModelJsonText } from "@/lib/parse-model-json";

describe("parse-model-json", () => {
  it("parses fenced JSON", () => {
    const raw = '```json\n{"thought":"ok","files":[]}\n```';
    const { data, recovered } = parseModelJson(raw);
    expect(recovered).toBe(false);
    expect(data.thought).toBe("ok");
  });

  it("recovers complete file objects from truncated JSON", () => {
    const truncated = `{
  "thought": "Shipping wave 1",
  "files": [
    { "path": "App.tsx", "content": "export default function App(){return null}" },
    { "path": "pages/Home.tsx", "content": "export default function Home(){return <div>Hi`;
    const { data, recovered, note } = parseModelJson(truncated);
    expect(recovered).toBe(true);
    expect(note).toMatch(/Recovered 1/);
    expect(Array.isArray(data.files)).toBe(true);
    expect((data.files as { path: string }[])[0].path).toBe("App.tsx");
    expect(data.thought).toBe("Shipping wave 1");
  });

  it("parseJsonLoose matches parseModelJson data", () => {
    const obj = parseJsonLoose('{"plan":["a"],"files":[]}');
    expect(obj.plan).toEqual(["a"]);
  });

  it("cleanModelJsonText strips fences", () => {
    expect(cleanModelJsonText("```json\n{}\n```")).toBe("{}");
  });
});
