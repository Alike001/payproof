# Telegraph Protocol Public Repository Catalog

Snapshot date: **2026-08-31**. “No detected license” means GitHub returned no license object for the repository; it is not a legal conclusion. Dates and commits refer to the default branch HEAD observed during research.

| Repository | Observed role | Branch / commit | Commit date | Primary language | License |
|---|---|---:|---:|---|---|
| [`telegraph-hackathon-submissions`](https://github.com/telegraphprotocol/telegraph-hackathon-submissions) | Miner/WASM hackathon submission portal with automated checks and admin review | `main` / `60fe6cbe` | 2026-08-29 | TypeScript | No detected license |
| [`tg-miner-integration`](https://github.com/telegraphprotocol/tg-miner-integration) | Miner and WASM onboarding; YAML/IPFS/contract registration; dashboard and leaderboard | `master` / `80651ae9` | 2026-08-29 | TypeScript | No detected license |
| [`telegraph-docs`](https://github.com/telegraphprotocol/telegraph-docs) | User-facing protocol, agent, miner, validator, scoring, and deployment documentation | `main` / `09b12d92` | 2026-08-28 | TypeScript | No detected license |
| [`tg-website-frontend`](https://github.com/telegraphprotocol/tg-website-frontend) | Main website, marketplace, earn/media pages, and web dashboard | `main` / `6c1ed674` | 2026-08-24 | TypeScript | No detected license |
| [`telegraph-wasm-baseline`](https://github.com/telegraphprotocol/telegraph-wasm-baseline) | Rust/WASM answer-scoring baseline with embedded MiniLM/BM25 logic | `main` / `dfa0cf7f` | 2026-08-20 | Rust | MIT |
| [`telegraph-examples`](https://github.com/telegraphprotocol/telegraph-examples) | End-to-end testnet examples and small verification frontends | `master` / `facdb95e` | 2026-08-12 | TypeScript | No detected license |
| [`telegraph-usecases`](https://github.com/telegraphprotocol/telegraph-usecases) | Multi-app showcase of paid Telegraph inference use cases | `main` / `73beda92` | 2026-08-04 | TypeScript | No detected license |
| [`telegraph-guide`](https://github.com/telegraphprotocol/telegraph-guide) | Guided onboarding for miners, hackathon entrants, Alexandria users, and builders | `main` / `472743a8` | 2026-07-24 | TypeScript | No detected license |
| [`telegraph-mcp`](https://github.com/telegraphprotocol/telegraph-mcp) | MCP server wrapping miner, Engine, Daemon, Explorer, and x402 payment flows | `main` / `c2e5615f` | 2026-07-23 | TypeScript | MIT |
| [`telegraph-chatbot`](https://github.com/telegraphprotocol/telegraph-chatbot) | Telegraph knowledge-assistant miner using RAG, LiteLLM, and AWS Bedrock | `master` / `a310d135` | 2026-07-23 | Python | No detected license |
| [`telegraph-api-docs`](https://github.com/telegraphprotocol/telegraph-api-docs) | OpenAPI specs, Swagger UI, API prose, and on-chain interface documentation | `main` / `4d9f9714` | 2026-07-03 | HTML | No detected license |
| [`tg-terminal-frontend`](https://github.com/telegraphprotocol/tg-terminal-frontend) | Alexandria chat/intelligence terminal with wallet, Engine, miner, and receipt UIs | `main` / `6e189aae` | 2026-05-17 | TypeScript | No detected license |
| [`telegraph-trustfilter`](https://github.com/telegraphprotocol/telegraph-trustfilter) | Standalone TrustFilter application; overlaps the scam/phishing use case in `telegraph-usecases` | `main` / `21c6b606` | 2026-05-07 | JavaScript | No detected license |
| [`telegraph-reviewradar`](https://github.com/telegraphprotocol/telegraph-reviewradar) | Standalone ReviewRadar application; overlaps the review-authenticity use case | `main` / `512967de` | 2026-05-07 | TypeScript | No detected license |
| [`telegraph-scholarguard`](https://github.com/telegraphprotocol/telegraph-scholarguard) | Standalone ScholarGuard application; overlaps the academic-integrity use case | `main` / `124c8504` | 2026-05-07 | JavaScript | No detected license |
| [`telegraph-polymarket-bot`](https://github.com/telegraphprotocol/telegraph-polymarket-bot) | Standalone Polymarket/news/LLM demonstration app | `main` / `ea959c5b` | 2026-04-29 | TypeScript | No detected license |
| [`telegraph-skills`](https://github.com/telegraphprotocol/telegraph-skills) | OpenClaw codebase containing a Telegraph weather/deepfake x402 skill | `main` / `96b7e262` | 2026-03-20 | TypeScript | MIT |
| [`tg-website-backend`](https://github.com/telegraphprotocol/tg-website-backend) | NestJS/TypeORM site backend with auth, subnet administration, and TaoStats integration | `main` / `74e1226a` | 2026-02-05 | TypeScript | No detected license |
| [`telegraph-subnet`](https://github.com/telegraphprotocol/telegraph-subnet) | Earlier Bittensor-style Python miner/validator implementation | `main` / `84ee3ee7` | 2025-04-22 | Python | No detected license |
| [`Telegraph-Node-UI`](https://github.com/telegraphprotocol/Telegraph-Node-UI) | Earlier Create React App node/dashboard interface | `master` / `13018eca` | 2023-12-01 | JavaScript | No detected license |

## Repositories Not In The Public Inventory

| Repository reference | Public evidence |
|---|---|
| `telegraphprotocol/Telegraph` | `telegraph-docs` calls it the protocol node source and labels it private/request-access. It was not returned by the public repository APIs. |

## Interpretation Notes

- Roles are descriptions of observable files and README claims, not statements of production deployment status.
- Roles for standalone use-case apps are partly inferred from their names, directory structures, and the corresponding entries in `telegraph-usecases`; those standalone repositories have no root `README.md` at the inspected commits.
- `telegraph-skills` is API-marked as a non-fork repository, but its root README and package identify the codebase as OpenClaw. Only the `skills/telegraph/` subtree is specifically Telegraph-facing.
- The account contains both `main` and `master` default branches. Commit links should use the hashes above when reproducibility matters.
