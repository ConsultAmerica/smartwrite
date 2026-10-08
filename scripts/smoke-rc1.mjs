/**
 * Post-deploy RC1 smoke (API-level):
 * health → analyze → rewrite → document save → reload verify
 * Run: node scripts/smoke-rc1.mjs [baseUrl]
 */
const BASE = (process.argv[2] || "http://127.0.0.1:8002").replace(/\/$/, "");
const METRICS_TOKEN = process.env.METRICS_TOKEN || "";

async function req(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Request-ID": `smoke-${Date.now().toString(36)}`,
      "X-Document-Key": "smoke-doc",
      "X-Client-Revision": "1",
      "X-Started-At": String(Date.now()),
      ...(METRICS_TOKEN && path.includes("metrics")
        ? { "X-Metrics-Token": METRICS_TOKEN }
        : {}),
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* raw */
  }
  if (!res.ok) {
    throw new Error(`${init.method || "GET"} ${path} → ${res.status}: ${text.slice(0, 200)}`);
  }
  return json;
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function main() {
  console.log(`[RC1 smoke] ${BASE}`);

  const health = await req("/health");
  assert(health.service === "smartwrite-api", "health.service");
  assert(health.services?.documents === "ok", "documents service");
  console.log("✓ health", health.status, health.build || health.version);

  const analyze = await req("/api/analyze", {
    method: "POST",
    body: JSON.stringify({ text: "Incentive: $20.e via choice of dozens." }),
  });
  assert(Array.isArray(analyze.suggestions), "analyze.suggestions");
  console.log("✓ analyze", analyze.suggestions.length, "suggestions");

  const rewrite = await req("/api/rewrite", {
    method: "POST",
    body: JSON.stringify({
      text: "hey there, wanna chat?",
      mode: "professional",
    }),
  });
  assert(rewrite.success !== false, "rewrite.success");
  assert(rewrite.result || rewrite.rewritten_text, "rewrite.result");
  console.log("✓ rewrite");

  const oversized = await fetch(`${BASE}/api/rewrite`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "x".repeat(13000), mode: "professional" }),
  });
  const oversizedBody = await oversized.json();
  assert(oversizedBody.success === false, "oversized must fail");
  assert(/too long|smaller section/i.test(oversizedBody.message || ""), "size limit message");
  console.log("✓ rewrite size limit");

  const saved = await req("/documents", {
    method: "POST",
    body: JSON.stringify({
      title: `RC1 Smoke ${new Date().toISOString()}`,
      content: "Incentive: $20 via choice of dozens.",
    }),
  });
  assert(saved.id != null, "document.id");
  const listed = await req("/documents");
  const found = (listed.documents || []).some((d) => d.id === saved.id);
  assert(found, "saved document listed");
  console.log("✓ document save + list", saved.id);

  const metrics = await req("/api/metrics");
  assert(metrics.build, "metrics.build");
  console.log("✓ metrics", metrics.alerts?.length ? `alerts=${metrics.alerts}` : "no alerts");

  console.log("\nRC1 smoke PASSED");
}

main().catch((err) => {
  console.error("\nRC1 smoke FAILED:", err.message || err);
  process.exit(1);
});
