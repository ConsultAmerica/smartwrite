import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getBetaReportRollup,
  hashDocumentKey,
  notePossibleUndo,
  noteRewriteReplaced,
  noteSuggestionAccepted,
  noteTextChangedAfterAccept,
  trackBetaEvent,
  wordCountBucket,
} from "./betaAnalytics";

describe("betaAnalytics", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.useRealTimers();
  });

  it("hashes document keys without exposing the raw key", () => {
    const hash = hashDocumentKey("local-123");
    expect(hash).toMatch(/^[0-9a-f]{8}$/);
    expect(hash).not.toContain("local");
    expect(hashDocumentKey("local-123")).toBe(hash);
  });

  it("buckets word counts", () => {
    expect(wordCountBucket(0)).toBe("0");
    expect(wordCountBucket(12)).toBe("1-49");
    expect(wordCountBucket(120)).toBe("50-199");
    expect(wordCountBucket(8000)).toBe("5000+");
  });

  it("tracks rewrite undo within 30s as rewrite_undone", () => {
    noteRewriteReplaced("doc-a", 4, "professional");
    notePossibleUndo("doc-a", 4);
    const rollup = getBetaReportRollup();
    expect(rollup.counts.rewrite_replaced).toBe(1);
    expect(rollup.counts.rewrite_undone).toBe(1);
    expect(rollup.quality.rewriteUndoRate).toBe(1);
  });

  it("tracks suggestion revert when accepted text is edited away", () => {
    noteSuggestionAccepted("doc-b", "grammar", "We were", 2);
    noteTextChangedAfterAccept("doc-b", "We are planning ahead.");
    const rollup = getBetaReportRollup();
    expect(rollup.counts.suggestion_accepted).toBe(1);
    expect(rollup.counts.suggestion_reverted).toBe(1);
  });

  it("never stores document text in event props", () => {
    trackBetaEvent("document_saved", {
      documentKeyHash: hashDocumentKey("secret-doc"),
      wordCountBucket: "1-49",
    });
    const raw = localStorage.getItem("smartwrite-beta-events") || "";
    expect(raw).not.toMatch(/secret-doc/);
    expect(raw.toLowerCase()).not.toMatch(/rewritten|title|content/);
  });

  it("builds a four-section rollup", () => {
    trackBetaEvent("rewrite_requested", {});
    trackBetaEvent("rewrite_succeeded", { latencyMs: 1800 });
    trackBetaEvent("rewrite_succeeded", { latencyMs: 4700 });
    trackBetaEvent("analysis_completed", { latencyMs: 620 });
    trackBetaEvent("analysis_completed", { latencyMs: 1400 });
    trackBetaEvent("suggestion_shown", {});
    trackBetaEvent("suggestion_accepted", {});
    const report = getBetaReportRollup();
    expect(report.performance.p50RewriteMs).toBeGreaterThan(0);
    expect(report.performance.p95RewriteMs).toBeGreaterThanOrEqual(report.performance.p50RewriteMs);
    expect(report.reliability).toBeDefined();
    expect(report.quality).toBeDefined();
  });
});
