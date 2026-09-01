# Track 3 Cross-Ecosystem Idea Research

Snapshot: **2026-08-31**.

> **Decision update — 2026-09-01:** PayProof was selected as the Track 3
> product direction. The remaining pre-build gate is a paid, auto-routed
> Telegraph test of its FX quote and Base USDC transaction-verification path.

## Outcome

The research does not produce one mandatory idea. It produces a defensible
shortlist of four products, with two leading choices:

1. **TokenPulse** is the easiest, lowest-friction product to ship and spread.
2. **PayProof** has the strongest everyday story and deepest Base/payment fit,
   but its transaction-verification path needs one paid Telegraph test before
   it can be selected safely.

The important discovery is that the winning shape is not “put many Telegraph
answers in a dashboard.” It is:

```text
one familiar input
  -> Telegraph supplies a missing fact
  -> the app gives one clear decision
  -> the user can act, monitor, or share proof
```

## What Track 3 Rewards

The [official rules](https://hackathon.telegraphprotocol.com/rules) weight the
Application track as follows:

- 45% real users and real Telegraph request volume;
- 25% usefulness, creativity, and depth of Telegraph integration;
- 25% public progress and engagement on X;
- 5% technical execution.

Applications must use real Telegraph Miners; simulated or mocked Miner data is
not allowed. Track 3 is therefore closer to a one-week product launch than a
traditional “show the judges a clever prototype” contest.

## What Was Studied

### Telegraph itself

- the [official rules](https://hackathon.telegraphprotocol.com/rules);
- the [40 supported Intents](https://hackathon.telegraphprotocol.com/supported-intents);
- the [live Intent registry](https://devnode.telegraphprotocol.com/engine/v1/intents);
- the [live Miner catalog](https://devnode.telegraphprotocol.com/api/miners);
- the official
  [Telegraph use cases](https://github.com/telegraphprotocol/telegraph-usecases);
- the official
  [hackathon submission repository](https://github.com/telegraphprotocol/telegraph-hackathon-submissions);
- direct public-endpoint probes of selected listed Miners.

### Prior products and winners

The project pages establish the product concepts and prize/finalist status. The
cloned repositories were inspected separately to determine what was actually
implemented, mocked, or incomplete.

| Project | What an ordinary user sees | Reusable lesson |
|---|---|---|
| [Am I Cooked](https://ethglobal.com/showcase/am-i-cooked-thooh) | Paste a wallet, get a memorable danger verdict, then revoke risky approvals | One input, one verdict, one action, optional monitoring, and a share card |
| [Horacle](https://ethglobal.com/showcase/horacle-vhi9c) | Ask a nearby person a real-world question and pay a few cents for the answer | A concrete question and incentive loop are easier to understand than protocol infrastructure |
| [Vigil](https://devpost.com/software/vigil-0d2pf1) | Monitor rule changes and receive a personalized call, email, and report | Do not make users repeatedly check a dashboard; alert them when a decision changes |
| [NewsQuantar](https://ethglobal.com/showcase/newsquantar-i7c1b) | Turn a news signal into a small, capped trade | Intelligence becomes valuable when it leads to an action and has safety limits |
| [ZK Microphone](https://ethglobal.com/showcase/zk-microphone-8161v) | Prove that audio came from a real microphone while allowing privacy-preserving edits | A visible proof artifact is more valuable than an unexplained score |
| [ClankerCatcher](https://ethglobal.com/showcase/clankercatcher-90wo6) | Capture a photo and later test whether a copy is authentic | Provenance is compelling, but the inspected verifier is still placeholder logic |
| [CrossMeter](https://ethglobal.com/showcase/crossmeter-w9zay) | Give merchants a normal checkout while hiding multichain settlement | Hide chain plumbing; show amount, recipient, status, and receipt |
| [EthMail](https://ethglobal.com/showcase/ethmail-y5jz7) | Send an invoice through a familiar email flow | Web3 adoption improves when the entry point already feels familiar |
| [Omni402](https://ethglobal.com/showcase/omni402-dvpjd) | Pay an x402 invoice with available assets and settle USDC on Base | Verification and settlement status matter, but its infrastructure scope is too large to copy |
| [Split](https://ethglobal.com/showcase/split-npxrs) | Photograph a receipt, divide it, and settle with friends | Compress several annoying steps into one obvious flow |
| [SkyFall](https://ethglobal.com/showcase/skyfall-jp8jm) | Buy weather protection and receive event-driven settlement | A lifecycle is useful; too many features and simulations weaken trust |
| [Hide&Seek](https://ethglobal.com/showcase/hide-and-seek-3e5jh) | Analyze wallet privacy and make private transfers | Visual analysis is useful, but scan plus transfer infrastructure is excessive scope |

The exact local clones, commits, licenses, and implementation caveats are in
[`research/reference-repos/README.md`](../research/reference-repos/README.md).

## Patterns Worth Reverse Engineering

“Reverse engineering” here means keeping the useful product structure while
removing project-specific code and complexity. It does **not** mean copying
unlicensed source.

### 1. Scan, verdict, action

From Am I Cooked:

```text
wallet scan -> "you are safe / exposed" -> revoke -> monitor
```

Telegraph translation:

```text
token or transaction input -> verified facts -> follow, share, or investigate
```

### 2. Monitor, alert, report

From Vigil:

```text
regulation changes -> personalized alert -> detailed report -> fix
```

Telegraph translation:

```text
price/holders/TVL change -> meaningful alert -> evidence card -> user action
```

### 3. Familiar request, invisible chain, visible receipt

From EthMail, CrossMeter, Omni402, and Split:

```text
ordinary invoice/receipt -> hidden blockchain plumbing -> clear settlement proof
```

Telegraph translation:

```text
local-currency invoice -> Telegraph quote and fee -> Base USDC payment
-> Telegraph transaction check -> shareable receipt
```

### 4. Signal, guardrail, action

From NewsQuantar:

```text
news signal -> capped decision -> transaction -> deduplicate
```

Telegraph translation:

```text
TVL and price fall -> alert once -> user decides whether to exit
```

Automatic trading is deliberately removed from the first version. It adds
financial risk, wallet friction, and testing complexity without improving the
core alert product.

## Four Product Ideas In Layman Terms

### Idea 1: TokenPulse — Base token growth monitor

**30-second explanation**

Paste a Base token address. TokenPulse shows its current price and how many
wallets hold it. Follow the token and receive an alert when price or holder
count changes significantly. Every result can become a shareable growth card.

**Real-world case**

A small token community claims it is growing. Instead of trusting promotional
posts, a community member pastes the token address and sees that holders grew
from 4,800 to 5,100 while price stayed flat. They share that factual card in
their group.

**Telegraph's essential jobs**

- `CRYPTO_PRICE`: what one token is worth now;
- `TOKEN_HOLDER_COUNT`: how many addresses hold it now.

The application stores time-stamped snapshots and calculates changes. It does
not call the token safe, good, or a recommended investment.

**Why it can become a product**

- no account or wallet is needed for the first scan;
- users can monitor many arbitrary Base tokens;
- alerts create repeat use and honest Telegraph request volume;
- public growth cards create a natural sharing loop.

**Main weakness**

Token dashboards already exist. The difference must be the simple growth
decision, ranked Telegraph sources, monitoring, and shareable evidence—not
another chart-heavy explorer.

### Idea 2: PayProof — local-currency USDC invoices with verified receipts

**30-second explanation**

A freelancer creates an invoice in a currency the client understands. PayProof
shows the matching USDC amount and Base fee, lets the client pay, checks the
transaction through Telegraph, and creates a receipt both people can verify.

**Real-world case**

A designer in Lagos charges a foreign client 250,000 NGN. The invoice link
shows the live USDC amount, when that quote expires, the wallet receiving it,
and the expected Base fee. After payment, both parties see a receipt with the
transaction hash and confirmed amount instead of arguing over screenshots.

**Telegraph's essential jobs**

- `CURRENCY_EXCHANGE`: convert NGN, USD, EUR, or another supported currency;
- `GAS_PRICE`: show the expected Base transaction cost;
- `ONCHAIN_TX_LOOKUP`: confirm the resulting transaction and produce evidence.

**Why it can become a product**

- freelancers and small merchants have a recurring invoicing problem;
- every shared invoice can bring a new user;
- invoice history, quote expiry, payment status, and receipts form a complete
  product rather than a one-button demo;
- Base and USDC are part of the user story, not decorative integrations.

**Main weakness**

The invoice category is crowded. One tested FX Miner did not support NGN, while
two others returned closely matching NGN rates. Some transaction Miners confirm
the transaction but do not decode USDC transfers; others do. The paid,
auto-routed Telegraph path must work before we promise automatic settlement
verification.

### Idea 3: ExitAlarm — early warning for DeFi depositors

**30-second explanation**

Choose a supported DeFi protocol. ExitAlarm watches the value deposited in the
protocol and its token price. If both fall sharply, it sends one clear warning
with the numbers so the user can investigate or withdraw.

**Real-world case**

A user has savings in an Aave market but does not watch crypto dashboards all
day. If Aave's TVL drops 18% and the token price drops 12% within the chosen
window, ExitAlarm sends: “Two stress signals changed; review your position.” It
does not claim the protocol is hacked or sell anything automatically.

**Telegraph's essential jobs**

- `TVL_LOOKUP`: how much value remains in the protocol;
- `CRYPTO_PRICE`: how the related token price is changing.

`NEWS_SEARCH` should not be required initially: direct probes returned weak or
failed results for an Aave query.

**Why it can become a product**

Watchlists, scheduled monitoring, alert history, and evidence pages all support
repeat use. A small curated protocol list avoids pretending every protocol name
maps automatically to a token contract.

**Main weakness**

It has more financial responsibility than TokenPulse. Alert wording and
thresholds must be cautious, transparent, and never presented as investment
advice.

### Idea 4: BaseReceipt — plain-language transaction support

**30-second explanation**

Paste a Base transaction hash. BaseReceipt explains whether it succeeded, what
tokens moved, who paid whom, and the fee, then creates a link you can send to a
customer or support agent.

**Real-world case**

A customer says, “I paid, but my order is still pending.” Instead of sending a
block-explorer screenshot neither party understands, they paste the hash and
share a receipt saying the transaction succeeded but sent USDC to a different
address.

**Telegraph's essential job**

- `ONCHAIN_TX_LOOKUP`: retrieve transaction status and effects.

A text-generation Intent can simplify the structured result later, but the
application should first format deterministic fields itself.

**Why it can become a product**

It is extremely easy to try and useful in support conversations. Saved cases,
notes, and public receipts make it more than a transaction decoder.

**Main weakness**

Block explorers already solve much of the problem, and one-off receipt checks
create less repeat usage than monitoring or invoicing.

## Honest Comparison Against Track 3

Ratings are research judgments from 1 to 5, not organizer scores. They are
ordered by the actual Track 3 priorities.

| Idea | Real-use potential (45%) | Usefulness and Telegraph depth (25%) | Shareability/X potential (25%) | Execution confidence (5%) | Overall reading |
|---|---:|---:|---:|---:|---|
| **TokenPulse** | 5 | 4 | 5 | 5 | Lowest friction and safest seven-day choice |
| **PayProof** | 5 | 5 | 4 | 3 | Best real-world/Base story; one technical proof gate remains |
| **ExitAlarm** | 4 | 4 | 4 | 4 | Strong recurring need, but higher financial-duty risk |
| **BaseReceipt** | 3 | 4 | 4 | 5 | Clearest utility, weaker repeat-use loop |

## What The Live Probes Actually Proved

These were direct calls to public Miner endpoints, not paid Telegraph Engine
requests. They prove only endpoint compatibility—not routing, payment, validator
consensus, or production reliability.

- A real Base DEGEN contract returned usable price and holder-count data from
  more than one listed provider.
- An invalid token input returned a useful validation error.
- Two FX providers returned approximately 1 USD = 1,338.83 NGN; another did not
  support NGN and failed cleanly.
- Two gas providers returned matching Base fee information. One response's
  prose incorrectly called the chain Ethereum while its structured data said
  Base, so the application must prefer structured fields.
- Several transaction providers confirmed the same recent Base transaction;
  only some decoded its USDC token transfers.
- An Aave TVL query succeeded, but two direct `NEWS_SEARCH` probes were unusable
  or failed.
- Lagos weather queries worked, but a nonsense place silently resolved to a
  real California location. Weather products need explicit location
  confirmation.

## Ideas Deliberately Deprioritized

- **Generic URL or wallet safety checker:** existing Telegraph projects already
  cover much of this area, and tested fraud results were inconsistent or
  chain-mismatched.
- **Generic content/deepfake checker:** official Telegraph use cases already
  cover media/text verification; relevant extra media Intents have only one or
  two Miners and are not in the official 40-Intent page.
- **Generic news brief or trading bot:** official use cases already include a
  news-to-trading agent, and current direct news probes were weak.
- **Outdoor event planner:** weather has excellent supply, but the product has a
  weaker connection to the hackathon's Base/payment story and location
  resolution needs another trusted step.
- **Automatic DeFi trading:** too much wallet, financial, and safety risk for a
  seven-day consumer product.

## Recommendation Before Building

Use this decision rule:

- Choose **TokenPulse** if the priority is zero friction, fast real-user growth,
  and the most reliable tested two-Intent combination.
- Choose **PayProof** if the priority is the strongest everyday problem and the
  deepest Base/USDC/Telegraph story—and only if a paid routed test proves that
  the app can verify the exact USDC transfer reliably.
- Choose **ExitAlarm** if the target users are already DeFi depositors and we
  are comfortable with careful financial-risk language.
- Choose **BaseReceipt** if we want the smallest possible useful product but can
  accept lower repeat usage.

My current product recommendation is to carry **TokenPulse and PayProof into one
short proof stage**, not to brainstorm more categories. Test one real routed
request chain for each, then select the one whose core promise survives. No UI
or application code should be built before that gate.

### Decision recorded on 2026-09-01

The participant selected **PayProof**. TokenPulse remains the documented
fallback if the paid routing test cannot reliably verify the exact USDC
transfer. This is a technical fallback, not an open ideation loop.

## Not Yet Done

- No paid Telegraph Engine call was made.
- No x402 wallet was funded or used.
- No final product was selected.
- No application code was started.
- No copied code from the reference repositories was added to the project.
