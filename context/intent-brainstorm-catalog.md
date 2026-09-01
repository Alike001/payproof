# Telegraph Intent Brainstorm Catalog

Snapshot: **2026-08-31**.

## How To Read This

The [official hackathon catalog](https://hackathon.telegraphprotocol.com/supported-intents)
lists 40 supported Intents. The
[live registry](https://devnode.telegraphprotocol.com/engine/v1/intents)
currently exposes 45 canonical Intents. This file lists all 40 official Intents
first, with their live Miner counts, then separates five live-only capabilities
whose hackathon eligibility should be confirmed with the organizers.

Miner count shows supply depth, not proven quality. A product candidate still
needs paid, auto-routed tests through the Telegraph Engine.

Availability shorthand:

- **Strong:** 5 or more live Miners
- **Thin:** 1–4 live Miners
- **None:** no live Miner in the registry snapshot

## 1. Financial Data

| Intent | Miners | Plain meaning | Problems it could help solve |
|---|---:|---|---|
| `STOCK_PRICE` | 5 | Current or historical share price | Portfolio alerts, employee-stock tracking, price-triggered workflows |
| `CRYPTO_PRICE` | 14 | Current or historical crypto price | Token monitoring, treasury valuation, payment conversion, market alerts |
| `FINANCIAL_DATA` | 8 | Broader company or market statistics | Company comparison, financial research, risk dashboards |
| `CURRENCY_EXCHANGE` | 7 | Exchange rate or converted amount | Remittance quotes, international invoices, travel budgets |

## 2. On-Chain Analytics

| Intent | Miners | Plain meaning | Problems it could help solve |
|---|---:|---|---|
| `WALLET_BALANCE_CHECK` | 10 | What native coin or token a wallet currently holds | Treasury monitoring, payment readiness, whale alerts |
| `GAS_PRICE` | 9 | Current blockchain transaction-fee level | Fee alerts, transaction scheduling, cost estimates |
| `TOKEN_HOLDER_COUNT` | 5 | Number of addresses holding a token | Community-growth tracking, launch monitoring, token comparisons |
| `TVL_LOOKUP` | 10 | Value deposited in a DeFi protocol, pool, or chain | Protocol monitoring, liquidity alerts, DeFi research |
| `ONCHAIN_TX_LOOKUP` | 12 | Status and details of a specific transaction | Plain-language receipts, payment confirmation, support investigation |

## 3. Weather And Sports

| Intent | Miners | Plain meaning | Problems it could help solve |
|---|---:|---|---|
| `WEATHER_CHECK` | 10 | Current weather at a location | Field-work safety, delivery decisions, travel assistance |
| `STORM_ALERT` | 7 | Severe-weather or storm risk at a location | Event safety, logistics warnings, equipment protection |
| `WEATHER_FORECAST` | 14 | Future weather over a time window | Scheduling, outdoor bookings, farming and delivery planning |
| `SPORTS_SCORE` | 3 | Current or most recent score | Fan alerts, live match assistants, sports dashboards |
| `GAME_RESULT` | 3 | Final outcome of a completed game | Result notifications, competition records, settlement workflows |

## 4. Utilities And Security

| Intent | Miners | Plain meaning | Problems it could help solve |
|---|---:|---|---|
| `SSL_VERIFICATION` | 6 | Check a site's security certificate | Certificate monitoring, expiry warnings, deployment checks |
| `CVE_LOOKUP` | 5 | Details and severity of a known software vulnerability | Patch prioritization, security alerts, dependency reports |
| `IP_GEOLOCATION` | 5 | Approximate location of an IP address | Regional routing, localization, suspicious-access context |
| `URL_SCAN` | 10 | Judge whether a link appears safe or unsafe | Phishing protection, link screening, safe-browsing bots |

## 5. Search And Research

| Intent | Miners | Plain meaning | Problems it could help solve |
|---|---:|---|---|
| `WEB_SEARCH` | 9 | Find current information on the web | General research, live-data assistants, source discovery |
| `NEWS_HEADLINES` | 3 | Return a current headline list | Daily briefings, topic alerts, newsroom monitoring |
| `NEWS_SEARCH` | 5 | Find news coverage about a topic | Due diligence, company monitoring, incident research |
| `RESEARCH_SYNTHESIS` | 4 | Combine findings from several sources | Executive briefs, competitive research, evidence summaries |
| `RESEARCH_QUERY` | 7 | Answer a research question with sources | Decision support, cited investigations, customer research |
| `ACADEMIC_SEARCH` | 6 | Find scholarly papers and literature | Literature discovery, student research, R&D monitoring |
| `FACT_CHECK` | 3 | Test a specific claim against evidence | Misinformation checks, claim review, community notes |
| `TWITTER_SEARCH` | 0 | Search posts or accounts specifically on X | Social monitoring and trend discovery; currently no live supply |

## 6. AI And Chat

| Intent | Miners | Plain meaning | Problems it could help solve |
|---|---:|---|---|
| `LANGUAGE_GENERATION` | 12 | Produce free-form language from a prompt | Creative assistance, product copy, personalized messages |
| `CHAT_COMPLETION` | 10 | General conversational answer or explanation | Customer support, tutoring, knowledge assistants |
| `TEXT_GENERATION` | 4 | Draft, rewrite, summarize, or compose text | Email drafting, reports, posts, document assistance |
| `TASK_COMPLETION` | 11 | Complete a defined multi-step task | Workflow assistance, operational checklists, personal assistants |
| `AGENT_TASK` | 7 | Perform autonomous multi-step work with actions/tools | Automated operations, monitoring agents, cross-service workflows |

## 7. Text Analysis

| Intent | Miners | Plain meaning | Problems it could help solve |
|---|---:|---|---|
| `SENTIMENT_ANALYSIS` | 2 | Detect the emotional tone of supplied text | Review monitoring, customer-feedback triage, brand health |
| `TEXT_CLASSIFICATION` | 3 | Place text into predefined categories | Support-ticket routing, lead sorting, document organization |
| `CONTENT_MODERATION` | 1 | Flag supplied content against safety rules | Community moderation, comment filtering, marketplace safety |
| `CONTENT_VERIFICATION` | 1 | Check whether supplied content appears genuine or unaltered | Provenance checks, plagiarism/integrity workflows |
| `AI_TEXT_DETECTION` | 4 | Estimate whether supplied text was AI-written | Editorial review, education workflows, publishing checks |
| `TEXT_AUTHENTICITY_CHECK` | 0 | Check whether supplied text appears genuine or original | Authenticity and originality review; currently no live supply |
| `CONTENT_EXTRACTION` | 3 | Pull structured fields from messy text | Invoice parsing, contract fields, email-to-database workflows |
| `LANGUAGE_TRANSLATION` | 4 | Translate supplied text into another language | Localization, multilingual support, international communication |

## 8. Risk And Trust

| Intent | Miners | Plain meaning | Problems it could help solve |
|---|---:|---|---|
| `FRAUD_DETECTION` | 15 | Estimate whether an entity, transaction, or action is fraudulent | Payment review, account monitoring, marketplace risk checks |

## Live-Only Capabilities Not In The 40-Intent Hackathon Catalog

These appear in the live registry but not on the official supported-Intents
page. Confirm their eligibility in Discord before basing a submission on them.

| Intent | Miners | Plain meaning | Possible problem area |
|---|---:|---|---|
| `DEEPFAKE_DETECTION` | 1 | Check supplied media for face swapping or synthetic people | Impersonation and scam-media review |
| `IMAGE_VERIFICATION` | 2 | Check whether an image was edited or manipulated | Evidence review, marketplace-image checks |
| `MEDIA_AUTHENTICITY_CHECK` | 1 | Broadly judge whether supplied image/video media is real or AI-generated | Newsroom and social-media verification |
| `VIDEO_VERIFICATION` | 1 | Check a supplied video's authenticity or manipulation | Incident footage and creator-content verification |
| `TELEGRAPH_KNOWLEDGE` | 1 | Answer questions about Telegraph itself | Builder onboarding and protocol support |

## Practical Brainstorming Rule

Start with one person and one recurring decision:

```text
Who has a repeated problem?
  -> What decision must they make?
  -> Which one Intent supplies the missing fact?
  -> Does a second Intent improve that same decision naturally?
  -> What action happens after the answer?
```

Do not combine Intents merely to increase the call count. Every Intent should
have a distinct job in the user's decision.

## Strongest Starting Pools By Supply

- Fraud detection: 15 Miners
- Crypto price and weather forecast: 14 each
- On-chain transaction lookup and language generation: 12 each
- Task completion: 11
- Wallet balance, TVL, URL scanning, weather check, and chat: 10 each

Supply depth is only the first filter. Input compatibility, response quality,
latency, price, and failure behavior require paid Engine tests before scope is
locked.
