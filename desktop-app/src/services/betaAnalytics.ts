/**
 * Privacy-conscious beta product analytics.
 * Never sends document text, titles, selections, or rewrite contents.
 */

import type { AsyncOpMeta } from "./asyncOp";

export type BetaEventName =
  | "document_created"
  | "document_opened"
  | "document_saved"
  | "template_previewed"
  | "template_used"
  | "suggestion_shown"
  | "suggestion_opened"
  | "suggestion_accepted"
  | "suggestion_dismissed"
  | "suggestion_reverted"
  | "rewrite_requested"
  | "rewrite_succeeded"
  | "rewrite_failed"
  | "rewrite_replaced"
  | "rewrite_inserted"
  | "rewrite_cancelled"
  | "rewrite_undone"
  | "analysis_completed"
  | "analysis_failed"
  | "offline_fallback_started"
  | "offline_fallback_ended"
  | "recovery_restored"
  | "stale_save_dropped"
  | "stale_analysis_dropped"
  | "stale_rewrite_blocked"
  | "feedback_helpful"
  | "feedback_unhelpful";

export type FeedbackReason =
  | "too_wordy"
  | "changed_meaning"
  | "wrong_tone"
  | "not_accurate"
  | "other";

export interface BetaEventProps {
  requestId?: string;
  documentKeyHash?: string;
  clientRevision?: number;
  templateType?: string;
  suggestionType?: string;
  rewriteMode?: string;
  latencyMs?: number;
  errorCode?: string;
  wordCountBucket?: string;
  feedbackTarget?: "rewrite" | "suggestion";
  feedbackReason?: FeedbackReason;
  surface?: string;
}

export interface BetaEvent {
  name: BetaEventName;
  at: number;
  props: BetaEventProps;
}

const EVENTS_KEY = "smartwrite-beta-events";
const SALT_KEY = "smartwrite-beta-salt";
const MAX_EVENTS = 2000;
const REVERSAL_WINDOW_MS = 30_000;

type PendingReversal =
  | {
      kind: "rewrite";
      at: number;
      documentKeyHash: string;
      revisionAfter: number;
    }
  | {
      kind: "suggestion";
      at: number;
      documentKeyHash: string;
      /** In-memory only for 30s reversal check — never written to analytics storage. */
      acceptedText: string;
    };

let pendingReversal: PendingReversal | null = null;
let offlineFallbackActive = false;
const shownSuggestionKeys = new Set<string>();

