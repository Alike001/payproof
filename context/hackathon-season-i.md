# Telegraph Hackathon Season I Context

Snapshot date: **2026-08-31**. This file records the organizer's public site, rules page, supported-intent page, public submission-portal source, and public integration docs. It is not a substitute for announcements in the required official Discord.

## What Season I Contains

The homepage advertises a **$15,000 Season I pool**, composed of:

- **Hackathon 1 (H1): $5,000**, August 17–September 7, 2026 across Miner, Script Author, and Application tracks.
- **Hackathon 2 (H2): $10,000**, described as mid-October 2026.
- **Hackathon 3 (H3): mainnet rewards TBD**, described as December 2026 onward.

The current H1 rules allocate its $5,000 as:

| Track | Total | First | Second | Third |
|---|---:|---:|---:|---:|
| Miner | $2,000 | $1,000 | $600 | $400 |
| Script Author | $1,000 | $500 | $300 | $200 |
| Application | $2,000 | $1,000 | $600 | $400 |

Sources: [hackathon homepage](https://hackathon.telegraphprotocol.com/) and [H1 rules](https://hackathon.telegraphprotocol.com/rules).

## H1 Timeline

| Phase | Organizer-published dates |
|---|---|
| Miner Track | August 17–August 31, 2026 |
| Script Author Track | August 17–August 31, 2026 |
| Application Track | August 31–September 7, 2026 |
| Winner selection | September 8–18, 2026 |
| Announcement and prizes | September 19–25, 2026 |

The public submission portal's source sets the exact Miner and WASM deadlines to **2026-08-31 23:59:59 UTC**, and Track 3 to **2026-09-07 23:59:59 UTC**. At 08:58 UTC on August 31, approximately 15 hours remained for Tracks 1 and 2.

The rules say Track 3 starts on August 31, but do not publish an exact opening time. If the application controls still show Track 3 as closed, the site and official Discord determine the operational handoff.

## Track 1: Miner

### Plain meaning

Supply a useful capability. You are building the **shop/kitchen**, not the final consumer application and not the judge.

A Miner can wrap an existing API, model, dataset, data feed, or tool. The minimum working shape is:

```text
Telegraph request -> your public API -> structured response
```

You describe that API in a public YAML file, associate it with one or more supported Intents, register it on Base Sepolia, and keep the endpoint live.

### Concrete public requirements

- An operational API endpoint.
- A valid Telegraph Miner YAML containing identity, base URL, endpoint mappings, descriptions, supported Intents, request parameters, response semantics, and pricing as applicable.
- Public YAML hosting, normally IPFS or stable HTTPS.
- An EVM wallet with Base Sepolia ETH for registration gas.
- On-chain `registerMiner` registration and the resulting Miner registration ID.
- An X username and progress/update posts tagged as required by the rules.
- For the H1 submission portal: one or more **Miner IDs**, each paired with its `.yaml` or `.yml` file.
- The Miner must remain live and operational throughout Track 3.

The current docs state there is no miner registration bond or fee beyond gas. Agents pay USDC, while the documented normal payout pipeline converts the miner share into MACHINA.

### Judging

- **75% Normalized Performance within your Intent.** Your average Canonical Score is compared with the best average score in the same Intent.
- **25% Engagement and public updates on X.** The rules require tagging `@Telegraphprotoc`.
- **Cash-prize guardrail:** the Intent needs at least three active Miners and at least 100 real requests from Track 3 applications.

This creates a trade-off: a popular Intent has a better chance of meeting the three-Miner/100-request guardrail but may attract stronger competition; a rare Intent may be easier to top but can fail prize eligibility through insufficient supply or demand.

## Track 2: Script Author

### Plain meaning

Define how quality is measured. You are building the **exam and marking scheme**, not an answer provider.

For a selected Intent, your program receives:

```text
question + ground-truth answer + miner answer -> score from 0.0 to 1.0
```

It is compiled to a sandboxed WASM module. Validators can then execute the same deterministic grader against competing Miner outputs.

### Concrete public requirements

- A scoring algorithm for one supported Intent.
- A WASM binary compiled for `wasm32-unknown-unknown`, not WASI.
- Required exports: `alloc`, `dealloc`, and `rank_answer` with Telegraph's six pointer/length parameters.
- No unresolved imports or operating-system/WASI dependencies.
- Correct handling of blank, long, Unicode, correct, incorrect, and paraphrased answers.
- A public binary URL of at most 32 MB and a matching `keccak256` hash.
- On-chain `registerWasm(wasmHash, wasmUrl, intent)` registration and the resulting registration ID.
- For the H1 submission portal: one or more **WASM registration IDs**, each paired with a public GitHub URL.
- An X username and required progress updates.
- The script must remain available/operational throughout Track 3.

Registration first checks structure and sane behavior. It then benchmarks the candidate against the current champion scorer. A structurally valid script can still be rejected if it does not separate good answers from bad answers at least as effectively as the incumbent.

### Judging

- **50% Improvement over baseline:** evaluation accuracy/effectiveness relative to the current Canonical Script.
- **30% Robustness and code quality:** edge cases, clean structure, and WASM/sandbox compliance.
- **10% Engagement and public updates on X.** The rules require tagging `@Telegraphprotoc`.
- **10% Community engagement and adoption.** Mentions, feedback, and use by others.

The rules say the top scripts are selected through focused manual review by the core team after benchmark evaluation.

## Miner Versus Script At A Glance

| Question | Miner | Script Author |
|---|---|---|
| What do you make? | An answer-producing API/service | A quality-scoring WASM program |
| Everyday analogy | A restaurant competing to serve meals | The health inspector and judging rubric |
| Main work | API reliability, schema mapping, useful output | Evaluation design, benchmarks, adversarial cases |
| Typical stack | Any API language plus YAML and Web3 registration | Rust/WASM or another WASM-capable toolchain |
| Main technical risk | Telegraph cannot call you correctly, downtime, poor answer quality | Module traps, wrong ABI, weak scoring, easy-to-game metric |
| Main competition | Other Miners in the same Intent | The current Canonical/champion scoring script |
| External dependency | Needs Track 3 demand to meet the cash-prize guardrail | Community adoption is 10%; benchmark/manual review dominate |
| Operational duty | API stays reachable through Track 3 | Binary/registration stays available through Track 3 |
| H1 prize pool | $2,000 | $1,000 |

## Supported Intent Landscape

The organizer publishes 40 supported Intents: 18 Tier A deterministic domains and 22 Tier B LLM-judged domains.

### Tier A: deterministic/data-heavy

- Financial: `STOCK_PRICE`, `CRYPTO_PRICE`, `FINANCIAL_DATA`, `CURRENCY_EXCHANGE`
- On-chain: `WALLET_BALANCE_CHECK`, `GAS_PRICE`, `TOKEN_HOLDER_COUNT`, `TVL_LOOKUP`, `ONCHAIN_TX_LOOKUP`
- Weather/sports: `WEATHER_CHECK`, `STORM_ALERT`, `WEATHER_FORECAST`, `SPORTS_SCORE`, `GAME_RESULT`
- Security/utilities: `SSL_VERIFICATION`, `CVE_LOOKUP`, `IP_GEOLOCATION`, `URL_SCAN`

### Tier B: language/context-heavy

- Search/research: `WEB_SEARCH`, `NEWS_HEADLINES`, `NEWS_SEARCH`, `RESEARCH_SYNTHESIS`, `RESEARCH_QUERY`, `ACADEMIC_SEARCH`, `FACT_CHECK`, `TWITTER_SEARCH`
- AI/chat: `LANGUAGE_GENERATION`, `CHAT_COMPLETION`, `TEXT_GENERATION`, `TASK_COMPLETION`, `AGENT_TASK`
- Text analysis: `SENTIMENT_ANALYSIS`, `TEXT_CLASSIFICATION`, `CONTENT_MODERATION`, `CONTENT_VERIFICATION`, `AI_TEXT_DETECTION`, `TEXT_AUTHENTICITY_CHECK`, `CONTENT_EXTRACTION`, `LANGUAGE_TRANSLATION`
- Risk/trust: `FRAUD_DETECTION`

Source: [supported Intent catalog](https://hackathon.telegraphprotocol.com/supported-intents). The on-chain canonical Intent list remains the authoritative registration list.

## Non-Negotiable Organizer Rules Relevant To Track Choice

- Track 3 applications must use real Telegraph Miners; mocked data is not allowed.
- Miners and Script Authors must remain live throughout Track 3.
- Judging updates must be public on X and properly tagged.
- Metric manipulation or gaming results in disqualification.
- Participants must join the official hackathon Discord and are expected to stay active there.

## Details Not Stated On The Public Rules Page

The inspected public rules page does not specify formal age or jurisdiction restrictions, maximum team size, IP ownership terms, originality/reuse rules, a complete submission-material checklist, or the exact Track 3 opening time. “Open to Any Developer” appears on the homepage, but it is not a substitute for those missing legal and operational details. Confirm them in the registration flow or official Discord before relying on an assumption.

## Source Boundary

The custom Telegraph hackathon is not represented by local Devpost workflow state in this workspace. No registration, rule acknowledgment, or submission was performed during this research.
