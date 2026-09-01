# Reality Research: Telegraph Protocol GitHub Account

## Scope

This research asks: **What code and documentation are publicly visible under `github.com/telegraphprotocol`, and how do those repositories relate to the Telegraph ecosystem?**

The scope covers the public account inventory, repository purposes, visible implementation boundaries, recent public activity, and cross-repository consistency. It does not attempt to audit private code or prove that documented protocol behavior is deployed.

## Sources Checked

- GitHub REST account and repository APIs for [`telegraphprotocol`](https://github.com/telegraphprotocol).
- GitHub GraphQL repository metadata, default-branch HEAD commits, languages, root trees, manifests, README files, detected licenses, and topics.
- Public repository files at the exact revisions recorded in [`repository-catalog.md`](./repository-catalog.md).
- Official protocol documentation in [`telegraph-docs`](https://github.com/telegraphprotocol/telegraph-docs).
- API surface documentation in [`telegraph-api-docs`](https://github.com/telegraphprotocol/telegraph-api-docs).
- Local shallow inspection of `telegraph-hackathon-submissions` and `tg-miner-integration` at their recorded commits.

## Verified Facts

### Account and inventory

- GitHub's REST API reports `telegraphprotocol` as account type **User**, not **Organization**. The account was created on 2024-12-17 and exposed 20 public repositories at the snapshot time. Source: [`GET /users/telegraphprotocol`](https://api.github.com/users/telegraphprotocol).
- All 20 visible repositories were owner repositories: none were API-marked forks and none were archived.
- The public repository profile had no repository descriptions and no repository topics populated for any of the 20 repositories in the GraphQL snapshot.
- Primary-language distribution was 13 TypeScript, 3 JavaScript, 2 Python, 1 Rust, and 1 HTML repository.
- GitHub detected a license for only three repositories: `telegraph-mcp`, `telegraph-wasm-baseline`, and `telegraph-skills`; all three were MIT. “No detected license” only describes visible GitHub metadata and does not establish the legal status of private code or external services.
- Eight repositories had a `pushed_at` timestamp on or after 2026-08-01. The account therefore showed active public work during August 2026, concentrated in hackathon submissions, miner integration, docs, website, WASM scoring, examples, use cases, and terminal code.

### The core implementation is not public

- No public repository named `Telegraph` appeared in the 20-repository inventory.
- The public [`telegraph-docs` README](https://github.com/telegraphprotocol/telegraph-docs/blob/09b12d921bb3c9fc4473484d61647c6289798335/README.md) lists `telegraphprotocol/Telegraph` as the “Protocol node source code” and explicitly labels it **private — request access**.
- Consequently, the public account does not expose the complete source needed to independently inspect the node's validator networking, BFT implementation, routing engine, epoch builder, TWAP settler, or production core-contract implementation. Public docs, OpenAPI descriptions, examples, and a WASM scoring module expose interfaces and selected components, not the full protocol implementation.

### Public repositories cover five observable layers

1. **Documentation and contracts of interaction**
   - [`telegraph-docs`](https://github.com/telegraphprotocol/telegraph-docs) is the source for the user-facing docs site and contains protocol, usage, miner, validator, scoring, deployment, and troubleshooting material.
   - [`telegraph-api-docs`](https://github.com/telegraphprotocol/telegraph-api-docs) contains five OpenAPI specifications plus prose for HTTP, WebSocket, internal bridge, and on-chain interfaces. Its README describes the miner dispatcher, Engine/Daemon, internal bridge, a deprecated Bittensor proxy, and Diamond facet operations.

2. **Agent and developer access**
   - [`telegraph-mcp`](https://github.com/telegraphprotocol/telegraph-mcp) is a TypeScript MCP server that exposes Telegraph tools and handles x402 payment signing locally.
   - [`telegraph-examples`](https://github.com/telegraphprotocol/telegraph-examples) contains end-to-end testnet examples for discovery, x402 calls, WebSockets, ERC-8183 jobs, on-chain verification, registration, bridging, and WASM scoring.
   - [`tg-terminal-frontend`](https://github.com/telegraphprotocol/tg-terminal-frontend) contains the Alexandria intelligence-terminal UI, including Engine subnet discovery, direct miner fields, chat, wallet state, x402 phases, and terminal receipts.

3. **Miner and scoring supply**
   - [`tg-miner-integration`](https://github.com/telegraphprotocol/tg-miner-integration) implements a miner/WASM onboarding interface with YAML creation/import, hashing, validation, IPFS upload, wallet connection, contract registration, and leaderboard views.
   - [`telegraph-chatbot`](https://github.com/telegraphprotocol/telegraph-chatbot) is a Python knowledge-assistant miner using a local RAG corpus and AWS Bedrock through LiteLLM.
   - [`telegraph-wasm-baseline`](https://github.com/telegraphprotocol/telegraph-wasm-baseline) describes itself as the production baseline scorer. It implements Rust/WASM semantic, BM25, cosine-similarity, and length signals. Its README explicitly says the native `cargo test` path currently conflicts with its unconditional panic handler.

4. **Products, onboarding, and demonstrations**
   - [`tg-website-frontend`](https://github.com/telegraphprotocol/tg-website-frontend) contains the main marketing site, marketplace, earn/media pages, and dashboard routes.
   - [`tg-website-backend`](https://github.com/telegraphprotocol/tg-website-backend) is a NestJS/TypeORM backend with authentication plus public/admin subnet controllers and a TaoStats service.
   - [`telegraph-guide`](https://github.com/telegraphprotocol/telegraph-guide) implements onboarding paths for becoming a miner, joining the hackathon, asking Alexandria, and building with Alexandria.
   - [`telegraph-usecases`](https://github.com/telegraphprotocol/telegraph-usecases) is a multi-application demonstration repository covering TruthWire, TrustFilter, ScholarGuard, ReviewRadar, a Polymarket bot, AdGuard, and SuperSignal.
   - Separate repositories also exist for TrustFilter, ReviewRadar, ScholarGuard, and the Polymarket bot.
   - [`telegraph-hackathon-submissions`](https://github.com/telegraphprotocol/telegraph-hackathon-submissions) is a wallet-aware submission portal. Its current code exposes Track 1 miner submissions and Track 2 WASM submissions, backed by Express, MongoDB, upload validation, admin routes, and a mention-checking service.

5. **Historical or embedded integration code**
   - [`telegraph-subnet`](https://github.com/telegraphprotocol/telegraph-subnet) contains Python Bittensor miner/validator directories and dependencies including Bittensor, Web3, TensorFlow, and scikit-learn. Its latest default-branch commit in the snapshot was from 2025-04-22.
   - [`Telegraph-Node-UI`](https://github.com/telegraphprotocol/Telegraph-Node-UI) is a Create React App dashboard whose latest default-branch commit was dated 2023-12-01.
   - [`telegraph-skills`](https://github.com/telegraphprotocol/telegraph-skills) is not a small Telegraph-only skill package. Its package name and README identify it as an OpenClaw codebase, while `skills/telegraph/` adds one Telegraph skill for Zeus weather and BitMind detection using testnet x402 scripts.

### Multiple generations of terminology and integration are visible

- `telegraph-api-docs` explicitly distinguishes a newer Engine/Daemon API from a deprecated Bittensor proxy. This is direct evidence of API evolution rather than a single uniform interface.
- Current miner-facing docs frame supply as any model, dataset, feed, or API, while older repositories and some current field names still use **subnet** and numeric Bittensor subnet IDs.
- `telegraph-guide` says “Supply intelligence, earn USDC per win” in [`src/lib/paths.ts`](https://github.com/telegraphprotocol/telegraph-guide/blob/472743a82b7b030e7617cefb70f6817d48203e77/src/lib/paths.ts), whereas current tokenomics and miner docs say agents pay USDC and miners receive MACHINA purchased with 98% of those payments. Sources: [`protocol/tokenomics.md`](https://github.com/telegraphprotocol/telegraph-docs/blob/09b12d921bb3c9fc4473484d61647c6289798335/protocol/tokenomics.md) and [`miners/miner-overview.md`](https://github.com/telegraphprotocol/telegraph-docs/blob/09b12d921bb3c9fc4473484d61647c6289798335/miners/miner-overview.md).
- Public examples and applications reference Base Sepolia, Solana Devnet, Polygon, direct IP/port endpoints, and newer path-prefixed node endpoints. These references belong to different public code generations and are not one uniform deployment configuration.

## Inferences

- The public repository set appears optimized for adoption and integration—docs, examples, onboarding, demos, MCP, and API contracts—while the security-critical protocol core remains controlled-access.
- `telegraph-docs`, `telegraph-api-docs`, `telegraph-examples`, `tg-miner-integration`, `telegraph-mcp`, and `telegraph-wasm-baseline` appear to be the most useful public repositories for understanding or integrating with the current protocol.
- `telegraph-subnet` and `Telegraph-Node-UI` appear to represent earlier product generations. Their exact relationship to the current Base/x402 architecture is not documented in their READMEs.
- The separate TrustFilter, ReviewRadar, ScholarGuard, and Polymarket repositories appear to overlap with applications later collected in `telegraph-usecases`. Whether the monorepo is a canonical replacement, a copy, or a deployment collection is not stated.
- `telegraph-skills` appears to be a copied or independently published OpenClaw tree with a Telegraph integration added. GitHub does not mark it as a fork, so its exact upstream relationship cannot be concluded from public metadata alone.

## Unknowns And Questions

- What commit, release, or deployment version of the private `Telegraph` node is running on the public testnet?
- Are the production Diamond contracts verified elsewhere, and do they match the interfaces described in public docs?
- Which repository is authoritative when `telegraph-docs`, `telegraph-api-docs`, examples, MCP configuration, and product UIs disagree?
- Which public repositories are actively supported versus retained for historical demonstrations?
- Is `telegraph-wasm-baseline` the exact WASM binary registered on the live testnet, and what hash identifies it on-chain?
- What is the intended license for the 17 public repositories with no GitHub-detected license?
- Is the GitHub User account temporary, or is migration to a GitHub Organization planned?
- What is the canonical mainnet/testnet endpoint matrix across Base, Solana, and Polygon references?

## Not Included

- No implementation plan, architecture proposal, or recommendations.
- No security audit, dependency audit, secret scan, or full build/test execution.
- No inspection of private repositories or non-public branches.
- No claim that documented tokenomics, consensus, or settlement behavior is deployed exactly as written.
- No evaluation of token value or investment merit.
