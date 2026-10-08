import { beforeEach, describe, expect, it } from "vitest";
import {
  commitRevisionIfNewer,
  getCommittedRevision,
  readRecoverySnapshot,
  restoreRecoveryIfNewer,
  scopesMatch,
  writeRecoverySnapshot,
} from "./documentSession";
import {
  confirmServerRevision,
  saveLocalDraft,
  localDraftsAsDocuments,
  deleteLocalDraft,
} from "./draftStorage";

describe("revision-safe persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("rejects stale saves that finish after a newer revision", () => {
    const id = "local-race";
    saveLocalDraft("Doc", "version A", null, id, 1);
    saveLocalDraft("Doc", "version B", null, id, 2);
    const stale = saveLocalDraft("Doc", "version A late", null, id, 1);
    expect(stale.content).toBe("version B");
    expect(getCommittedRevision(id)).toBe(2);
    expect(commitRevisionIfNewer(id, 1)).toBe(false);
  });

  it("scopes rewrite to document key + revision + source text", () => {
    const scope = {
      requestId: "rw-1",
      documentKey: "local-a",
      revision: 3,
      start: 0,
      end: 5,
      sourceText: "Hello",
    };
    expect(
      scopesMatch(scope, { documentKey: "local-a", revision: 3, text: "Hello world" })
    ).toBe(true);
    expect(
      scopesMatch(scope, { documentKey: "local-a", revision: 4, text: "Hello world" })
    ).toBe(false);
    expect(
      scopesMatch(scope, { documentKey: "local-b", revision: 3, text: "Hello world" })
    ).toBe(false);
    expect(
      scopesMatch(scope, { documentKey: "local-a", revision: 3, text: "Hallo world" })
    ).toBe(false);
  });

  it("keeps separate documents isolated across saves", () => {
    saveLocalDraft("A", "aaa", null, "doc-a", 1);
    saveLocalDraft("B", "bbb", null, "doc-b", 1);
    saveLocalDraft("A", "aaa-updated", null, "doc-a", 2);
    const docs = localDraftsAsDocuments();
    const a = docs.find((d) => d.local_id === "doc-a");
    const b = docs.find((d) => d.local_id === "doc-b");
    expect(a?.content).toBe("aaa-updated");
    expect(b?.content).toBe("bbb");
    deleteLocalDraft("doc-a");
    deleteLocalDraft("doc-b");
  });

  it("does not resurrect older recovery after server confirm", () => {
    const id = "no-resurrect";
    saveLocalDraft("Doc", "latest", null, id, 5);
    writeRecoverySnapshot({
      localId: id,
      title: "Doc",
      content: "OLD",
      revision: 2,
      updatedAt: new Date().toISOString(),
    });
    confirmServerRevision(id, 5);
    expect(readRecoverySnapshot(id)).toBeNull();
    expect(restoreRecoveryIfNewer(id, 5)).toBeNull();
    deleteLocalDraft(id);
  });
});
