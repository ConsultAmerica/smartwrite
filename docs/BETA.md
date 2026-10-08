# SmartWrite RC1 Controlled Beta Execution

**Status: engineering → evidence handoff.** Feature development is frozen here unless something blocks use. Visual design is also frozen during beta unless users repeatedly report the same usability problem.

The product needs behavioral evidence, not another feature or styling pass.

## Questions this beta must answer

- Are suggestions useful?
- Are rewrites worth accepting?
- Where do users hesitate?
- Does the app stay reliable under real usage?
- Which workflows should RC2 improve?

## Release path

```
RC1 → controlled beta → analyze telemetry + feedback
    → fix only validated problems → RC2 → broader beta / production
```

RC1 is an **experiment with a stable product**, not another development sprint. The beta’s job is to tell you what RC2 actually needs.

Do **not** expand scope mid-beta. No Reader Reaction, collaboration, more AI modes, browser extensions, or new template categories during this window.

## Operating cadence

Keep the cadence light so the beta produces a clean RC2 decision — not a pile of telemetry.

| When | Focus |
|------|--------|
| **Day 0 — Launch** | Verify `METRICS_TOKEN`; run `node scripts/smoke-rc1.mjs`; confirm analytics events arrive **without content leakage**; verify `/api/metrics` authentication; snapshot baseline latency and error rates. |
| **Days 1–3 — Reliability watch** | Investigate immediately: data-loss signals, recovery clusters, autosave failure spikes, crashes, authorization issues, consistently failing AI routes. **Do not make UX changes yet.** |
| **Midpoint — Quality review** | Inspect rewrite undo/reversal rates, suggestion reverts, 👎 reasons, template abandonment, latency, repeated hesitation patterns. **Record findings; do not react to isolated events.** |
| **Final 2–3 days — Confirmation** | Check whether midpoint problems persist across users and use cases. Separate repeated behavior from one-off feedback. |
| **Beta close** | Freeze incoming telemetry; generate `window.__SMARTWRITE_BETA__.report()`; pull operational metrics; write the **RC1 Beta Report** (four questions + one decision below). |

## Stop-the-beta conditions

**Pause expansion immediately** if any of these appear:

- Document loss or corruption  
- Cross-document writes  
- Unauthorized document access  
- Recovery resurrecting stale content  
- Secrets or writing content leaking into telemetry / logs  
- Crash or failure pattern that prevents normal editing  

Resume only after the integrity/security issue is understood and contained.

## Cohort

| Constraint | Value |
|------------|--------|
| Size | **10–25 users** |
| Duration | **7–14 days** |
| Goal | Instrument struggle points — not “do you like it?” surveys |

Use-case mix:

- Professional email  
- Academic writing  
- Business proposal  
- Resume / cover letter  
- General editing  

## Decision framework

Do not optimize a metric in isolation. High suggestion acceptance is bad if `suggestion_reverted` is also high. High rewrite replacement can hide poor quality if `rewrite_undone` spikes.

| Signal | Healthy target | RC2 action if weak |
|--------|----------------|--------------------|
| Autosave success | >99.9% | Reliability first |
| Rewrite success | >98% | Backend / provider tuning |
| Analysis success | >99% | Analysis reliability |
| Rewrite replacement rate | >45–50% | Improve rewrite quality |
| Rewrite undo rate | <10–12% | Tone / meaning preservation |
| Suggestion acceptance | >50% | Improve suggestion quality |
| Suggestion reverted | <10% | Reduce false / poor suggestions |
| Feedback 👎 rate | <15–20% | Inspect reason distribution |
| Recovery restores | Very rare | Investigate any cluster |
| Stale drops | Allowed | Watch for excessive UX friction |
| p95 analysis latency | Ideally <1.5–2s | Performance tuning |
| p95 rewrite latency | Ideally <5–6s | Provider / performance tuning |

### Qualitative evidence bar

Require **repeated user evidence or telemetry support** before changing the product.

| Signal strength | Treatment |
|-----------------|-----------|
| Single user: “this rewrite feels weird” | Useful context — not enough to change the product |
| Multiple users select *Changed my meaning* **and** `rewrite_undone` is elevated | **RC2 quality finding** |

### Final RC1 decision

| Decision | Criteria |
|----------|----------|
| **PROMOTE TO RC2** | No blockers; reliability targets met; quality issues understood and bounded |
| **RC2 WITH FIXES** | No integrity/security blocker; one or more validated quality/performance issues require correction |
| **HOLD RC1** | Data-loss / integrity / security issue; core workflow failure; unexplained recovery activity; or major reliability regression |

Until beta close: **do not change the product** unless a stop-the-beta / blocker condition appears. The next meaningful artifact is the RC1 Beta Report — not more code.

## RC1 Beta Report (post-observation)

