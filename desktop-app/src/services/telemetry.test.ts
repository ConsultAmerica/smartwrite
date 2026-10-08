import { beforeEach, describe, expect, it } from "vitest";
import { createAsyncOpMeta } from "./asyncOp";
import { getBuildLabel, getTelemetryDashboard, trackMetric } from "./telemetry";

describe("RC1 telemetry dashboard", () => {
  beforeEach(() => localStorage.clear());

  it("rolls up autosave, rewrite, analysis, recovery, and alerts", () => {
    const meta = createAsyncOpMeta("doc-1", 3);
    trackMetric("autosave_success", { meta });
    trackMetric("autosave_failure", { meta });
    trackMetric("rewrite_success", { meta });
    trackMetric("rewrite_failure", { meta });
    trackMetric("rewrite_fallback", { meta });
    trackMetric("analysis_latency_ms", { meta, value: 120 });
    trackMetric("analysis_latency_ms", { meta, value: 400 });
    trackMetric("stale_response_drop", { meta });
    trackMetric("stale_rewrite_blocked", { meta });
    trackMetric("recovery_restore", { meta });
    trackMetric("offline_fallback", { meta });

    const dash = getTelemetryDashboard();
    expect(dash.build).toContain("RC1");
    expect(getBuildLabel()).toContain("Data Integrity");
    expect(dash.autosave.failure).toBe(1);
    expect(dash.rewrite.success).toBe(1);
    expect(dash.analysis.samples).toBe(2);
    expect(dash.recoveryRestores).toBe(1);
    expect(dash.staleRewriteBlocked).toBe(1);
    expect(dash.offlineFallback).toBeGreaterThan(0);
  });
});
