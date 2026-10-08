/**
 * End-to-end style flow without a browser:
 * create draft → local issue → accept → rewrite preview replace → persist → reopen.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { detectGeneralEnhancements } from "./generalAnalysis";
import {
  deleteLocalDraft,
  localDraftsAsDocuments,
  saveLocalDraft,
} from "./draftStorage";

describe("document writing flow", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("persists rewritten text after accept + rewrite replace", () => {
    const draft = saveLocalDraft("Flow Doc", "Incentive: $20.e via choice of dozens.");
    const issues = detectGeneralEnhancements(draft.content);
    const currency = issues.find((i) => i.suggestion === "$20");
    expect(currency).toBeTruthy();

    const afterAccept =
      draft.content.slice(0, currency!.offset) +
      currency!.suggestion +
      draft.content.slice(currency!.offset + currency!.length);
    expect(afterAccept).toContain("$20");
    expect(afterAccept).not.toContain("$20.e");

    const sentenceStart = afterAccept.indexOf("Incentive");
    const sentenceEnd = afterAccept.indexOf(".", sentenceStart) + 1;
    const rewritten = "Incentive: $20 through dozens of options.";
    const replaced =
      afterAccept.slice(0, sentenceStart) + rewritten + afterAccept.slice(sentenceEnd);

    saveLocalDraft("Flow Doc", replaced, null, draft.id);
    const reopened = localDraftsAsDocuments().find((d) => d.local_id === draft.id);
    expect(reopened?.content).toBe(replaced);

    deleteLocalDraft(draft.id);
    expect(localDraftsAsDocuments().some((d) => d.local_id === draft.id)).toBe(false);
  });
});
