# Verification

Every result below was measured on a production build (`next build && next start`) backed by the live Qloo API.

## Hostile input: 36 malformed requests, 0 server errors

Every endpoint validates its input before it reaches Qloo or Gemini:

- entity types use an own-property check, so values like `__proto__` are rejected;
- id lists are de-duplicated, capped at 20 and format-checked (`[a-z0-9-]{1,40}`);
- request bodies are shape-validated.

Unknown ids return 404, bad input 400, and a missing human approval 403.

## Load (single instance, warm cache)

| Endpoint | Concurrency | p50 | p95 | Errors |
|---|---|---|---|---|
| `GET /` (SSR) | 60 | 1.1 s | 1.1 s | 0 |
| `POST /api/match/auto` | 40 | 0.6 s | 1.1 s | 0 |
| `POST /api/compat/pair` (100 random pairs) | 100 | 0.6 s | 1.2 s | 0 |
| `POST /api/bridgekit` | 40 | 0.16 s | 0.27 s | 0 |
| `POST /api/agent/callout` (SSE) | 30 | 0.26 s | 0.48 s | 0 |
| `POST /api/tryit` (one IP) | 25 | 0.46 s | 0.54 s | per-IP rate limit (429) |
| `GET /api/qloo/search` (same query) | 80 | 0.7 s | 0.7 s | 0 |

Identical in-flight Qloo requests share one promise, so 80 concurrent identical searches make one Qloo call.

## Resilience

| Scenario | Result |
|---|---|
| Qloo unreachable, bundled cache present | Every guided-tour endpoint returns 200; the call-out agent completes |
| Qloo unreachable, no cache | Clean 502 "taste data unavailable" |
| Qloo rate limit (429) under burst | Concurrency capped at 6; retries honour `Retry-After` with exponential backoff and jitter. Cold build of all 100 profiles plus the gold set: **2 min, 0 failures** |
| Viewer closes the tab mid call-out (×10) | Server stays healthy; the stream stops writing |
| Gemini error or quota | The agent hands over to the deterministic runner mid-run (unit-tested) |

## Security

- Client bundles contain no key values.
- Per-IP rate limits on every endpoint that spends Qloo or Gemini quota: search 90/min, Try-it and intake 15/min, call-out 20/min, AI comparison 12/min.
- Contacting anyone needs `approved_by_human === true`; the agent's tool schema cannot set it.

## Accessibility (axe-core, WCAG 2 AA)

**9 pages × light and dark: 0 serious or critical violations.** Every guided-tour page fits a laptop screen down to 1277 × 583 with no page scroll, and no page overflows horizontally at 390 px.
