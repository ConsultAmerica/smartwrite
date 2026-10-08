import type { AsyncOpMeta } from "./asyncOp";

export type MetricName =
  | "rewrite_success"
  | "rewrite_failure"
  | "rewrite_fallback"
  | "analysis_latency_ms"
  | "analysis_stale_drop"
  | "autosave_failure"
  | "autosave_success"
  | "stale_response_drop"
  | "stale_rewrite_blocked"
  | "recovery_restore"
  | "offline_fallback"
  | "fallback_active";

export interface MetricEvent {
  name: MetricName;
  value?: number;
  code?: string;
  requestId?: string;
  documentKey?: string;
  clientRevision?: number;
  startedAt?: number;
  at: number;
}

export interface TelemetryDashboard {
  build: string;
  windowMs: number;
  sampleSize: number;
  autosave: { success: number; failure: number; failureRate: number };
  rewrite: { success: number; failure: number; fallback: number; successRate: number };
  analysis: {
    samples: number;
    avgLatencyMs: number;
    p95LatencyMs: number;
    staleDrops: number;
  };
  offlineFallback: number;
  staleResponseDrops: number;
  staleRewriteBlocked: number;
  recoveryRestores: number;
  alerts: string[];
}

const BUFFER_KEY = "smartwrite-metrics";
const MAX_EVENTS = 500;
const BUILD_LABEL = "SmartWrite RC1 — Data Integrity & AI Safety Hardened";

function load(): MetricEvent[] {
  try {
    const raw = localStorage.getItem(BUFFER_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as MetricEvent[]) : [];
  } catch {
    return [];
  }
}

function save(events: MetricEvent[]): void {
  try {
    localStorage.setItem(BUFFER_KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
  } catch {
    /* ignore quota */
  }
}

export function trackMetric(
  name: MetricName,
  details?: {
    value?: number;
    code?: string;
    requestId?: string;
    meta?: AsyncOpMeta;
  }
): void {
  const event: MetricEvent = {
    name,
    value: details?.value,
    code: details?.code,
    requestId: details?.requestId ?? details?.meta?.requestId,
    documentKey: details?.meta?.documentKey,
    clientRevision: details?.meta?.clientRevision,
    startedAt: details?.meta?.startedAt,
    at: Date.now(),
  };
  const next = [...load(), event];
  save(next);
  if (import.meta.env.DEV) {
    console.info("[SmartWrite metric]", {
      name: event.name,
      requestId: event.requestId,
      documentKey: event.documentKey,
      clientRevision: event.clientRevision,
      value: event.value,
      code: event.code,
    });
  }
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

/** Dashboard-ready rollup for beta / RC observability. */
export function getTelemetryDashboard(windowMs = 24 * 60 * 60 * 1000): TelemetryDashboard {
  const since = Date.now() - windowMs;
  const events = load().filter((e) => e.at >= since);
  const count = (name: MetricName) => events.filter((e) => e.name === name).length;

  const autosaveSuccess = count("autosave_success");
  const autosaveFailure = count("autosave_failure");
  const autosaveTotal = autosaveSuccess + autosaveFailure;

  const rewriteSuccess = count("rewrite_success");
  const rewriteFailure = count("rewrite_failure");
  const rewriteFallback = count("rewrite_fallback");
  const rewriteTotal = rewriteSuccess + rewriteFailure;

  const latencies = events
    .filter((e) => e.name === "analysis_latency_ms" && typeof e.value === "number")
    .map((e) => e.value as number)
    .sort((a, b) => a - b);

  const alerts: string[] = [];
  const autosaveFailureRate = autosaveTotal ? autosaveFailure / autosaveTotal : 0;
  const rewriteSuccessRate = rewriteTotal ? rewriteSuccess / rewriteTotal : 1;
  if (autosaveTotal >= 5 && autosaveFailureRate >= 0.15) {
    alerts.push("autosave_failure_rate_high");
  }
  if (rewriteTotal >= 5 && rewriteSuccessRate <= 0.7) {
    alerts.push("rewrite_success_rate_low");
  }
  if (latencies.length >= 5 && percentile(latencies, 95) >= 8000) {
    alerts.push("analysis_latency_p95_high");
  }
  if (count("recovery_restore") >= 10) {
    alerts.push("recovery_restores_elevated");
  }

  return {
    build: BUILD_LABEL,
    windowMs,
    sampleSize: events.length,
    autosave: {
      success: autosaveSuccess,
      failure: autosaveFailure,
      failureRate: Number(autosaveFailureRate.toFixed(3)),
    },
    rewrite: {
      success: rewriteSuccess,
      failure: rewriteFailure,
      fallback: rewriteFallback,
      successRate: Number(rewriteSuccessRate.toFixed(3)),
    },
    analysis: {
      samples: latencies.length,
      avgLatencyMs: latencies.length
        ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
        : 0,
      p95LatencyMs: Math.round(percentile(latencies, 95)),
      staleDrops: count("analysis_stale_drop"),
    },
    offlineFallback: count("offline_fallback") + count("fallback_active") + rewriteFallback,
    staleResponseDrops: count("stale_response_drop") + count("analysis_stale_drop"),
    staleRewriteBlocked: count("stale_rewrite_blocked"),
    recoveryRestores: count("recovery_restore"),
    alerts,
  };
}

export function metricSummary(): Record<string, number> {
  const events = load();
  const counts: Record<string, number> = {};
  for (const e of events) {
    counts[e.name] = (counts[e.name] ?? 0) + 1;
  }
  return counts;
}

export function getBuildLabel(): string {
  return BUILD_LABEL;
}

/** Expose dashboard on window for beta debugging / support. */
export function installTelemetryBridge(): void {
  if (typeof window === "undefined") return;
  (window as Window & { __SMARTWRITE_TELEMETRY__?: unknown }).__SMARTWRITE_TELEMETRY__ = {
    build: BUILD_LABEL,
    summary: metricSummary,
    dashboard: getTelemetryDashboard,
  };
}
