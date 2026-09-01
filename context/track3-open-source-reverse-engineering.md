# Track 3 Open-Source Reverse Engineering

Research snapshot: **2026-08-31**.

## Outcome

The earlier `SignalGuard` direction remains technically feasible, but the
broader repository scan exposed a crowded security field. Telegraph already
has live URL/TLS/on-chain intelligence Miners, ProofGate already guards agent
URL actions, and external hackathons have repeatedly produced wallet scanners,
transaction simulators, x402 spend controls, and pre/post-payment auditors.

The participant accepted the following direction on **2026-08-31**:

# StormClause

**A weather-triggered cancellation clause for outdoor service deposits.** Two
people agree in advance what happens if severe weather disrupts a booking.
Telegraph checks the forecast, monitors storm risk, and records the actual
conditions. The app then produces an objective `PROCEED`, `RESCHEDULE`, or
`REFUND` decision and can optionally settle testnet USDC.

The product direction and first audience—outdoor event customers and
photographers—are selected. The exact feature scope remains conditional on paid
Miner probes confirming usable response shapes, latency, cost, and signal
evidence for all three weather Intents.

## The idea in everyday language

Imagine a customer books a photographer for an outdoor event in Lagos and pays
a deposit. The photographer says the deposit is non-refundable; the customer
says a severe storm should count as a fair cancellation. If rain ruins the
event, they may argue because nobody agreed on an objective rule.

StormClause lets them agree beforehand:

> “If Telegraph reports a severe storm alert, or rain risk above the agreed
> threshold at this place and time, reschedule the booking or refund 80% of the
> deposit. Otherwise, the booking continues.”

Telegraph is the neutral weather reporter. StormClause is the written agreement
and referee. A testnet escrow is the locked envelope holding the deposit.

This is closer to a programmable cancellation policy than an insurance
company. It does not price risk, sell policies, recruit investors, or promise
financial coverage.

## Thirty-second product explanation

> StormClause is booking protection for outdoor photographers and their
> customers. Both sides agree in advance on a weather rule for the deposit.
> An autonomous monitor uses Telegraph's live weather Miners before and during
> the event. If the agreed threshold is reached, StormClause produces a
> verifiable reschedule or refund outcome; otherwise the booking continues.

## Product bar

StormClause qualifies as a product only if a real user can create and manage a
real agreement without our team staging the flow. The first release therefore
needs:

- a deployed public application;
- creator and counterparty participation;
- persistent clauses with stable share links;
- acceptance of immutable place, time, threshold, and outcome terms;
- real paid Telegraph Miner calls rather than fixtures;
- an opt-in monitor that runs while an accepted clause is active;
- notifications and a clear action/result state;
- retained routing, cost, signal, and decision evidence;
- honest analytics for distinct users, accepted clauses, and real calls;
- useful failure states such as `NEEDS_REVIEW`.

A page containing one pre-filled booking, hard-coded weather, a scripted refund,
or a one-time judge-only walkthrough is a demo and does not meet this bar.

## Base relationship

Telegraph is built on Base and its paid Miner flow supplies the core economic
connection. StormClause should make real Telegraph x402 payments through the
supported testnet flow. A narrowly scoped Base Sepolia deposit escrow is a
valuable action-layer feature, but it is not allowed to replace the core
product workflow and must not be presented as production custody.

## Why the live intelligence leads here

The live registry refresh used for ideation reported:

| Intent | Live Miners | Highest observed Miner-wide request counter | Job in StormClause |
|---|---:|---:|---|
| `WEATHER_FORECAST` | 14 | 392 | Estimate risk when the clause is created |
| `STORM_ALERT` | 7 | 392 | Detect a serious disruption near the booking |
| `WEATHER_CHECK` | 10 | 392 | Record conditions at decision/settlement time |

These were the strongest combined supply and observed-use signals in the live
marketplace. Each call has a different purpose; the product does not generate
three calls merely to inflate usage.

The Web3 security cluster is also deep, but the repository scan found direct
product overlap:

- ProofGate already buys a Telegraph `URL_SCAN` verdict and withholds an
  agent's network action unless policy allows it.
- Preflight already serves URL, TLS, and transaction checks and explicitly
  mentions a future Track 3 agent gateway.
- DegenLens includes an on-chain investigation application around its Miner.
- Aegis402, Blackbelt, LastCheck, x402 Guardrails, Forta, and PaySentry cover
  closely related payment or transaction protection patterns.

This does not make security a bad category. It makes a generic security gateway
harder to present as creative within a seven-day round.

## What prior projects teach us

### Official Telegraph applications

The official use-case collection repeatedly follows a small loop:

```text
simple user input
  -> one or two paid Telegraph signals
  -> plain-language verdict and confidence
  -> payment/signal proof
  -> sometimes an automatic external action
```

AdGuard is the most useful pattern: it does not stop at a risk dashboard; a
threshold can pause Google Ads. StormClause should likewise turn intelligence
into a visible booking decision.

### RainGuard and WeatherProof

