# Devpost submission text

**Bonded: care that clicks.**

Home care agencies lose most of their caregivers every year, and clients cancel when strangers keep showing up. Agencies match caregivers to elderly clients by zip code and availability, never by whether two people will get along.

Bonded is an agent that matches caregivers and clients by shared taste, using Qloo's taste graph. Each person names a few favourites. Qloo expands them into a cross-domain taste profile, and Bonded computes compatibility and the "bridges" between two people, even across a 60-year age gap.

**What the agent does:**

- **Auto-matching:** recommends assignments that respect every care constraint, then ranks by compatibility (Hungarian assignment, transparent weights).
- **Call-outs:** finds the best qualified substitute, drafts the shift offer, and briefs the caregiver. You watch every tool call live, and nothing is sent without the scheduler's approval.
- **Bridge Kits:** gives each caregiver conversation openers, a shared playlist and an activity, all grounded in Qloo data and checked in code against the pair's bridge list.
- **Early warning:** flags relationships going sour before the client cancels, and suggests a re-match or a fresh Bridge Kit.
- **Fairness audit:** checks that matching on taste, never on protected traits, keeps shift offers balanced, and raises an alert when it doesn't.

**Why Qloo:** on our 20-pair gold set, Bonded separated compatible from incompatible pairs [X]% of the time, against [Y]% for an LLM-only baseline (see /evaluation; fill in from docs/evaluation.md after `npm run eval`). Every song, show and place Bonded mentions carries its Qloo entity ID.

**Built with:** Next.js, TypeScript, Qloo Insights and Search APIs, and Claude (tool use). The demo runs on a fully synthetic agency.
