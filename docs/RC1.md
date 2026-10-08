# SmartWrite RC1 — Data Integrity & AI Safety Hardened

## Release criteria

Do not promote beyond RC1 until all are true:

- **0 known data-loss bugs**
- **0 known stale-write bugs**
- **0 cross-document mutation paths**
- **Graceful AI degradation** (editor, autosave, local checks work when rewrite/analysis are down)
- **Recovery-only snapshots** (never canonical; pruned after confirmed newer revision)
- **Green end-to-end race tests** (`npm test` race gates + `node scripts/smoke-rc1.mjs`)

## Observability

| Signal | Frontend | Backend |
|--------|----------|---------|
| Autosave failure rate | `getTelemetryDashboard().autosave` | `/api/metrics` document routes |
| Rewrite success rate | `rewrite.successRate` | `rewrite_success` / `rewrite_failure` |
| Analysis latency | `analysis.avgLatencyMs` / `p95LatencyMs` | route `avg_latency_ms` |
| Offline fallback | `offlineFallback` | health `services.rewrite` |
| Stale-response drops | `staleResponseDrops` | — |
| Recovery restores | `recoveryRestores` (should stay rare) | — |
| Error spikes | dashboard `alerts` | metrics `alerts` (`error_spike:*`) |

Browser console (beta):

```js
window.__SMARTWRITE_TELEMETRY__.dashboard()
```

Correlation headers on API calls:

- `X-Request-ID`
- `X-Document-Key`
- `X-Client-Revision`
- `X-Started-At`

## Post-deploy smoke

```bash
node scripts/smoke-rc1.mjs http://127.0.0.1:8002
```

Manual path (also required):

New document → type → save → refresh → analyze → accept → undo → rewrite → replace → refresh → rename → favorite → trash → restore → open  

Then disable AI backend and confirm documents/editor/autosave/local checks still work.

## Browser matrix

| Browser | Desktop | ~390px |
|---------|---------|--------|
| Chrome  | required | required |
| Edge    | required | spot |
| Firefox | required | spot |
| Safari  | required (macOS/iOS) | required |

CI runs functional gates; real-browser matrix is a release checklist item for beta hardware.

## Load / race stress

```bash
node scripts/load-race.mjs http://127.0.0.1:8002 8
```

## Backup / rollback

1. Before deploy: back up SQLite / document store and note app version (`1.0.0-rc.1`).
2. Deploy RC build.
3. Run smoke.
4. On failure: redeploy previous artifact; **do not wipe localStorage drafts** — client drafts + recovery snapshots are independent of server rollback.
5. Verify: open app → documents list → open recent → content intact.

## Controlled beta (execution)

**Feature and visual freezes apply.** Handoff from engineering to evidence is complete.

See [BETA.md](./BETA.md) for cohort rules, healthy-target decision framework, rollup via `window.__SMARTWRITE_BETA__.report()`, and RC2 triage buckets (BLOCKERS / QUALITY FIXES / POST-RC2).

Path: **RC1 → controlled beta → analyze → fix validated problems only → RC2**.
