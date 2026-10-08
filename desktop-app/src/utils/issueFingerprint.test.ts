import { describe, expect, it } from "vitest";
import type { GrammarIssue } from "../types";
import { dedupeIssues, issueFingerprint, resolveIssueRange } from "./issueFingerprint";

function issue(partial: Partial<GrammarIssue> & Pick<GrammarIssue, "offset" | "length" | "problem">): GrammarIssue {
  return {
    id: "x",
    message: "m",
    short_message: "s",
    issue_title: "t",
    suggestion: "$20",
    why: "w",
    replacements: ["$20"],
    rule_id: "GEN_GRAMMAR",
    category: "grammar",
    issue_type: "grammar",
    ...partial,
  };
}

describe("issue fingerprints and ranges", () => {
  it("keeps dismiss key stable across offset shifts", () => {
    const a = issue({ offset: 10, length: 5, problem: "$20.e" });
    const b = issue({ offset: 40, length: 5, problem: "$20.e" });
    expect(issueFingerprint(a)).toBe(issueFingerprint(b));
  });

  it("resolves drifted offsets near the original span", () => {
    const text = "Hello Incentive: $20.e via choice.";
    const range = resolveIssueRange(text, {
      offset: 0,
      length: 5,
      problem: "$20.e",
    });
    expect(range).toEqual({ start: 17, end: 22 });
  });

  it("dedupes overlapping local + backend suggestions", () => {
    const list = dedupeIssues([
      issue({ id: "a", offset: 10, length: 5, problem: "$20.e" }),
      issue({ id: "b", offset: 10, length: 5, problem: "$20.e" }),
    ]);
    expect(list).toHaveLength(1);
  });
});
