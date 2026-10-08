import { describe, expect, it } from "vitest";
import { detectGeneralEnhancements } from "./generalAnalysis";

describe("local analysis fallback", () => {
  it("detects malformed currency like $20.e", () => {
    const issues = detectGeneralEnhancements("Incentive: $20.e via choice.");
    const hit = issues.find((i) => i.problem.includes("$20"));
    expect(hit).toBeTruthy();
    expect(hit?.suggestion).toBe("$20");
  });

  it("detects repeated words", () => {
    const issues = detectGeneralEnhancements("I saw the the dog.");
    expect(issues.some((i) => /repeated/i.test(i.message) || i.suggestion === "the")).toBe(true);
  });

  it("detects duplicate spaces", () => {
    const issues = detectGeneralEnhancements("Hello  world");
    expect(issues.some((i) => i.suggestion === " ")).toBe(true);
  });
});
