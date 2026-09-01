# Track 3 Idea Shortlist From Live Intelligence

> This was the first live-Intent shortlist. Its token-growth recommendation is
> still valid, but it has now been compared with more hackathon winners and
> payment products in
> [`track3-cross-ecosystem-idea-research.md`](./track3-cross-ecosystem-idea-research.md).

Snapshot: **2026-08-31 21:27 UTC / 22:27 WAT**.

## Decision Question

Which small, low-friction product can be understood in 30 seconds, use live
Telegraph intelligence honestly, attract real users during Track 3, and become
a repeatable product rather than a one-use demo?

No idea is locked by this document.

## Primary Evidence

- [Track 3 rules](https://hackathon.telegraphprotocol.com/rules)
- [Supported Intent catalog](https://hackathon.telegraphprotocol.com/supported-intents)
- [Live Intent registry](https://devnode.telegraphprotocol.com/engine/v1/intents)
- [Live Miner catalog](https://devnode.telegraphprotocol.com/api/miners)
- Direct, read-only probes of publicly listed Miner endpoints
- Existing project and repository comparison in
  [`track3-open-source-reverse-engineering.md`](./track3-open-source-reverse-engineering.md)

The refreshed catalog contained 129 Miner registrations and 45 canonical
Intents. Request counters are Miner-wide and are not audited per-Intent user
counts.

## Strong Live Capability Families

| Intent | Miners | Miners reporting a positive request counter | Highest Miner-wide counter |
|---|---:|---:|---:|
| `FRAUD_DETECTION` | 15 | 10 | 35 |
| `CRYPTO_PRICE` | 14 | 7 | 68 |
| `WEATHER_FORECAST` | 14 | 12 | 398 |
| `ONCHAIN_TX_LOOKUP` | 12 | 6 | 35 |
| `TASK_COMPLETION` | 11 | 10 | 120 |
| `TVL_LOOKUP` | 10 | 7 | 55 |
| `WALLET_BALANCE_CHECK` | 10 | 7 | 140 |
| `WEATHER_CHECK` | 10 | 8 | 398 |
| `WEB_SEARCH` | 9 | 7 | 120 |
| `STORM_ALERT` | 7 | 5 | 398 |
| `NEWS_SEARCH` | 5 | 4 | 80 |
| `TOKEN_HOLDER_COUNT` | 5 | 3 | 35 |

## Candidate Products

Scores are internal product-selection estimates from 1 (weak) to 5 (strong),
not organizer scores.

| Product direction | 30-second clarity | Low friction | Repeat/adoption potential | Live-Intent fit | Differentiation | Seven-day feasibility | Total /30 |
|---|---:|---:|---:|---:|---:|---:|---:|
| **Base token growth monitor** | 5 | 5 | 5 | 4 | 4 | 5 | **28** |
| **Outdoor event readiness card** | 5 | 4 | 4 | 5 | 3 | 4 | **25** |
| **Plain-language Base transaction receipt** | 5 | 5 | 3 | 4 | 3 | 5 | **25** |
| **DeFi protocol health watchlist** | 4 | 4 | 5 | 4 | 3 | 4 | **24** |
| **Recipient-wallet payment check** | 5 | 5 | 3 | 3 | 2 | 5 | **23** |
| **General research/news brief** | 4 | 4 | 3 | 4 | 2 | 4 | **21** |

### 1. Base Token Growth Monitor — provisional recommendation

**Plain-language pitch:** Paste a Base token contract and receive a live,
shareable card showing its price and number of holders. Follow the token to get
alerts when either changes.

**User:** token-community member, creator, small investor, or community manager.

**Input:** chain plus token contract address.

**Telegraph jobs:**

- `CRYPTO_PRICE` supplies the current price.
- `TOKEN_HOLDER_COUNT` supplies the current holder count.
- Repeated, time-stamped queries turn snapshots into honest change alerts.

**Useful action:** follow, share, or react to a meaningful price/holder change.

**Why it is a product:** arbitrary token inputs, watchlists, saved snapshots,
change alerts, public share pages, and repeated monitoring support ongoing use.
The first scan can require no account and no wallet connection.

**Positioning boundary:** report observed metrics and changes. Do not call the
result a safety score or investment recommendation.

### 2. Outdoor Event Readiness Card

**Pitch:** Enter an outdoor event's location and date. Receive a shareable
Go / Prepare / Postpone card with rain, wind, and storm reasons.

**Telegraph jobs:** `WEATHER_FORECAST`, `STORM_ALERT`, and optionally
`WEATHER_CHECK` on the event day.

**Main strength:** weather has the deepest and most-used observed supply.

**Main weakness:** it is less visibly Web3-native and competes with familiar
weather products. Location resolution must be confirmed with the user.

### 3. Plain-Language Base Transaction Receipt

**Pitch:** Paste a Base transaction hash and see what happened in ordinary
language, including status, parties, value, and contract method, with a
shareable receipt.

**Telegraph job:** `ONCHAIN_TX_LOOKUP`; a party-risk check could be added only
after cross-chain behavior is proven reliable.

**Main strength:** extremely clear, chain-native, and frictionless.

**Main weakness:** block explorers already cover much of the job, and tested
fraud signals did not yet support a reliable Base-specific verdict.

### 4. DeFi Protocol Health Watchlist

**Pitch:** Follow a DeFi protocol and receive alerts when its TVL, token price,
or important news changes.

**Telegraph jobs:** `TVL_LOOKUP`, `CRYPTO_PRICE`, and `NEWS_SEARCH`.

**Main strength:** recurring monitoring creates legitimate repeat usage.

**Main weakness:** a protocol slug and a token contract/symbol are not always
the same input, so the product needs a trustworthy protocol-to-token mapping.

### 5. Recipient-Wallet Payment Check

**Pitch:** Paste the wallet you are about to pay and receive a compact evidence
card before sending funds.

**Potential jobs:** `FRAUD_DETECTION`, `WALLET_BALANCE_CHECK`, and a later
`ONCHAIN_TX_LOOKUP` receipt.

**Main weakness:** security products are crowded, and inconsistent or
chain-mismatched fraud results could create false confidence. It should not be
selected without much stronger paid tests.

## Public Endpoint Probe Results

These probes called public Miner endpoints directly. They validate endpoint
reachability and input/output compatibility only. They are **not** paid,
auto-routed Telegraph Engine calls and do not prove the complete x402 flow.

### Token-growth inputs

- A Base DEGEN contract returned a raw USD price and holder count.
- A second listed provider also returned a DEGEN price and holder count.
- The same holder-count endpoint returned a useful `invalid_input` response for
  `0x1234`.
- One price summary rounded a sub-cent token to `$0.00`, although its structured
  `price_usd` field contained the correct decimal value. The application must
  format structured values itself rather than blindly display Miner prose.

This is the cleanest tested two-Intent combination: the same chain and token
contract naturally drive both questions.

### Transaction and fraud inputs

- A freshly fetched Base transaction was found and identified as a successful
  `multicall` by a listed Miner.
- An invalid transaction hash produced an explicit validation response.
- One wallet-risk endpoint assessed the address on Ethereum even though the
  source transaction was on Base, and returned an inconclusive low-confidence
  result.
- Another fraud endpoint returned a materially different LLM-produced risk
  probability for the address.

Transaction lookup is usable. A combined Base fraud verdict is not yet safe to
promise.

### Weather inputs

- Lagos returned forecast and storm data successfully.
- A nonsense place name was silently resolved to Novato, California instead of
  returning an error.

A weather application therefore needs a separate location-confirmation step
and must display the resolved place before treating the answer as actionable.

### TVL input

- `aave` returned a current protocol TVL successfully.
- TVL expects a protocol or chain identifier, which cannot always be inferred
  safely from an arbitrary token contract.

## Current Recommendation

The best current direction is a **Base token growth monitor**, not the earlier
four-signal `TokenCheck` concept.

The narrower idea is stronger because:

1. One user input naturally powers both Intents.
2. Two publicly listed providers returned usable results for a real Base token.
3. It avoids pretending that a protocol TVL or wallet-fraud score describes
   every token.
4. Monitoring creates legitimate repeat Telegraph requests.
5. Public growth cards can spread through existing token communities.
6. It can be explained in one sentence and used without account creation.

This recommendation remains provisional until `CRYPTO_PRICE` and
`TOKEN_HOLDER_COUNT` pass paid, auto-routed Engine smoke tests with an
established token, a smaller token, and invalid input.

## Not Yet Done

- No paid Telegraph Engine request was made.
- No x402 wallet was connected or funded.
- No final idea was selected.
- No application implementation was started.
