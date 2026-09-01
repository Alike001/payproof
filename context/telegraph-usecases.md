# Telegraph Use Cases Repository Context

Repository: [`telegraphprotocol/telegraph-usecases`](https://github.com/telegraphprotocol/telegraph-usecases)
Inspected revision: `73beda92429d8b7decb885567bb45b834b2dea6f` (`main`, 2026-08-04)

## What This Repository Is

`telegraph-usecases` is a collection of **applications that consume Telegraph Miners**. It primarily demonstrates the demand/application side of the ecosystem—the work expected in Track 3—not the Miner or Script Author deliverables expected in Tracks 1 and 2.

Its shared pattern is:

```text
User input or scheduled event
  -> application backend
  -> one or more Telegraph Miner calls
  -> automatic x402 USDC payment
  -> result plus transaction proof
  -> display, decision, or external action
```

## Included Application Patterns

| Use case | User problem | Telegraph supply consumed | Application behavior |
|---|---|---|---|
| TruthWire | Detect AI-generated text/images in an X post | ItsAI text detection + BitMind image detection | Fetches a post, checks two modalities, shows confidence and payment proofs |
| TrustFilter | Detect scam or suspicious messages | OpenAI LLM Miner | Produces structured scam/suspicious/likely-safe verdicts and reasoning |
| ScholarGuard | Detect AI content in PDF/DOCX assignments | ItsAI + BitMind | Extracts text/images and issues separate paid checks per modality |
| ReviewRadar | Assess whether product reviews look AI-generated | ItsAI | Fetches Amazon reviews through SerpAPI and aggregates per-review verdicts |
| AdGuard | Protect brand campaigns from synthetic/fake content | BitMind + ItsAI | Scores an article and can pause Google Ads campaigns above a risk threshold |
| SuperSignal | Monitor prediction markets and news for automated decisions | DeSearch + LLM Miner | Schedules market/news analysis and records YES/NO/HOLD decisions with proofs |

The root README also describes a “Polymarket Sniper Bot.” At the inspected revision there is no `telegraph-polymarket-bot/` directory in the repository tree; the current `telegraph-supersignal/` directory implements the closely related prediction-market workflow. Exact rename/lineage is not stated.

## What These Examples Teach

### 1. A Miner should expose one reusable capability

The applications repeatedly depend on focused services—AI-text detection, AI-image detection, news search, or LLM reasoning. A strong Miner is a reusable building block that several different applications could consume.

### 2. Applications become more valuable by composing Miners

TruthWire and ScholarGuard combine text and image signals. SuperSignal combines news retrieval with an LLM decision. This is the repository's clearest application-level pattern: one verified signal can answer a question; multiple signals can drive a decision.

### 3. The strongest application pattern ends in an action

AdGuard does not merely display a risk score; it can pause an advertising campaign. SuperSignal does not merely summarize news; it produces a market action. This matches the hackathon rules' emphasis on autonomous workflows and on-chain or external actions.

### 4. Payment proof is part of the product

Every application retains and displays an x402 transaction hash. The proof is treated as evidence that the inference call was purchased and settled, not as proof by itself that the model answer was correct.

### 5. The repository contains older integration conventions

The examples use numeric Bittensor-style subnet IDs and Solana/Polygon payment configurations. Current Telegraph docs also describe generic Miners, Base Sepolia registration, and newer Engine routes. Treat each example's endpoints and network settings as revision-specific.

## How It Helps With The Current Tracks

### If choosing Miner

Read the applications backward:

```text
What recurring capability do these apps need that is missing or weak?
```

Examples of the supply role—not project recommendations—include a reliable price feed, contract-risk analyzer, URL reputation API, document extractor, compliance check, logistics estimator, or domain-specific classifier. The Miner must expose that capability as an operational API and map it to one of Telegraph's supported Intents.

### If choosing Script Author

Read each application as a source of failure cases:

```text
What bad Miner output could make this application take the wrong action?
```

For scam detection, the scorer must distinguish evidence-based warnings from confident hallucinations. For search, it should reward relevant, current, source-backed results. For classification, it should penalize malformed labels and unsupported confidence. These are examples of evaluation concerns, not guaranteed winning strategies.

## Source Files Checked

- [Repository README](https://github.com/telegraphprotocol/telegraph-usecases/blob/73beda92429d8b7decb885567bb45b834b2dea6f/README.md)
- [TruthWire README](https://github.com/telegraphprotocol/telegraph-usecases/blob/73beda92429d8b7decb885567bb45b834b2dea6f/telegraph-truthwire/README.md)
- [TrustFilter README](https://github.com/telegraphprotocol/telegraph-usecases/blob/73beda92429d8b7decb885567bb45b834b2dea6f/telegraph-trustfilter/README.md)
- [ScholarGuard README](https://github.com/telegraphprotocol/telegraph-usecases/blob/73beda92429d8b7decb885567bb45b834b2dea6f/telegraph-scholarguard/README.md)
- [ReviewRadar README](https://github.com/telegraphprotocol/telegraph-usecases/blob/73beda92429d8b7decb885567bb45b834b2dea6f/telegraph-reviewradar/README.md)
- [AdGuard README](https://github.com/telegraphprotocol/telegraph-usecases/blob/73beda92429d8b7decb885567bb45b834b2dea6f/telegraph-adguard/README.md)
- [SuperSignal README](https://github.com/telegraphprotocol/telegraph-usecases/blob/73beda92429d8b7decb885567bb45b834b2dea6f/telegraph-supersignal/readme.md)
