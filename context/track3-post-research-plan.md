# Track 3 Post-Research Plan

Status: **product direction accepted; implementation has not started**.

Selected direction: **StormClause**, a weather-triggered cancellation clause
for outdoor event and photographer deposits.

## Decision gates before coding

1. **Passed:** participant accepted the outdoor-event/photographer problem.
2. Paid probes succeed for `WEATHER_FORECAST`, `STORM_ALERT`, and
   `WEATHER_CHECK` using the same location and time window.
3. We can normalize the returned fields into an honest deterministic rule
   without inventing missing data.
4. Track 3 submission requirements and usage-count semantics are confirmed in
   the portal or Discord.
5. The team decides whether the first submission needs testnet escrow or only a
   signed/shareable clause plus settlement recommendation.

If gates 2 or 3 fail, fall back to the agent-payment firewall and probe
`URL_SCAN`, `SSL_VERIFICATION`, `FRAUD_DETECTION`, and
`ONCHAIN_TX_LOOKUP` instead.

## Seven-day build sequence

### Day 0: prove the intelligence

- Fund only a dedicated testnet payer with the minimum needed USDC.
- Run paid queries against the three weather Intents.
- Save request, selected Miner, latency, cost, response, signal hash, and error
  behavior.
- Define the exact normalization contract and unknown-data policy.

Checkpoint: no product code until at least two realistic cities and one edge
case produce understandable results.

### Day 1: freeze the product slice

- One user type: outdoor service buyer/provider.
- One contract type: booking deposit with a weather cancellation clause.
- Define `DRAFT`, `AWAITING_ACCEPTANCE`, `ACTIVE`, `NEEDS_REVIEW`, `PROCEED`,
  `RESCHEDULE`, and `REFUND` states.
- Write acceptance scenarios and a five-screen surface map.

Checkpoint: a non-technical person can explain the rule from the clause preview.

### Day 2: Telegraph integration

- Build the server-side x402/Telegraph client.
- Add schema validation, timeout, retry, cost cap, and receipt storage.
- Implement the normalized weather evidence object.
- Expose a health/readiness endpoint.

Checkpoint: automated tests cover success, under-confidence, unavailable Miner,
malformed output, and conflicting signals.

### Day 3: clause workflow

- Create a clause, calculate the live risk preview, and produce a share link.
- Let the second party accept the immutable terms.
- Store all times in UTC while displaying the user's local timezone.
- Implement deterministic decision evaluation and an explicit review state.

Checkpoint: two browsers can complete create -> share -> accept -> evaluate.

### Day 4: action layer

- Minimum: produce a signed/auditable settlement recommendation.
- Stretch only if safe and tested: deploy a narrowly scoped Base Sepolia USDC
  escrow with fund, release, refund, expiry, and emergency recovery paths.
- Never move mainnet funds during the hackathon build.

Checkpoint: contract unit tests cover authorization, double settlement,
expiry, missing evidence, and reentrancy assumptions.

### Day 5: adoption surfaces

- Add shareable result cards and a simple public explainer.
- Add opt-in reminders or monitoring for accepted clauses.
- Add privacy-safe analytics for unique users, accepted clauses, and genuine
  Telegraph calls.
- Recruit a small tester group and record qualitative feedback.

Checkpoint: every counted automated call belongs to an active user-created
clause; no synthetic traffic loop.

### Day 6: reliability and public proof

- Test mobile layout, failure states, slow Miners, repeated clicks, and timezone
  boundaries.
- Publish an honest X progress update with real receipts and known limitations.
- Record a short end-to-end demo with a real Telegraph route.

Checkpoint: deployment, tests, and the exact demo path pass from a clean setup.

### Day 7: submission

- Freeze scope and fix only submission-blocking defects.
- Verify the live app, source, README, screenshots, metrics, and transaction
  links.
- Map every claim to evidence and every judging criterion to a concrete artifact.
- Submit early enough to recover from portal or wallet problems.

## Proposed first release boundaries

Required:

- real Telegraph Miner calls;
- all three weather phases where live data supports them;
- a deterministic, explainable decision;
- two-party clause creation and acceptance;
- persistent shareable clause and evidence pages;
- opt-in monitoring and notifications for active clauses;
- authentic usage analytics;
- deployed application and public source.

Strongly preferred if safe within the schedule:

- Base Sepolia escrow;

Optional:

- email/Telegram reminder;
- downloadable receipt;
- webhook for service platforms.

Deferred:

- mainnet funds;
- insurance/premium language;
- multiple chains;
- generalized legal contracts;
- mobile app;
- AI-written settlement decisions.
