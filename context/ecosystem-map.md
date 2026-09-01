# Public Repository Ecosystem Map

This map describes observable relationships among the public repositories. The protocol core is shown as a visibility boundary because its repository is private.

## Request And Payment Path

```text
Human or autonomous agent
  |
  | enters through
  +-- telegraph-guide
  +-- tg-terminal-frontend (Alexandria)
  +-- telegraph-mcp
  +-- telegraph-examples
  +-- telegraph-usecases / standalone demo apps
  |
  v
Publicly documented API boundary
  +-- telegraph-docs
  +-- telegraph-api-docs
  |
  v
Private protocol implementation boundary
  +-- Engine / Daemon
  +-- miner dispatcher and routing
  +-- validator networking and BFT
  +-- epoch state and settlement
  +-- Diamond contract integration
  |
  +---------------------------+
  |                           |
  v                           v
Miner supply                  Verification supply
  +-- tg-miner-integration      +-- telegraph-wasm-baseline
  +-- telegraph-chatbot         +-- validator behavior documented
  +-- external APIs/models          in telegraph-docs/API docs
  +-- older telegraph-subnet
  |
  v
Signal, receipt, and payout returned through the protocol APIs
```

## Repository-To-Protocol Role Mapping

| Protocol concept | Public repositories that expose it | What is visible |
|---|---|---|
| Agent/client | `telegraph-mcp`, `telegraph-examples`, `tg-terminal-frontend`, `telegraph-usecases` | Request construction, wallet/payment flows, discovery, responses, and receipts |
| Miner/provider | `tg-miner-integration`, `telegraph-chatbot`, `telegraph-subnet` | YAML registration, example provider implementation, and older Bittensor miner code |
| Intent/schema | `telegraph-docs`, `telegraph-api-docs`, `tg-miner-integration`, `telegraph-examples` | Names, schemas, discovery APIs, YAML fields, and example registration |
| Scoring script | `telegraph-wasm-baseline`, `telegraph-docs`, `telegraph-examples` | A concrete Rust/WASM scorer, scorer documentation, and minimal examples/test hosts |
| Validator | `telegraph-docs`, `telegraph-api-docs`, `telegraph-examples` | Operational docs and interface-level behavior; core validator binary source is private |
| x402 payment | `telegraph-mcp`, `telegraph-examples`, `telegraph-api-docs`, `telegraph-usecases` | 402 challenge handling, signing, retries, settlement metadata, and demos |
| On-chain jobs/receipts | `telegraph-examples`, `telegraph-api-docs`, `telegraph-docs` | Callback examples, facet/interface prose, verification scripts, and documented contract addresses |
| Tokenomics/TWAP | `telegraph-docs`, `telegraph-api-docs` | Described economics and interfaces; full settler implementation is not public |
| Discovery/onboarding | `telegraph-guide`, `tg-miner-integration`, `tg-website-frontend` | Guided paths, registration UI, marketplace, earn pages, and dashboard |
| Hackathon operations | `telegraph-hackathon-submissions`, `telegraph-guide`, `telegraph-examples` | Submission tracks, onboarding linkages, and builder examples |

## Observable Repository Generations

### Earlier Bittensor/node generation

- `telegraph-subnet`
- `Telegraph-Node-UI`
- Bittensor-oriented names and numeric `subnet` identifiers retained in later APIs

### API marketplace and application generation

- `telegraph-usecases` and its standalone application repositories
- `tg-website-frontend` / `tg-website-backend`
- `tg-terminal-frontend`

### Current onboarding, validation, and agent-tooling generation

- `telegraph-docs`
- `tg-miner-integration`
- `telegraph-wasm-baseline`
- `telegraph-examples`
- `telegraph-mcp`
- `telegraph-guide`
- `telegraph-hackathon-submissions`

The groupings are temporal/functional inferences from commit history, naming, and current contents. They are not an official roadmap.

## Cross-Repository Drift To Remember

- **Miner payout wording:** `telegraph-guide` says miners earn USDC; current protocol docs say miner USDC revenue is converted into MACHINA before payout.
- **Provider naming:** newer docs use “miner” for any API/model/feed; several APIs and applications still expose “subnet” names and IDs.
- **Endpoint layout:** some examples and MCP configuration use separate node/Engine/Daemon ports or direct IP addresses; newer docs present path-prefixed services behind a node URL.
- **Payment networks:** public apps mention Base Sepolia, Solana Devnet, and Polygon. A network reference in one example should not automatically be treated as the canonical configuration for every component.
- **Duplicate applications:** TrustFilter, ReviewRadar, ScholarGuard, and Polymarket code appears both as standalone repositories and as concepts or directories in the `telegraph-usecases` collection. Public files do not state the canonical lineage.
- **Docs split:** `telegraph-docs` is the user/operator guide; `telegraph-api-docs` is the machine/API contract reference. They have different update histories and should not be assumed synchronized without checking both.

## Public Audit Boundary

The public repositories permit inspection of clients, examples, an MCP adapter, one concrete scorer, schemas, OpenAPI contracts, frontends, and selected miner code. They do **not** permit a complete source-level audit of the protocol's central security claims because the node repository is private.