function getSalt(): string {
  try {
    let salt = localStorage.getItem(SALT_KEY);
    if (!salt) {
      salt = `s${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
      localStorage.setItem(SALT_KEY, salt);
    }
    return salt;
  } catch {
    return "smartwrite-beta";
  }
}

/** Non-reversible-enough client hash for document keys (never send raw ids). */
export function hashDocumentKey(documentKey: string): string {
  const input = `${getSalt()}|${documentKey}`;
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function wordCountBucket(wordCount: number): string {
  if (wordCount <= 0) return "0";
  if (wordCount < 50) return "1-49";
  if (wordCount < 200) return "50-199";
  if (wordCount < 1000) return "200-999";
  if (wordCount < 5000) return "1000-4999";
  return "5000+";
}

function loadEvents(): BetaEvent[] {
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as BetaEvent[]) : [];
  } catch {
    return [];
  }
}

function saveEvents(events: BetaEvent[]): void {
  try {
    localStorage.setItem(EVENTS_KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
  } catch {
    /* quota */
  }
}

export function trackBetaEvent(name: BetaEventName, props: BetaEventProps = {}): void {
  const event: BetaEvent = { name, at: Date.now(), props };
  saveEvents([...loadEvents(), event]);
  if (import.meta.env.DEV) {
    console.info("[SmartWrite beta]", name, props);
  }
}

export function trackBetaFromMeta(
  name: BetaEventName,
  meta?: AsyncOpMeta,
  extra: BetaEventProps = {}
): void {
  trackBetaEvent(name, {
    requestId: meta?.requestId,
    documentKeyHash: meta ? hashDocumentKey(meta.documentKey) : undefined,
    clientRevision: meta?.clientRevision,
    ...extra,
  });
}

export function noteSuggestionShown(
  documentKey: string,
  suggestionType: string,
  issueId: string
): void {
  const key = `${documentKey}:${issueId}`;
  if (shownSuggestionKeys.has(key)) return;
  shownSuggestionKeys.add(key);
  trackBetaEvent("suggestion_shown", {
    documentKeyHash: hashDocumentKey(documentKey),
    suggestionType,
  });
}

export function noteSuggestionAccepted(
  documentKey: string,
  suggestionType: string,
  acceptedText: string,
  clientRevision: number
): void {
  trackBetaEvent("suggestion_accepted", {
    documentKeyHash: hashDocumentKey(documentKey),
    suggestionType,
    clientRevision,
  });
  pendingReversal = {
    kind: "suggestion",
    at: Date.now(),
    documentKeyHash: hashDocumentKey(documentKey),
    acceptedText: acceptedText.trim(),
  };
}

export function noteSuggestionDismissed(documentKey: string, suggestionType: string): void {
  trackBetaEvent("suggestion_dismissed", {
    documentKeyHash: hashDocumentKey(documentKey),
    suggestionType,
  });
}

export function noteRewriteReplaced(documentKey: string, revisionAfter: number, mode?: string): void {
  trackBetaEvent("rewrite_replaced", {
    documentKeyHash: hashDocumentKey(documentKey),
    clientRevision: revisionAfter,
    rewriteMode: mode,
  });
  pendingReversal = {
    kind: "rewrite",
    at: Date.now(),
    documentKeyHash: hashDocumentKey(documentKey),
    revisionAfter,
  };
}

export function noteRewriteInserted(documentKey: string, revisionAfter: number, mode?: string): void {
  trackBetaEvent("rewrite_inserted", {
    documentKeyHash: hashDocumentKey(documentKey),
    clientRevision: revisionAfter,
    rewriteMode: mode,
  });
}

/** Call on undo — detects rewrite undo within 30s (revision may not decrease on undo). */
export function notePossibleUndo(documentKey: string, clientRevision: number): void {
  const pending = pendingReversal;
  if (!pending || pending.kind !== "rewrite") return;
  if (pending.documentKeyHash !== hashDocumentKey(documentKey)) return;
  if (Date.now() - pending.at > REVERSAL_WINDOW_MS) {
    pendingReversal = null;
    return;
  }
  trackBetaEvent("rewrite_undone", {
    documentKeyHash: pending.documentKeyHash,
    clientRevision,
  });
  pendingReversal = null;
}

/**
 * Call after text changes — if an accepted suggestion was manually altered soon after,
 * emit suggestion_reverted (more informative than acceptance alone).
 */
export function noteTextChangedAfterAccept(documentKey: string, text: string): void {
  const pending = pendingReversal;
  if (!pending || pending.kind !== "suggestion") return;
  if (pending.documentKeyHash !== hashDocumentKey(documentKey)) return;
  if (Date.now() - pending.at > REVERSAL_WINDOW_MS) {
    pendingReversal = null;
    return;
  }
  // In-memory check only — accepted text is never exported in analytics payloads.
  if (pending.acceptedText && !text.includes(pending.acceptedText)) {
    trackBetaEvent("suggestion_reverted", {
      documentKeyHash: pending.documentKeyHash,
    });
    pendingReversal = null;
  }
}

export function noteOfflineFallback(started: boolean): void {
  if (started && !offlineFallbackActive) {
    offlineFallbackActive = true;
    trackBetaEvent("offline_fallback_started", {});
  } else if (!started && offlineFallbackActive) {
    offlineFallbackActive = false;
    trackBetaEvent("offline_fallback_ended", {});
  }
}

export function trackFeedback(
  helpful: boolean,
  target: "rewrite" | "suggestion",
  reason?: FeedbackReason
): void {
  trackBetaEvent(helpful ? "feedback_helpful" : "feedback_unhelpful", {
    feedbackTarget: target,
    feedbackReason: reason,
  });
}

export interface BetaReportRollup {
  reliability: {
    rewriteSuccessRate: number;
    analysisSuccessRate: number;
    autosaveSuccessRate: number;
    recoveryRestores: number;
    staleOperations: number;
  };
  quality: {
    suggestionAcceptance: number;
    suggestionDismissal: number;
    suggestionRevertRate: number;
    rewriteReplacement: number;
    rewriteCancellation: number;
    rewriteUndoRate: number;
  };
  performance: {
    p50RewriteMs: number;
    p95RewriteMs: number;
    p50AnalysisMs: number;
    p95AnalysisMs: number;
  };
  counts: Record<string, number>;
}

function rate(num: number, den: number): number {
  if (!den) return 0;
  return Number((num / den).toFixed(3));
}

function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

/** Build the four-section beta release rollup from local events (privacy-safe). */
export function getBetaReportRollup(): BetaReportRollup {
  const events = loadEvents();
  const counts: Record<string, number> = {};
  for (const e of events) counts[e.name] = (counts[e.name] ?? 0) + 1;

  const rewriteLatency = events
    .filter((e) => e.name === "rewrite_succeeded" && typeof e.props.latencyMs === "number")
    .map((e) => e.props.latencyMs as number);
  const analysisLatency = events
    .filter((e) => e.name === "analysis_completed" && typeof e.props.latencyMs === "number")
    .map((e) => e.props.latencyMs as number);

  const rewriteReq = counts.rewrite_requested ?? 0;
  const rewriteOk = counts.rewrite_succeeded ?? 0;
  const rewriteFail = counts.rewrite_failed ?? 0;
  const analysisOk = counts.analysis_completed ?? 0;
  const analysisFail = counts.analysis_failed ?? 0;
  const saved = counts.document_saved ?? 0;
  // autosave failures come from telemetry bridge name collision — count beta if present
  const sugShown = counts.suggestion_shown ?? 0;
  const sugAcc = counts.suggestion_accepted ?? 0;
  const sugDis = counts.suggestion_dismissed ?? 0;
  const sugRev = counts.suggestion_reverted ?? 0;
  const rwRep = counts.rewrite_replaced ?? 0;
  const rwIns = counts.rewrite_inserted ?? 0;
  const rwCancel = counts.rewrite_cancelled ?? 0;
  const rwUndo = counts.rewrite_undone ?? 0;
  const previewOutcomes = rwRep + rwIns + rwCancel;

  const stale =
    (counts.stale_save_dropped ?? 0) +
    (counts.stale_analysis_dropped ?? 0) +
    (counts.stale_rewrite_blocked ?? 0);

  return {
    reliability: {
      rewriteSuccessRate: rate(rewriteOk, rewriteOk + rewriteFail || rewriteReq),
      analysisSuccessRate: rate(analysisOk, analysisOk + analysisFail),
      autosaveSuccessRate: saved ? 1 : 0, // filled from telemetry dashboard in report UI
      recoveryRestores: counts.recovery_restored ?? 0,
      staleOperations: stale,
    },
    quality: {
      suggestionAcceptance: rate(sugAcc, sugShown || sugAcc + sugDis),
      suggestionDismissal: rate(sugDis, sugShown || sugAcc + sugDis),
      suggestionRevertRate: rate(sugRev, sugAcc),
      rewriteReplacement: rate(rwRep, previewOutcomes || rewriteOk),
      rewriteCancellation: rate(rwCancel, previewOutcomes || rewriteOk),
      rewriteUndoRate: rate(rwUndo, rwRep),
    },
    performance: {
      p50RewriteMs: Math.round(percentile(rewriteLatency, 50)),
      p95RewriteMs: Math.round(percentile(rewriteLatency, 95)),
      p50AnalysisMs: Math.round(percentile(analysisLatency, 50)),
      p95AnalysisMs: Math.round(percentile(analysisLatency, 95)),
    },
    counts,
  };
}

export function installBetaAnalyticsBridge(): void {
  if (typeof window === "undefined") return;
  (window as Window & { __SMARTWRITE_BETA__?: unknown }).__SMARTWRITE_BETA__ = {
    report: getBetaReportRollup,
    events: () => loadEvents().slice(-50),
  };
}
