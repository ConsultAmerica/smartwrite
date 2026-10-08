/**
 * Release-gate style integrity checks (no browser):
 * create → local issue → accept → undo → redo → rewrite scope → persist → reopen
 */
import { beforeEach, describe, expect, it } from "vitest";
import { detectGeneralEnhancements } from "./generalAnalysis";
import { saveLocalDraft, localDraftsAsDocuments, deleteLocalDraft } from "./draftStorage";
import { scopesMatch } from "./documentSession";
import { issueFingerprint } from "../utils/issueFingerprint";

describe("release integrity flow", () => {
  beforeEach(() => localStorage.clear());

  it("accept → undo stack equivalent → rewrite stale guard → persist", () => {
    const draft = saveLocalDraft("Integrity", "Incentive: $20.e via choice.", null, "int-1", 1);
    const issues = detectGeneralEnhancements(draft.content);
    const hit = issues.find((i) => i.suggestion === "$20");
    expect(hit).toBeTruthy();

    const accepted =
      draft.content.slice(0, hit!.offset) +
      hit!.suggestion +
      draft.content.slice(hit!.offset + hit!.length);
    expect(accepted).toBe("Incentive: $20 via choice.");

    // undo restores original
    const undone = draft.content;
    expect(undone).toContain("$20.e");

    // redo restores accepted
    const redone = accepted;
    expect(redone).not.toContain("$20.e");

    const scope = {
      requestId: "rw-int",
      documentKey: "int-1",
      revision: 2,
      start: 0,
      end: redone.length,
      sourceText: redone,
    };
    // user edits after rewrite started
    const edited = redone + " More.";
    expect(
      scopesMatch(scope, { documentKey: "int-1", revision: 3, text: edited })
    ).toBe(false);

    saveLocalDraft("Integrity", edited, null, "int-1", 3);
    const reopened = localDraftsAsDocuments().find((d) => d.local_id === "int-1");
    expect(reopened?.content).toBe(edited);

    const fp = issueFingerprint(hit!);
    expect(fp).toContain("$20.e");
    deleteLocalDraft("int-1");
  });
});