Generated from telemetry + feedback after the window. Answer **only** these four questions, then one decision:

1. **Did RC1 remain reliable?**  
2. **Were suggestions and rewrites actually useful?**  
3. **Where did users hesitate or reverse AI actions?**  
4. **What, specifically, earns a place in RC2?** (classify each item: Blocker / Quality Fix / Post-RC2)

**Decision:** `PROMOTE TO RC2` | `RC2 WITH FIXES` | `HOLD RC1`

That keeps the project disciplined and prevents scope creep while the product is stable.

## Highest-signal quality metrics

**Post-AI reversal** often beats raw acceptance:

1. Rewrite replaced → Undo within **30 seconds** → `rewrite_undone`
2. Suggestion accepted → same text manually changed soon after → `suggestion_reverted`

These mean the AI action technically worked but was not useful.

## End-of-beta rollup

Generate from the browser (plus ops `/api/metrics` as needed):

```js
window.__SMARTWRITE_BETA__.report()
window.__SMARTWRITE_BETA__.events()
```

### Report scaffold

```
RELIABILITY
Rewrite success:       __.%
Analysis success:      __.%
Autosave success:      __.%
Recovery restores:     __
Stale operations:      __ safely dropped

QUALITY
Suggestion acceptance: __%
Suggestion dismissal:  __%
Suggestion reverted:   __%
Rewrite replacement:   __%
Rewrite cancellation:  __%
Rewrite undo rate:     __%
Feedback 👎 rate:      __%

PERFORMANCE
p50 rewrite:           __s
p95 rewrite:           __s
p50 analysis:          __ms
p95 analysis:          __s

UX FINDINGS
1. …
2. …
3. …
4. …
```

### Triage into three buckets

**RC2 BLOCKERS**  
Data loss, broken saves, crashes, inaccessible flows, security boundaries, or consistently failing AI actions.

**RC2 QUALITY FIXES**  
Rewrite tone problems, poor suggestions, excessive reversals, slow analysis, confusing interactions — only when telemetry or repeated feedback validates them.

**POST-RC2**  
New features, additional templates, deeper analytics, Reader Reaction, collaboration, extensions, etc.

## Privacy boundary

Product analytics are privacy-conscious by default:

- Events store **metadata only** (`requestId`, `documentKeyHash`, `clientRevision`, `templateType`, `suggestionType`, `rewriteMode`, `latencyMs`, `errorCode`, `wordCountBucket`).
- **Never** send document text, selected text, rewrite contents, or document titles into analytics by default.
- Client events live in `localStorage` (`smartwrite-beta-events`).

### `/api/metrics` authorization

Operational metrics must **not** be public when serving the web app.

| Mode | Behavior |
|------|----------|
| Local loopback, empty `METRICS_TOKEN`, `SERVE_WEB=0` | Open for developer convenience |
| `METRICS_TOKEN` set | Require `X-Metrics-Token` or `Authorization: Bearer …` |
| `SERVE_WEB=1` and empty token | **Denied** (401) |

```env
METRICS_TOKEN=change-me-before-beta
```

```bash
set METRICS_TOKEN=change-me-before-beta
node scripts/smoke-rc1.mjs http://127.0.0.1:8002
```

## Events (already instrumented)

| Funnel | Events |
|--------|--------|
| Documents | `document_created`, `document_opened`, `document_saved` |
| Templates | `template_previewed`, `template_used` |
| Suggestions | `suggestion_shown` → `opened` → `accepted` / `dismissed` → `suggestion_reverted` |
| Rewrite | `rewrite_requested` → `succeeded` / `failed` → `replaced` / `inserted` / `cancelled` → `rewrite_undone` |
| Analysis | `analysis_completed`, `analysis_failed` |
| Offline | `offline_fallback_started`, `offline_fallback_ended` |
| Integrity | `recovery_restored`, `stale_save_dropped`, `stale_analysis_dropped`, `stale_rewrite_blocked` |
| Feedback | `feedback_helpful`, `feedback_unhelpful` (+ optional reason) |

## Embedded feedback (tiny, optional)

> Was this helpful? 👍 👎

If 👎: Too wordy · Changed my meaning · Wrong tone · Not accurate · Other  

~3 minute cooldown so surveys do not interrupt every action.

## Watch closely (5 lenses)

1. **Suggestion quality** — shown → opened → accepted → dismissed → manually changed afterward  
2. **Rewrite quality** — requested → preview → replaced / inserted / canceled → undone shortly afterward  
3. **Editor friction** — time to first document / useful suggestion, autosave failures, recovery restores, offline fallback  
4. **Navigation friction** — template → document created, Documents search/filter, abandoned template preview, repeated clicks  
5. **Reliability** — rewrite/analysis failures, stale drops, API latency, JS errors, unexpected recovery activation  
