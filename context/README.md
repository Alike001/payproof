# Telegraph Protocol GitHub Context

This folder records the public GitHub reality of the Telegraph Protocol repository account as observed on **2026-08-31**.

The GitHub identity at [`telegraphprotocol`](https://github.com/telegraphprotocol) functions as the project's repository home, but GitHub's API reports it as a **User** account rather than an Organization object. It exposed 20 public repositories at the time of research.

## Start Here

- [`github-reality-research.md`](./github-reality-research.md) — facts, evidence, inferences, and unknowns.
- [`repository-catalog.md`](./repository-catalog.md) — all 20 public repositories, their observable roles, languages, licenses, and inspected revisions.
- [`ecosystem-map.md`](./ecosystem-map.md) — how the public repositories map onto agents, miners, scoring, validation, payments, and user-facing products.
- [`hackathon-season-i.md`](./hackathon-season-i.md) — Season I/H1 timeline, current tracks, judging, deliverables, and timing caveats.
- [`track-3-applications-and-live-miners.md`](./track-3-applications-and-live-miners.md) — Track 3 eligibility, a plain application model, and the timestamped live Miner/Intent snapshot used before ideation.
- [`track3-ideation-decision.md`](./track3-ideation-decision.md) — the initial capability comparison and provisional SignalGuard direction; superseded by the broader reverse-engineering result below.
- [`track3-open-source-reverse-engineering.md`](./track3-open-source-reverse-engineering.md) — prior projects, inspected implementation reality, the refined StormClause recommendation, and its real-world explanation.
- [`track3-post-research-plan.md`](./track3-post-research-plan.md) — decision gates and the seven-day plan; no implementation has started.
- [`track3-idea-shortlist.md`](./track3-idea-shortlist.md) — refreshed live-Miner evidence, low-friction product comparison, public endpoint probes, and the provisional Base token growth-monitor recommendation.
- [`track3-cross-ecosystem-idea-research.md`](./track3-cross-ecosystem-idea-research.md) — the latest cross-ecosystem winner/repository audit, reverse-engineered product patterns, fresh four-idea comparison, and decision recommendation.
- [`payproof-track3-decision.md`](./payproof-track3-decision.md) — the recorded PayProof selection, real-usage interpretation, meaningful adoption events, and remaining proof gates.
- [`payproof-base-sepolia-miner-compatibility.md`](./payproof-base-sepolia-miner-compatibility.md) — live Base Sepolia transaction, USDC-transfer, gas, FX, ranking, and routing compatibility results for PayProof.
- [`intent-brainstorm-catalog.md`](./intent-brainstorm-catalog.md) — all 40 official hackathon Intents in plain language, current Miner counts, problem areas, and the five live-only capabilities that need eligibility confirmation.
- [`telegraph-usecases.md`](./telegraph-usecases.md) — the official use-case repository, its application patterns, and how it relates to the hackathon tracks.
- [`source-log.md`](./source-log.md) — snapshot statistics, primary sources, and reproducible discovery commands.

## Fast Mental Model

The public repository set is strongest around the edges of the protocol:

```text
Users and autonomous agents
  -> guide / terminal / MCP / examples / use-case apps
  -> Telegraph Engine and node APIs
  -> miner APIs registered through YAML
  -> WASM scoring and validator consensus
  -> on-chain receipts and settlement
```

The implementation of the central node, consensus engine, and core contracts is not present in the public inventory. The public [`telegraph-docs` README](https://github.com/telegraphprotocol/telegraph-docs/blob/09b12d921bb3c9fc4473484d61647c6289798335/README.md) identifies `telegraphprotocol/Telegraph` as private and says access must be requested.

## Evidence Rule

Treat statements under **Verified Facts** as source-backed observations. Treat statements under **Inferences** as working interpretations, not confirmed design intent. Repository contents and live deployment details can change after the snapshot date.

The shallow research clones are indexed in
[`research/reference-repos/README.md`](../research/reference-repos/README.md).
