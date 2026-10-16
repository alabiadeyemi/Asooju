import { describe, expect, it } from "vitest";
import { projectSummary } from "@/lib/project-summary";

describe("projectSummary", () => {
  it("ignores the blank-canvas template label and uses the first real user message", () => {
    expect(
      projectSummary({
        prompt: "Blank canvas — invent a unique app from the user's first prompt",
        chat_messages: [
          { role: "assistant", content: "Hey" },
          { role: "user", content: "build a shop for Mary's ceramics" },
        ],
      })
    ).toBe("build a shop for Mary's ceramics");
  });

  it("keeps a real stored prompt when there is no chat", () => {
    expect(projectSummary({ prompt: "SaaS dashboard with sidebar and metrics" })).toBe(
      "SaaS dashboard with sidebar and metrics"
    );
  });
});
