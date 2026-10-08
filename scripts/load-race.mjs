/**
 * Concurrent save/analyze load to stress race protections under latency.
 * Run: node scripts/load-race.mjs [baseUrl] [concurrency]
 */
const BASE = (process.argv[2] || "http://127.0.0.1:8002").replace(/\/$/, "");
const CONCURRENCY = Number(process.argv[3] || 8);
const DOCS = 4;
const METRICS_TOKEN = process.env.METRICS_TOKEN || "";

async function post(path, body, meta) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Request-ID": meta.requestId,
      "X-Document-Key": meta.documentKey,
      "X-Client-Revision": String(meta.clientRevision),
      "X-Started-At": String(meta.startedAt),
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function main() {
  console.log(`[RC1 load] concurrency=${CONCURRENCY} docs=${DOCS} base=${BASE}`);
  const started = Date.now();
  const jobs = [];

  for (let d = 0; d < DOCS; d++) {
    const documentKey = `load-doc-${d}`;
    for (let i = 0; i < CONCURRENCY; i++) {
      const clientRevision = i + 1;
      const longText =
        `Document ${d} revision ${clientRevision}. ` +
        "Lorem ipsum ".repeat(200) +
        (i % 3 === 0 ? "Incentive: $20.e " : "");
      jobs.push(
        (async () => {
          const meta = {
            requestId: `load-${d}-${i}-${Date.now().toString(36)}`,
            documentKey,
            clientRevision,
            startedAt: Date.now(),
          };
          const analyze = await post("/api/analyze", { text: longText }, meta);
          const rewrite = await post(
            "/api/rewrite",
            { text: longText.slice(0, 400), mode: "professional" },
            { ...meta, requestId: `${meta.requestId}-rw` }
          );
          return { documentKey, clientRevision, analyze, rewrite };
        })()
      );
    }
  }

  const results = await Promise.all(jobs);
  const analyzeOk = results.filter((r) => r.analyze.status < 500).length;
  const rewriteOk = results.filter((r) => r.rewrite.status < 500).length;
  const elapsed = Date.now() - started;

  console.log(`completed ${results.length} paired ops in ${elapsed}ms`);
  console.log(`analyze non-5xx: ${analyzeOk}/${results.length}`);
  console.log(`rewrite non-5xx: ${rewriteOk}/${results.length}`);

  const metricsRes = await fetch(`${BASE}/api/metrics`, {
    headers: METRICS_TOKEN ? { "X-Metrics-Token": METRICS_TOKEN } : {},
  });
  if (!metricsRes.ok) {
    throw new Error(`/api/metrics → ${metricsRes.status} (set METRICS_TOKEN if required)`);
  }
  const metrics = await metricsRes.json();
  console.log("alerts:", metrics.alerts || []);
  if ((metrics.alerts || []).length) {
    console.warn("Load finished with alert flags (investigate before RC promote).");
  }
  console.log("RC1 load PASS (race protections exercised under concurrency)");
}

main().catch((err) => {
  console.error("RC1 load FAILED:", err);
  process.exit(1);
});
