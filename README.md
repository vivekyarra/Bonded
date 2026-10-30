# Bonded — care that clicks

> Every home care agency advertises that its caregivers are *bonded*. We make it true.

Bonded is an agent for home care agencies. It matches caregivers to elderly clients by **shared taste** (music, TV, film, local places, books) using **Qloo's Taste AI graph**. It also handles last-minute call-outs, briefs every caregiver with a **Bridge Kit** before a first visit, and warns the agency before a match falls apart.

Built for the **Qloo Agentic Hackathon 2026**. MIT licensed. The demo runs on a **fully synthetic agency**: every person is fictional, and no message is ever sent.

---

## The problem

- Caregiver turnover is home care's number-one problem. The Home Care Pulse benchmarking studies put median caregiver turnover at about 64–65% in 2019–2021 ([HHCN, 2021](https://homehealthcarenews.com/2021/05/a-huge-victory-home-care-turnover-remains-stable-at-65-2/); [HCAOA, 2021 study](https://hcaoa.org/newsletters/caregiver-turnover-rate-is-652-2021-home-care-benchmarking-study)). A 2024 summary reports 79.2% ([Home Care Association of Florida](https://homecareassociationoffloridainc.growthzoneapp.com/provider-updates/Details/report-home-care-industry-faces-rising-caregiver-turnover-and-referral-rejections-226408)). *Verify against the primary Activated Insights (formerly Home Care Pulse) report before quoting on stage.*
- Clients cancel when strangers keep showing up. The riskiest moment is the **substitute shift**.
- Agencies match on zip code, availability and skills. Nobody matches on whether two people will get along over months of four-hour visits.

**What we don't claim:** we don't fix low pay, the main reason caregivers leave. We fix what agencies control: who gets matched, how call-outs go, and catching a relationship before it breaks.

## Judge path (under 3 minutes)

| Step | Where | What you see |
|---|---|---|
| 1 | `/` | One sentence, one button: **Run the agency for a day** |
| 2 | `/board` | 6 open schedules → **Auto-match** → assignments animate in with taste score and top 2 bridges |
| 3 | `/match/c01/cg02` | Domain radar, 5 bridges with Qloo evidence (entity, both affinities, Qloo ID), friction notes, *Why this match* weights, **LLM-only vs Bonded** toggle |
| 4 | `/callout` | **Handle call-out**: live tool-call trace (get shift → filter constraints → Qloo compatibility → rank → draft offer → hold for approval) |
| 5 | `/callout` → Approve & send | The caregiver accepts and their **Bridge Kit** slides up on a phone; the family notice needs its own approval |
| 6 | `/try` | Type 3 favourites → your best match among 60 clients + your own mini Bridge Kit |
| 7 | `/fairness` | Offer-rate audit by self-reported group, plus clearly labelled simulated results |

Also: `/health` (early-warning flags) and `/evaluation` (gold set, Bonded vs LLM-only).

## Product design

**Built for judges on a laptop:**

