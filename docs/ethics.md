# Legal & ethics

Bonded is built for regulated care work. **Every agency rollout includes a review by the agency's employment and health-privacy counsel.**

## 1. Employment discrimination

Assigning caregivers by race or national origin to satisfy client preference is a known legal danger in home care (US Title VII; check equivalents elsewhere). Bonded:

- never asks for, stores in matching data, or infers race, ethnicity, religion or national origin. A test fails the build if intake types gain such fields;
- matches on **taste**: favourites the person chooses, resolved to Qloo entities;
- uses the client's personal-care gender preference only as a hard constraint for intimate care, a recognised privacy exception. Confirm the scope with counsel.

## 2. Taste can proxy for culture

That is why:

- the score only **ranks** caregivers who already pass every hard constraint. It never excludes anyone;
- a rotating offer slot goes to the eligible caregiver with the lowest offer rate so far;
- a **fairness audit** compares offer rates across optional, self-reported groups. These are stored in `src/lib/audit/demographics.ts`, and a test forbids matching, scoring, Qloo and agent code from importing them. The audit runs a caregiver-level permutation test (offers cluster by caregiver, so a naive chi-square overstates significance) and the four-fifths rule. It raises **WATCH** or **ALERT** when one fails, and a human then reviews weights and rotation.

The audit reports PASS, WATCH (the four-fifths ratio is below 0.8 but not statistically significant, which is common with small groups) or ALERT. It is designed to catch disparity from any source. On the Sunrise Home Care reference agency, part of the disparity comes from geography: caregivers who are the only eligible option in sparse areas get most of their offers. The point is that the agency sees the problem and acts on it.

## 3. Health data

Real deployments touch protected health information (HIPAA in the US). Taste data is stored apart from care records. Care notes appear only in the caregiver's Bridge Kit and are never sent to Qloo. A business associate agreement is required with each agency, and with any model provider that processes care notes. The Sunrise Home Care reference agency contains generated profiles only, so no real health data is involved.

## 4. Consent

Caregivers and clients opt in to taste matching (`consentTaste`) and can view or delete their favourites and profile.

## 5. Elder dignity

The client or their family chooses the favourites; the agent never decides what a person likes. Every suggestion in a Bridge Kit is an invitation, not a script.

## 6. Human in the loop

Bonded proposes; schedulers decide. Code, not just the prompt, blocks the agent from contacting anyone: `send_offer` and `notify_family` require `approved_by_human=true`, which only the UI sets. Every health flag needs a human review, and Bonded never reassigns on its own.
