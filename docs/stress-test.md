# Stress test report

Run against a production build (`next build && next start`) backed by the live Qloo hackathon API. Every flaw listed was fixed and re-tested.

## API fuzzing (36 malformed or hostile requests)

| Finding | Fix |
|---|---|
| `type=__proto__` passed validation, because `"__proto__" in ENTITY_TYPES` is true, and reached Qloo | Own-property check (`isEntityKind`) everywhere a type is accepted |
| `scheduleIds: "s02"` → 500 (`t.map is not a function`) | Validated id lists: de-duplicated, capped at 20, 400 on bad input |
| `favourites: "Selena"` → 500 | Shape validation, 400 on bad input |
| 500 duplicate schedule ids accepted | De-duplicated and capped |
| Non-string ids coerced into lookups | Strict id format check (`[a-z0-9-]{1,40}`) |

Result: **0 × 5xx** across the suite. Unknown ids return 404, bad input 400, missing approval 403.

## Load (single instance, warm cache)

| Endpoint | Concurrency | p50 | p95 | Errors |
|---|---|---|---|---|
| `GET /` (SSR) | 60 | 1.1 s | 1.1 s | 0 |
| `POST /api/match/auto` | 40 | 0.6 s | 1.1 s | 0 |
| `POST /api/compat/pair` (100 random pairs) | 100 | 0.6 s | 1.2 s | 0 |
| `POST /api/bridgekit` | 40 | 0.16 s | 0.27 s | 0 |
| `POST /api/agent/callout` (SSE) | 30 | 0.26 s | 0.48 s | 0 |
| `POST /api/tryit` (one IP) | 25 | 0.46 s | 0.54 s | 10 × 429 by design |
| `GET /api/qloo/search` (same query) | 80 | 0.7 s | 0.7 s | 0 |

Before request coalescing, 80 identical concurrent searches made 80 Qloo calls (p95 9.9 s), and Try-it p95 was 8.8 s. Identical in-flight Qloo requests now share one promise.

## Resilience

| Scenario | Result |
|---|---|
| Qloo unreachable, bundled cache present | All judge-path endpoints 200; the call-out agent completes |
| Qloo unreachable, no cache | Clean 502 "taste data unavailable" (was a raw 500 `fetch failed`) |
| Qloo rate limit (429) under burst | Was fatal to the warm-up. Now: concurrency capped at 6, retries honour `Retry-After` with exponential backoff and jitter (5 attempts), and the warm-up tolerates partial failures. Cold warm-up of all 100 profiles plus the gold set: **2 min, 0 failures** |
| Cold start, no cache | Auto-match 23 s, fairness 50 s. Avoided by the deploy-time warm-up. The fairness audit is now memoised per day, and the UI explains a slow first run |
| Viewer closes the tab mid call-out (×10) | Server stays healthy; the stream stops writing |
| Gemini error, quota or bad key | The agent falls back to deterministic mode mid-run (unit-tested) |

## Security

- Client bundles contain no key values. The only matches are UI strings that name the variables.
- Per-IP rate limits on endpoints that spend Qloo or Gemini quota: search 90/min, Try-it and intake 15/min, call-out 20/min, LLM compare 12/min.
- Contacting anyone needs `approved_by_human === true`; the agent's tool schema cannot set it.

## Accessibility (axe-core, WCAG 2 AA, light and dark)

Initial run: colour contrast failures (coral text 2.6:1, status colours, muted text 4.2:1, dark glass) and `aria-label` on role-less icons. After the fixes, **9 pages × 2 themes: 0 serious or critical violations**.

## UI regressions found by browser automation

- In current Chrome, `scrollIntoView` returns a Promise, so an effect returned it (React warning) and scrolled the whole page. Now only the trace panel scrolls.
- Entrance animations with `fill-mode: both` overrode `translate` centring and disabled hover lifts. They now use `backwards`.
- Many nested `backdrop-filter` layers were dropped by the compositor. Chat bubbles now use solid surfaces.
- The body background hid the ambient layer behind the glass. Only `<html>` paints the page colour now.
- No horizontal overflow on any page at 390 px, light or dark.