- **Guided demo:** a floating tour bar walks the whole judge path in 8 steps. **Next** opens each screen and starts its action: auto-match runs, and the call-out agent starts. The **← →** keys step through it.
- **⌘K / Ctrl+K command menu** (or **/**): jump to any screen, action or story match.
- **App-window layouts:** panels scroll independently, so primary actions such as *Approve & send* and *Mark reviewed* stay on screen at 1366×768.
- **Match Detail overview:** bridges, the overlap radar and the "why" breakdown side by side.
- **Glass that reacts:** a cursor spotlight on the glass panels (mouse and trackpad only).

The app is built like a product, not a slide:

- **Premium, royal palette:** warm white, deep royal navy and champagne gold, with an editorial serif (Instrument Serif) for titles and Inter for the interface. Dark mode is royal midnight.
- **Easy to read for every age:** a 17px base font, 44px tap targets, plain-language labels ("Find matches", "Cover a call-out", "Skip") and no tiny print. Motion is calm and purposeful: numbers count up, two "favourites" ribbons drift slowly (they pause on hover), and the "How it works" timeline draws itself as you scroll. All of it switches off under `prefers-reduced-motion`.
- **Glass interface:** frosted panels with hairline borders, in light and dark mode.
- **Navigation:** a desktop sidebar, and a bottom tab bar on phones (Telegram/iOS style).
- **Animation:** skeleton loaders and animated score rings.
- **Familiar patterns:** iMessage-style offer bubbles, a chat-style relationship-health view, a phone-frame Bridge Kit that slides up as a sheet, toasts, and Approve all.
- **Little text:** explanations live behind ⓘ tooltips instead of paragraphs.
- **Accessible:** passes axe-core WCAG 2 AA checks in both themes.

See [docs/stress-test.md](docs/stress-test.md) for the fuzzing, load, resilience, security and accessibility results.

## Why Qloo is essential

An LLM can guess that two people "might both like music". Qloo **computes** taste overlap across domains and generations. An 84-year-old who loves Pedro Infante and telenovelas, and a 23-year-old who loves Bad Bunny and cooking shows, have real shared ground. Qloo finds it, and it gives Bonded evidence for every claim.

**Codebase rule:** the LLM is never the source of any entity. Every song, show, place or book shown to a user comes from a Qloo response and carries its Qloo ID. Gemini only orchestrates and phrases. The rule is enforced in code (see *Guardrails*).

Without Qloo, matching falls back to age or ethnicity guesses, which are both wrong and illegal in employment. Taste is the defensible signal.

### How Bonded uses the Qloo API

1. **Resolve seeds.** Each favourite goes through `GET /search?query=…&types=urn:entity:…`, preferring an accent-insensitive exact name match. Places must lie within 80 km of Phoenix (a "Durant's" in Riyadh is not the Phoenix steakhouse). Unresolved names are dropped and shown as unresolved. They are never guessed.
2. **Expand profiles.** One `GET /v2/insights` call per domain: `filter.type` = artist / tv_show / movie / place (with `filter.location.query=Phoenix`) / book, `signal.interests.entities` = all of the person's seeds, `take=50`, `feature.explainability=true` (dropped automatically if the server rejects it).
3. **Score.** Weighted Jaccard per domain, `Σ min(aff_C, aff_G) / Σ max(aff_C, aff_G)`, with domain weights music .30, TV .25, film .15, local places .20, books .10. The weights are renormalised over domains where both people have data, a small seed bonus is added, and the sum is mapped to 0–100 by a monotonic calibration curve (`1 − e^{−8x}`, set so the synthetic agency's median pair lands near 40).
4. **Bridges.** Shared entities ranked by `min(aff_C, aff_G)`, so a bridge must matter to *both* people. Top 5, at most 2 per domain. If a pair has fewer than 3, Bonded asks Qloo with the **union** of both people's seeds and adds results present in at least one profile, labelled *weaker bridge*.
5. **Cache.** Every response is cached by request hash: memory, then a bundled snapshot (`data/qloo-cache.json`), then disk with a 7-day TTL. `npm run warm-cache` precomputes all 100 profiles and therefore all 2,400 pair scores. Qloo's hackathon terms forbid publishing response data in a public repository, so the snapshot is **git-ignored** and built during the Vercel deploy (`npm run vercel-build`). It ships inside the server bundle only.

## The agent

A Google Gemini function-calling loop (`src/lib/agent/loop.ts`, REST `generateContent`, model set by `GEMINI_MODEL`, default `gemini-3.8-flash`, which is on Gemini's free tier). Its tools are `get_shift`, `find_available_caregivers`, `rank_candidates`, `score_pair`, `draft_offer`, `send_offer` and `qloo_search`. The trace streams to the UI over Server-Sent Events. Any Gemini error or quota limit falls back to deterministic mode mid-run.

Without `GEMINI_API_KEY`, the same tools run in a fixed order with templated narration (**deterministic mode**, labelled in the UI). Qloo data and rankings are identical in both modes.

### Guardrails in code, not just the prompt

- **Closed-set Bridge Kit.** Gemini must wrap every entity it mentions in `[[…]]`. Every marked entity must be in the pair's bridge list, and no other known entity name may appear. Bonded regenerates once on failure, then falls back to a plain template (`src/lib/agent/guards.ts`).
- **Human approval.** `send_offer` and `notify_family` throw unless `approved_by_human === true`. Only the UI's approve endpoints set it, and the agent's tool schema has no such field.
- **Protected-trait firewall.** A test fails the build if matching, scoring, Qloo or agent code imports the audit demographics. Another test fails it if intake types contain race, ethnicity, religion or national-origin fields.

## Matching

1. **Hard constraints first:** availability, time conflicts, travel ≤ 45 min, required skills, required languages, pets and smoke, the client's personal-care gender preference (a recognised privacy exception; get legal review), and the weekly hours cap.
2. **Then rank:** `0.6·taste + 0.25·continuity + 0.15·travel`, shown in the *Why this match* panel.
3. **Auto-match** solves a min-cost assignment (Hungarian algorithm) over open schedules, with ineligible pairs forbidden.
4. Bonded proposes; the scheduler approves.

## Fairness and ethics

See [docs/ethics.md](docs/ethics.md). In short:

- Intake never asks about race, ethnicity, religion or national origin.
- Taste only **ranks** eligible caregivers and never excludes one. A rotating third offer slot goes to the eligible caregiver with the lowest offer rate so far.
- Optional self-reported groups live in a separate module and are joined only by the audit. The audit uses a caregiver-level permutation test plus the four-fifths rule. It reports **PASS**, **WATCH** (four-fifths ratio below 0.8 but not statistically significant) or **ALERT** (significant disparity). It is meant to catch problems, not to rubber-stamp them.
- Health data: taste data is kept apart from care records. A real deployment needs a BAA under HIPAA and a lawyer's review before any pilot.

## Evaluation

`npm run eval` runs a 20-pair hand-labelled gold set (`src/lib/eval/goldset.ts`) through Bonded and through an LLM-only baseline (Gemini scoring raw favourites). It writes [docs/evaluation.md](docs/evaluation.md) and the `/evaluation` page. It reports separation (ROC AUC) and accuracy at a score of 50.

On live Qloo data (Bonded side, run during development): **94% separation** and 85% accuracy. Separation does not depend on the calibration curve. Accuracy does, and the gold set was visible while the curve was chosen, so treat accuracy as in-sample. Run `npm run eval` with both keys to fill in the LLM-only column.

## Architecture

```
Next.js 14 (App Router, TypeScript)
├── src/lib/qloo/      Qloo client (server-only key), parsing, 3-tier cache, offline fixture for tests
├── src/lib/compat/    profile.ts · score.ts · bridges.ts           (pure, unit-tested)
├── src/lib/matcher/   constraints.ts · hungarian.ts · rank.ts      (unit-tested)
├── src/lib/agent/     loop.ts · tools.ts · prompts.ts · guards.ts · bridgekit.ts · health.ts
├── src/lib/audit/     fairness.ts · results.ts · stats.ts · demographics.ts (audit-only)
├── src/lib/agency/    Sunrise Home Care synthetic agency (deterministic)
├── src/lib/eval/      gold set + runner
└── src/app/           pages + /api routes
```

More in [docs/architecture.md](docs/architecture.md).

**Design decision: no database for the demo.** The synthetic agency is generated deterministically in code, and Qloo responses ship as a cached snapshot. Judging therefore needs no database, no login and no seed step. The production data model (Postgres) is documented in `docs/architecture.md`.

## Run it

```bash
npm install
cp .env.example .env.local      # add QLOO_API_KEY (and optionally GEMINI_API_KEY)
npm run qloo:smoke              # day-1 check: /search and /v2/insights return real data
npm run warm-cache              # precompute everything, writes data/qloo-cache.json (git-ignored)
npm run eval                    # gold set: Bonded vs LLM-only
npm run dev                     # http://localhost:3000
```

Offline development: `QLOO_MODE=fixture npm run dev` uses a small deterministic test graph. Every page then shows a **FIXTURE** banner, because it is not Qloo data. Tests always run on the fixture.

| Variable | Required | Purpose |
|---|---|---|
| `QLOO_API_KEY` | yes | Qloo hackathon key (server-side only) |
| `QLOO_BASE_URL` | no | defaults to `https://hackathon.api.qloo.com` |
| `GEMINI_API_KEY` | no | free key from [Google AI Studio](https://aistudio.google.com/apikey); enables Gemini orchestration, phrasing, note classification and the LLM baseline |
| `GEMINI_MODEL` | no | defaults to `gemini-3.8-flash` (free tier); `gemini-2.5-flash` also works |
| `QLOO_MODE` | no | `live` (default) or `fixture` |

### Deploy (Vercel)

1. Import the repo in Vercel (framework: Next.js). Vercel runs `npm run vercel-build`, which warms the Qloo cache for at most 45 seconds (set `WARM_CACHE_BUDGET_S` to change it, `0` to skip) and then builds. Anything not warmed in time, or not reachable during the build, is fetched from Qloo live and cached at runtime.
2. Add the `QLOO_API_KEY` and `GEMINI_API_KEY` environment variables, then redeploy so the build can warm the cache.
3. Optional: add the same two values as **GitHub Actions secrets** and run the **Live Qloo check & evaluation** workflow. It verifies the live API and commits only the evaluation scores, never Qloo response data.

CI (`.github/workflows/ci.yml`) runs lint, typecheck, tests and the production build on every push and PR.

## Out of scope

Payroll, billing, EVV, real messaging, native apps, real client data.

---

*Bonded: every caregiver bonded, for real.*
