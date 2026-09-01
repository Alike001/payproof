# Reality Research: Track 3 Applications And Live Miners

Snapshot: **2026-08-31 10:16 UTC / 11:16 WAT**. Live network state can change after this timestamp.

## Scope

This brief answers four questions:

1. Whether entering the Miner or Script Author tracks is a prerequisite for Track 3.
2. What “application” means in Telegraph and in Web3 generally.
3. Which Telegraph Intents and Miners are live now.
4. Which capability clusters have the strongest observable supply before idea selection.

## Sources Checked

- [Hackathon homepage](https://hackathon.telegraphprotocol.com/)
- [Hackathon rules](https://hackathon.telegraphprotocol.com/rules)
- [Hackathon Intent catalog](https://hackathon.telegraphprotocol.com/supported-intents)
- [Live Miner catalog](https://devnode.telegraphprotocol.com/api/miners)
- [Live Intent registry](https://devnode.telegraphprotocol.com/engine/v1/intents)
- [Live Miner leaderboard](https://devnode.telegraphprotocol.com/leaderboard/miners?limit=1000)
- [Engine inference documentation](https://docs.telegraphprotocol.com/docs/using/engine-ask)
- [x402 inference documentation](https://docs.telegraphprotocol.com/docs/using/x402-inference)
- [WebSocket signal documentation](https://docs.telegraphprotocol.com/docs/using/websocket-signals)
- [Daemon signal-feed documentation](https://docs.telegraphprotocol.com/docs/using/daemon-signals)
- Current `telegraphprotocol/telegraph-hackathon-submissions` source at commit `d9f1d3e2f4749f37678111e4b52b25b48975f7dd`.

Context7 was queried for Telegraph Protocol documentation first, as required by the workspace instructions. Its matches were for the unrelated Telegra.ph publishing API, so official Telegraph documentation and live protocol endpoints were used instead.

## Verified Facts

### Track 3 eligibility

- The public homepage says the event has open eligibility and calls Track 3 “Apps & Agents.”
- The rules describe one hackathon with three interconnected tracks. They do not state that a Track 3 participant must previously enter Track 1 or Track 2.
- Track 3 exists specifically after Miners and scripts are available so application builders can consume them.
- Track 3 applications must use real Telegraph Miners. Simulated or mocked Miner data is prohibited.
- The public rules require participants to join the official Hackathon Discord.
- The public rules page does not provide a complete legal eligibility policy, including age and jurisdiction terms. Those details, if any, must be confirmed in the registration flow or Discord.

Therefore, **not entering Track 1 or Track 2 is not a published disqualification condition for Track 3**. Registration and any operational instructions announced in Discord still matter.

### What an application is in this track

An application is the user-facing or agent-facing product that **uses** Miner intelligence to accomplish something. It can be a web app, mobile app, bot, autonomous agent, automation, dashboard, workflow, or a system that triggers an off-chain or on-chain action. The public rules do not require every application to deploy a smart contract.

The simplest Telegraph application loop is:

```text
user or scheduled event
  -> application asks Telegraph a real question
  -> Telegraph classifies the Intent and routes to a Miner
  -> application pays through x402
  -> Miner returns an answer
  -> application displays a decision, sends an alert, or takes an action
  -> application retains signal/payment evidence
```

The Engine supports auto-routed questions and direct Miner calls. For an auto-routed request, the application sends a natural-language query and the Engine classifies its Intent and selects a Miner. The public documentation says every paid successful call returns routing/cost metadata and may include a `signal_hash` for later verification.

### How this differs from “dapp”

A conventional Web3 dapp normally combines a user interface with blockchain-backed logic such as a smart contract. A Telegraph Track 3 application may be a dapp, but it can also be an ordinary web service or autonomous agent whose distinctive dependency is paid, routed Telegraph intelligence. On-chain actions increase integration depth but are not stated as a universal requirement.

### Track 3 judging

- **45%:** real usage and adoption.
- **25%:** usefulness, creativity, and integration depth.
- **25%:** public updates and engagement on X.
- **5%:** technical execution and integration quality.

The practical judging unit is therefore not merely a polished interface. It is a usable product that generates authentic Telegraph calls and demonstrates why routed, verified Miner intelligence improves the outcome.

### Live network snapshot

At the snapshot time:

- `GET /api/miners` returned **127 registrations**.
- All 127 were marked `active` and `scored` in that response.
- 78 reported a positive `total_requests_served` value.
- `GET /engine/v1/intents` returned **45 canonical Intents**, **43 with at least one Miner**.
- The two canonical hackathon-catalog Intents with no live Miner were `TWITTER_SEARCH` and `TEXT_AUTHENTICITY_CHECK`.
- The live registry also exposed five capabilities absent from the 40-item hackathon page: `DEEPFAKE_DETECTION`, `IMAGE_VERIFICATION`, `MEDIA_AUTHENTICITY_CHECK`, `TELEGRAPH_KNOWLEDGE`, and `VIDEO_VERIFICATION`.
- The live leaderboard reported epoch **296**, 42 scored Intent leaderboards, and 248 Miner/Intent entries.

### Deepest live supply by Miner count

| Intent | Live Miners |
|---|---:|
| `FRAUD_DETECTION` | 15 |
| `WEATHER_FORECAST` | 14 |
| `CRYPTO_PRICE` | 13 |
| `LANGUAGE_GENERATION` | 12 |
| `ONCHAIN_TX_LOOKUP` | 11 |
| `TASK_COMPLETION` | 11 |
| `CHAT_COMPLETION` | 10 |
| `URL_SCAN` | 10 |
| `WEATHER_CHECK` | 10 |
| `TVL_LOOKUP` | 9 |
| `WALLET_BALANCE_CHECK` | 9 |
| `WEB_SEARCH` | 9 |

Supply depth matters because a multi-Miner Intent gives the router alternatives when one Miner is unavailable, rate-limited, or performing poorly.

### Highest observed individual request counters

| Miner | Reported requests | Intents |
|---|---:|---|
| `amanat-weather-risk` | 392 | Weather forecast, check, and storm alert |
| `onlookout-weather` | 304 | Weather forecast |
| `openweathermap` | 171 | Weather check and forecast |
| `groq-llama31-instant-miner` | 144 | Chat and language/text generation |
| `telegraph-chatbot` | 118 | Chat, tasks, agents, web search, Telegraph knowledge |
| `weatherapi` | 116 | Weather check and forecast |
| `livecert` | 102 | Ten Intents spanning SSL, weather, text, news, and wallet data |
| `tavily` | 75 | Web/news search, research, and fact checking |

`total_requests_served` is a Miner-wide counter, not an Intent-specific counter. A multi-Intent Miner's total cannot be assigned to one of its Intents, and the values should be treated as a usage signal rather than audited user/adoption totals.

### Current capability clusters

1. **Weather and storm intelligence** has the strongest combination of supply depth and observed Miner request counters.
2. **Web3 risk and transaction intelligence** has deep supply across `FRAUD_DETECTION`, `ONCHAIN_TX_LOOKUP`, `URL_SCAN`, and `WALLET_BALANCE_CHECK`.
3. **General AI and research** has broad supply across chat, task completion, language generation, web search, news search, and fact checking.
4. **Financial data** has broad supply, particularly crypto prices, but observed per-Miner request counters are generally lower than the leading weather and AI services.

Most listed Miners declare a floor price of `10000` micro-USDC, equal to **$0.01 USDC**, before any demand multiplier. The x402 challenge, not the catalog floor, is authoritative for the amount charged on an actual request.

### Track 3 portal state

At the inspected latest public submission-portal revision, the backend registers only Miner and WASM submission routes. The frontend still renders Track 3 as a `ComingSoonPanel`. The hackathon homepage's Register buttons also do not expose a normal hyperlink in its server-rendered HTML. The exact Track 3 form fields and activation moment are therefore not yet verifiable from the public portal source.

## Inferences

- Weather is presently the safest capability family for redundancy and already-demonstrated traffic.
- A Web3 transaction-safety application is the strongest thematic fit with the organizer's highlighted on-chain intelligence category because it can combine three deep Intent pools and end in a concrete “proceed / warn / block” decision.
- Search/news plus AI reasoning is technically straightforward, but the official use-case collection already contains research and market-monitoring patterns, so differentiation may be harder.
- For the hackathon's quality-flywheel objective, auto-routing by Intent demonstrates Telegraph's core mechanism more directly than hard-coding a single Miner ID.

## Unknowns And Questions

- The Track 3 submission form, required fields, team-size rules, and exact opening hour are not yet published in the inspected public source.
- Discovery status and leaderboard scores do not prove that every paid request shape will succeed. Candidate Intents need paid smoke tests before an application idea is finalized.
- It is not publicly clear whether registrations or application analytics will distinguish organic end users from the team's own legitimate testing traffic; artificial inflation is explicitly prohibited.
- The public rules do not say whether live-registry Intents absent from the 40-item hackathon catalog are eligible for Track 3 judging. Use catalog-listed Intents unless the organizers confirm otherwise.

## Not Included

- No paid Miner inference was executed.
- No wallet was connected, funded, or used.
- No hackathon registration or submission was made.
- No application idea, scope, architecture, or implementation was finalized in this brief.
