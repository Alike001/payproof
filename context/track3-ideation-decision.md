# Track 3 Ideation Decision

> **Superseded after broader reverse engineering on 2026-08-31.** SignalGuard
> was a reasonable capability-led first choice, but the later repository scan
> found substantial overlap with ProofGate, Preflight, DegenLens, and external
> agent-payment/security projects. The current provisional recommendation is
> StormClause. See
> [`track3-open-source-reverse-engineering.md`](./track3-open-source-reverse-engineering.md).

Decision date: **2026-08-31**
Live-data refresh: **2026-08-31 11:06 UTC**

## Eligibility Gate

The participant reports that a Telegraph Discord administrator confirmed:

> “Yes, you can, its completely open. Each track is separately judged.”

This resolves the practical prerequisite question: the Track 3 entry does not depend on having entered Track 1 or Track 2. The organizer response is user-supplied evidence; preserve a screenshot or message link with the eventual submission records.

## Selection Principle

Choose a product from capabilities that are demonstrably live, redundant, recently scored, and naturally composable. Do not begin with a generic product concept and attach Telegraph calls afterward.

The refreshed live endpoints reported:

- 128 registered Miners, 128 marked active and 127 marked scored.
- 45 canonical Intents, 43 with at least one Miner.
- Leaderboard epoch 296 with 42 Intent leaderboards.

Primary sources:

- [Live Miner catalog](https://devnode.telegraphprotocol.com/api/miners)
- [Live Intent registry](https://devnode.telegraphprotocol.com/engine/v1/intents)
- [Live Miner leaderboard](https://devnode.telegraphprotocol.com/leaderboard/miners?limit=1000)
- [Track 3 judging rules](https://hackathon.telegraphprotocol.com/rules)

## Capability Evidence Used

| Intent | Active Miners | Miners with a positive request counter | Highest individual request counter | Complete input/output schemas |
|---|---:|---:|---:|---:|
| `FRAUD_DETECTION` | 15 | 10 | 35 | 13 |
| `URL_SCAN` | 10 | 7 | 35 | 8 |
| `ONCHAIN_TX_LOOKUP` | 12 | 6 | 35 | 12 |
| `WALLET_BALANCE_CHECK` | 10 | 7 | 102 | 9 |
| `WEATHER_FORECAST` | 14 | 12 | 392 | 14 |
| `STORM_ALERT` | 7 | 5 | 392 | 7 |
| `WEATHER_CHECK` | 10 | 8 | 392 | 10 |
| `CRYPTO_PRICE` | 14 | 7 | 68 | 10 |
| `TVL_LOOKUP` | 10 | 7 | 55 | 7 |
| `WEB_SEARCH` | 9 | 7 | 118 | 3 |
| `NEWS_SEARCH` | 5 | 4 | 75 | 5 |
| `FACT_CHECK` | 2 | 1 | 75 | 1 |

Request counters belong to Miners, not individual Intents. They are a usage proxy, not audited per-Intent adoption.

## Candidate Comparison

Projected scores below are decision estimates against the published Track 3 weights, not organizer scores.

| Candidate | Usage /45 | Usefulness and depth /25 | X/demo potential /25 | Execution /5 | Projected total |
|---|---:|---:|---:|---:|---:|
| **SignalGuard — verify-before-you-pay Web3 safety** | 36 | 23 | 22 | 4 | **85** |
| Weather-to-action risk monitor | 39 | 20 | 21 | 4 | **84** |
| DeFi treasury risk dashboard | 30 | 22 | 19 | 3 | **74** |
| News/research decision agent | 34 | 17 | 18 | 4 | **73** |

### Why weather was not selected first

Weather is the strongest raw capability family, but a forecast dashboard would be a shallow integration. A compelling version needs persistent monitoring and an automatic logistics, event, insurance, or escrow action. That is a strong backup direction but requires a narrower user group and more domain-specific product design.

### Why research/news was not selected first

The live supply is usable, but the official Telegraph use-case collection already includes news, research, prediction-market, and content-verification patterns. A new entry would face a higher differentiation burden.

## Selected Direction

# SignalGuard

**One-line concept:** A Web3 safety application that uses Telegraph intelligence to check a payment link and recipient before the user acts, then verifies the resulting on-chain transaction.

The idea emerges directly from three deep, compatible Intent pools:

```text
URL_SCAN
  -> Is the payment or dapp URL safe?

FRAUD_DETECTION
  -> Does the recipient wallet or proposed payment look risky?

ONCHAIN_TX_LOOKUP
  -> After signing, did the transaction succeed and what actually happened?
```

### Natural user flow

```text
User pastes a payment/dapp URL and recipient wallet
  -> Telegraph URL_SCAN
  -> Telegraph FRAUD_DETECTION
  -> SignalGuard produces a preflight verdict with evidence
  -> user stops or optionally continues to a Base Sepolia payment
  -> Telegraph ONCHAIN_TX_LOOKUP verifies the resulting hash
  -> SignalGuard stores a shareable report with Telegraph signal hashes
```

Each Telegraph call has a distinct job. The three-call workflow is not artificial volume: one checks the interface, one checks fraud risk, and one verifies settlement.

### Why it fits the judging model

- **Usage:** a report can be generated without forcing every visitor through a wallet transaction; optional testnet payment demonstrates the complete flow.
- **Usefulness:** “Should I trust this link and recipient?” is a concrete Web3 problem with a clear stop/proceed outcome.
- **Depth:** combines three independent Intent leaderboards, uses live routed intelligence, retains signal evidence, and can gate an on-chain action.
- **Social demonstration:** unsafe/safe comparisons, routing details, signal proofs, and transaction receipts are easy to show in short posts and videos.
- **Execution:** a focused web application is realistic within the seven-day Track 3 window.

### Important scope boundary

`ONCHAIN_TX_LOOKUP` analyzes an existing transaction hash; it does not decode an unsigned transaction before signing. The initial safety decision must therefore use the URL and fraud checks. Transaction lookup is the post-payment verification step. The product must not claim to simulate or decode an unsigned transaction unless another verified capability is added.

## Before Scope Is Locked

The concept is selected, but the product scope should remain provisional until these checks pass:

1. Run paid smoke tests for `URL_SCAN`, `FRAUD_DETECTION`, and `ONCHAIN_TX_LOOKUP` through Telegraph.
2. Record result shapes, selected Miners, costs, latency, warnings, fallbacks, and `signal_hash` behavior.
3. Confirm Track 3 submission fields and whether the organizer expects auto-routing, direct Miner calls, or either.
4. Confirm a permitted source of Base Sepolia USDC for application testing.
5. Preserve the Discord eligibility confirmation.

If one of the three Intents proves unreliable in paid testing, remove or replace that step based on evidence instead of disguising it with mocked data.
