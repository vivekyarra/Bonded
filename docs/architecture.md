# Architecture

## Request flow

```
Browser (Next.js pages, no secrets)
   │  fetch / SSE
   ▼
/api/* route handlers (Node runtime, maxDuration 60 s)
   ├── service/engine.ts    memoised profiles & pair scores
   ├── service/views.ts     page-shaped data (board, pair detail, LLM baseline)
   ├── agent/*              Claude tool loop, Bridge Kit, health review
   ├── audit/*              fairness + simulated results
   └── qloo/client.ts ──► cache (memory → data/qloo-cache.json → disk, 7-day TTL) ──► Qloo API
                                                                                      (X-Api-Key, server-side)
```

## Qloo API contract used

The parameter names follow Qloo's hackathon developer guide. Run `npm run qloo:smoke` to print the live response shape.

| Call | Parameters | Used for |
|---|---|---|
| `GET /search` | `query`, `types=urn:entity:{artist,tv_show,movie,book,place}`, `take` | intake autocomplete and seed resolution |
| `GET /v2/insights` | `filter.type`, `signal.interests.entities` (comma-separated ids), `take=50`, `filter.location.query=Phoenix` for places, `feature.explainability=true` | profile expansion, union-signal fallback, playlist and activity fill |

The parser (`src/lib/qloo/parse.ts`) accepts both `{results:[…]}` and `{results:{entities:[…]}}`, reads affinity from `query.affinity` and explainability from `query.explainability.signal.interests.entities`. If Qloo omits affinity, it falls back to a rank-based score so Qloo's ordering is preserved.

Failure handling: retries with backoff on 429 and 5xx, a 12 s timeout, a concurrency cap of 6, and a retry without explainability on a 400. If *every* call for a profile fails, the error surfaces to the UI rather than producing an empty profile.

## Compatibility algorithm

See the README, *How Bonded uses the Qloo API*. Constants live in `src/lib/compat/score.ts` and `src/lib/compat/types.ts`:

- domain weights `DEFAULT_WEIGHTS`, tunable per agency
- `CALIBRATION_K = 4`: a monotonic mapping, so ranking equals the raw formula
- seed bonus of 0.02 per seed found in the other profile, capped at 0.1

## Matching

`src/lib/matcher/constraints.ts` holds the hard constraints. `rank.ts` holds the composite score, ranking per shift or schedule, and auto-match. `hungarian.ts` is an O(n²m) Kuhn–Munkres implementation, tested against brute force.

## Agent

`loop.ts` runs a manual tool-use loop on `client.beta.messages.create`, with the server-side fallback beta and low effort. If Claude stops early, the run still guarantees its deliverables: a ranked list, three drafts, and one draft pending approval. Any API error falls back to the deterministic runner, which uses the same tools.

Trace event types: `start`, `say`, `tool`, `tool_result`, `notice`, `result`, `error`.

## Synthetic agency

`src/lib/agency/sunrise.ts` builds Sunrise Home Care with a seeded RNG: 40 caregivers, 60 clients and 21 days of shifts (last week, this week, next week). Only the calendar moves, so "tomorrow" is always tomorrow in Phoenix time. Regular caregivers are assigned the way agencies do it today, by nearest eligible caregiver, which is the baseline Bonded improves on.

Demo stories:

| Story | People |
|---|---|
| Surprising cross-generation match (hero) | Dolores Alvarez, 84 ↔ Maria G., 23 |
| Call-out tomorrow | Rosa M. (Dolores's regular) calls out |
| Obvious match | Walter Briggs ↔ Travis B. |
| Demographic trap: two older men in Scottsdale with opposite taste | Harold Jensen ↔ Dale H. |
| Match trending down → re-match | Eleanor Price ↔ Kayla S. (candidate: cg40) |
| Stale conversation → fresh Bridge Kit | Frank Russo ↔ Devon P. |
| Jazz client for the "Try it" moment | Dorothy Hale, 91 |

## Production data model (Postgres; not needed for the demo)

```
Agency(id, name, city)
Caregiver(id, agency_id, first_name, phone, home_lat, home_lng, skills[], languages[], max_hours, pets_ok, smoke_ok, gender_for_personal_care, consent_taste)
Client(id, agency_id, first_name, home_lat, home_lng, required_skills[], languages_needed[], has_pets, smoker, gender_pref_personal_care?, consent_taste)
TasteSeed(id, person_type, person_id, qloo_entity_id, name, entity_type, source)
TasteProfile(id, person_type, person_id, domain, entities_json, built_at)
PairScore(client_id, caregiver_id, taste_score, bridges_json, evidence_json, computed_at)
Shift(id, client_id, start, end, recurring_rule?, status)
Assignment(id, shift_id, caregiver_id, proposed_by, approved_by, created_at)
CallOut(id, shift_id, original_caregiver_id, reason, created_at, resolved_assignment_id)
Offer(id, shift_id, caregiver_id, text, status)
BridgeKit(id, client_id, caregiver_id, openers_json, playlist_json, activity_json, created_at)
VisitFeedback(id, assignment_id, by, rating, note, created_at)
HealthFlag(id, match_key, trend, labels[], suggested_action, reviewed_by)
AuditDemographic(caregiver_id, group_self_reported)   -- separate schema/role, never joined by matching
QlooCache(hash, endpoint, params_json, response_json, fetched_at)
AgentRun(id, kind, input_json, trace_json, result_json, created_at)
```

The TypeScript types in `src/lib/agency/types.ts` mirror this model.
