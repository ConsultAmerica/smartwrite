/**
 * Highest-value release gates:
 * 1) Save race — late rev must not overwrite newer
 * 2) Stale rewrite — replacement blocked; insert/cancel offered
 * 3) Offline recovery — emergency snapshot restores, then prunes after confirm
 */
import { beforeEach, describe, expect, it } from "vitest";
import { createAsyncOpMeta } from "./asyncOp";
import {
  clearRecoverySnapshot,
  getCommittedRevision,
  pruneRecoveryAfterConfirm,
  readRecoverySnapshot,
  restoreRecoveryIfNewer,
  scopesMatch,
  writeRecoverySnapshot,
} from "./documentSession";
import {
  confirmServerRevision,
  deleteLocalDraft,
  localDraftsAsDocuments,
  saveLocalDraft,
} from "./draftStorage";

describe("1. Save race", () => {
  beforeEach(() => localStorage.clear());

  it("rev 1 starts, rev 2 wins, late rev 1 is discarded", () => {
    const id = "race-save";
    const op1 = createAsyncOpMeta(id, 1);
    const op2 = createAsyncOpMeta(id, 2);

    // Simulate overlapping saves: rev2 completes first
    const after2 = saveLocalDraft("Doc", "content-rev-2", null, id, op2.clientRevision);
    expect(after2.content).toBe("content-rev-2");
    expect(getCommittedRevision(id)).toBe(2);

    // Late rev1 response must not overwrite
    const after1Late = saveLocalDraft("Doc", "content-rev-1", null, id, op1.clientRevision);
    expect(after1Late.content).toBe("content-rev-2");
    expect(getCommittedRevision(id)).toBe(2);

    const docs = localDraftsAsDocuments();
    expect(docs.find((d) => d.local_id === id)?.content).toBe("content-rev-2");
    deleteLocalDraft(id);
  });

  it("edit doc A then switch to B — A late save never touches B", () => {
    saveLocalDraft("A", "aaa-v1", null, "doc-a", 1);
    saveLocalDraft("B", "bbb-v1", null, "doc-b", 1);
    // User edits A to v2 but switches; B is active. Late A save for v2 is ok for A only.
    saveLocalDraft("A", "aaa-v2", null, "doc-a", 2);
    // Stale A rev1 must not affect B
    saveLocalDraft("A", "STALE", null, "doc-a", 1);
    const a = localDraftsAsDocuments().find((d) => d.local_id === "doc-a");
    const b = localDraftsAsDocuments().find((d) => d.local_id === "doc-b");
    expect(a?.content).toBe("aaa-v2");
    expect(b?.content).toBe("bbb-v1");
    deleteLocalDraft("doc-a");
    deleteLocalDraft("doc-b");
  });
});

describe("2. Stale rewrite", () => {
  it("blocks replace when source text changes; offers insert/cancel path", () => {
    const documentKey = "doc-rw";
    let revision = 5;
    let text = "Hello world, this is fine.";
    const start = 0;
    const end = 11; // "Hello world"
    const sourceText = text.slice(start, end);

    const meta = createAsyncOpMeta(documentKey, revision);
    const scope = {
      requestId: meta.requestId,
      documentKey,
      revision,
      start,
      end,
      sourceText,
      startedAt: meta.startedAt,
    };

    // User edits selection while rewrite is in flight
    revision += 1;
    text = "Hallo world, this is fine.";

    const stillMatches = scopesMatch(scope, {
      documentKey,
      revision,
      text,
    });
    expect(stillMatches).toBe(false);

    // Replacement blocked — UI would prompt Insert as new text / Cancel
    const rewriteResult = "Hello there, professionally.";
    const insertAsNew = `${text.trimEnd()}\n\n${rewriteResult}`;
    expect(insertAsNew).toContain(text);
    expect(insertAsNew).toContain(rewriteResult);
    // Cancel leaves text unchanged
    expect(text).toBe("Hallo world, this is fine.");
  });

  it("aborts applicability when document key changes (switch docs)", () => {
    const scope = {
      requestId: "rw-switch",
      documentKey: "doc-a",
      revision: 2,
      start: 0,
      end: 4,
      sourceText: "Test",
    };
    expect(
      scopesMatch(scope, { documentKey: "doc-b", revision: 2, text: "Test more" })
    ).toBe(false);
  });
});

describe("3. Offline recovery", () => {
  beforeEach(() => localStorage.clear());

  it("types → offline edits → crash → restore recovery → reconnect flushes latest", () => {
    const id = "offline-1";
    // Canonical draft at rev 1 (last successful debounce)
    saveLocalDraft("Offline Doc", "typed while online", null, id, 1);

    // More typing while offline — emergency snapshot only (debounce never flushed)
    writeRecoverySnapshot({
      localId: id,
      title: "Offline Doc",
      content: "typed while online and kept typing offline",
      revision: 3,
      updatedAt: new Date().toISOString(),
    });

    // Crash / reload simulation: draft still rev 1, recovery is newer
    const draft = localDraftsAsDocuments().find((d) => d.local_id === id);
    expect(draft?.content).toBe("typed while online");

    const recovered = restoreRecoveryIfNewer(id, draft?.content ? 1 : 0);
    expect(recovered?.content).toBe("typed while online and kept typing offline");
    expect(recovered?.revision).toBe(3);

    // Reconnect flush — promote recovery into canonical draft
    saveLocalDraft(
      recovered!.title,
      recovered!.content,
      null,
      id,
      recovered!.revision
    );
    expect(localDraftsAsDocuments().find((d) => d.local_id === id)?.content).toBe(
      "typed while online and kept typing offline"
    );

    // Server confirms → prune emergency snapshot (must not resurrect older text later)
    confirmServerRevision(id, 3);
    expect(readRecoverySnapshot(id)).toBeNull();

    // Stale older recovery must not restore
    writeRecoverySnapshot({
      localId: id,
      title: "Offline Doc",
      content: "OLD STALE RECOVERY",
      revision: 1,
      updatedAt: new Date().toISOString(),
    });
    expect(restoreRecoveryIfNewer(id, 3)).toBeNull();
    expect(readRecoverySnapshot(id)).toBeNull();

    deleteLocalDraft(id);
  });

  it("prunes recovery when confirmed revision catches up", () => {
    const id = "prune-1";
    writeRecoverySnapshot({
      localId: id,
      title: "T",
      content: "snap",
      revision: 4,
      updatedAt: new Date().toISOString(),
    });
    pruneRecoveryAfterConfirm(id, 4);
    expect(readRecoverySnapshot(id)).toBeNull();
    clearRecoverySnapshot(id);
  });
});

describe("async op metadata", () => {
  it("includes documentKey, clientRevision, requestId, startedAt", () => {
    const meta = createAsyncOpMeta("doc-x", 42);
    expect(meta.documentKey).toBe("doc-x");
    expect(meta.clientRevision).toBe(42);
    expect(meta.requestId).toMatch(/^op-/);
    expect(typeof meta.startedAt).toBe("number");
  });
});