[RainGuard](https://ethglobal.com/showcase/rainguard-vgfqo) won a Chainlink
prize with weather-triggered P2P insurance. It shows that judges understand and
reward the `real-world condition -> automatic outcome` story. Its full product
has insurance requests, expert bidding, investor pools, premiums, reputation,
gasless transactions, and settlement.

[WeatherProof](https://ethglobal.com/showcase/weatherproof-zsh7s) combined
weather data, AI risk assessment, and insurance claims. It reinforces the
value of a concrete user and automatic resolution, but also illustrates how
quickly the scope becomes too broad.

StormClause keeps the winning causal loop but removes the insurance business:

```text
keep: agreed condition -> verified weather -> automatic decision
remove: insurers, experts, bids, liquidity pools, premiums, yield, reputation
```

The RainGuard source inspection also warns us not to equate a prize page with a
production-ready codebase: its inspected contract uses an internal mock oracle
for settlement, and its test folder only exercises the template contract.

### Agent and transaction-security projects

- [Aegis402](https://ethglobal.com/showcase/aegis402-o8x6z) demonstrates the
  strongest general lifecycle: check before an action, collect evidence after
  it, normalize risk locally, and make the result actionable.
- [Blackbelt](https://ethglobal.com/showcase/blackbelt-vp2d4) demonstrates that
  a plain score plus a recommendation is easier to understand than raw chain
  data.
- [x402 Guardrails](https://ethglobal.com/showcase/x402-guardrails-7bvma)
  demonstrates human-readable limits, allowlists, and approval thresholds.
- [Forta's examples](https://github.com/forta-network/forta-bot-examples)
  demonstrate small deterministic detection rules and structured findings.
- [PayBot](https://ethglobal.com/showcase/paybot-q7grd) demonstrates a strong
  hackathon property: the payment unlocks a real, visible outcome rather than
  decorating a dashboard.

StormClause reuses those general patterns: evaluate before action, use explicit
thresholds, emit a structured result, and show the outcome. It does not reuse
their code or pretend to simulate transactions.

## Minimum product flow

```text
1. Creator enters service, place, date/time, deposit, and weather rule.
2. Telegraph WEATHER_FORECAST returns the booking-time risk preview.
3. App creates a shareable clause; the other party accepts its exact terms.
4. An opt-in monitor checks STORM_ALERT near the booking time.
5. At the decision time, WEATHER_CHECK records the observed condition.
6. A deterministic local rule returns PROCEED, RESCHEDULE, or REFUND.
7. The result page shows Miner/routing metadata, signal hashes, cost, and reason.
8. Stretch: a Base Sepolia escrow releases or refunds testnet USDC.
```

The local rule—not an LLM—must own settlement. Example:

```text
if severe_storm_alert is true -> RESCHEDULE_OR_REFUND
else if precipitation_probability >= agreed threshold -> RESCHEDULE_OR_REFUND
else -> PROCEED
```

The exact fields must be chosen only after paid live-response probes. The app
must fail closed to `NEEDS_REVIEW` if required evidence is missing or
contradictory; it must never silently interpret unavailable data as good
weather.

## Scope deliberately removed

To remain credible in seven days, do not build:

- an insurance marketplace;
- expert bidding or investor liquidity pools;
- premium or actuarial pricing;
- cross-chain support;
- a token;
- DAO governance;
- private weather hardware;
- ZK proofs;
- fiat payments;
- automatic mainnet fund movement;
- support for every type of service contract.

One use case—outdoor bookings—and one test network are enough.

## Track 3 fit

| Judging area | StormClause evidence target |
|---|---|
| 45% real usage and adoption | Unique people create/accept real city clauses; legitimate user-triggered and opt-in monitoring calls; public usage counters |
| 25% usefulness, creativity, depth | Three complementary live Intents; forecast-to-monitor-to-observation lifecycle; deterministic action; optional testnet escrow |
| 25% X updates | Daily build evidence, live city weather cards, clause walkthrough, real Miner/routing receipts, tester stories |
| 5% technical execution | Typed normalizer, timeouts/retries, explicit unknown state, deterministic rules, tests, health/metrics page |

Scheduled calls must be tied to accepted, active clauses and capped. A loop that
creates traffic without real users would risk violating the rule against
artificial metric inflation.

## Alternatives retained

### Agent-payment firewall

Still a good backup if paid weather probes fail. It would combine URL, TLS,
fraud, spend-policy, and post-transaction evidence. To be defensible, it must
be positioned beyond ProofGate: payment authorization and settlement
verification, not URL fetching. The crowded comparison set makes its creativity
score less certain.

### Weather operations bot

A Telegram/WhatsApp-style alert bot for event planners or dispatchers would be
faster to ship and easier to adopt. It would likely score lower on integration
depth unless it automatically reschedules a workflow or updates a service
agreement.

## Evidence limits

- No paid Telegraph inference has been executed yet.
- Miner counts and request counters are a point-in-time snapshot, not a promise
  of availability or answer quality.
- A `signal_hash` proves that Telegraph finalized a signal; product claims about
  exactly what it proves must follow current protocol documentation.
- The public Track 3 form and analytics semantics still need confirmation.
- The app should use catalog-listed Intents until the organizers say otherwise.
