# AGENTS.md

## Project Snapshot

PayProof is a testnet invoice product for Telegraph Hackathon Season I, Track 3.
A freelancer invoices in NGN, USD, EUR, or GBP; a client pays official test USDC
directly on Base Sepolia; Telegraph intelligence supplies the FX quote and checks
the payment before PayProof issues a verified receipt.

The seven-day MVP is testnet-only. It is not a custodian, exchange, escrow,
mainnet payment app, or screenshot verifier.

## Working Rules

- Follow `docs/payproof-build/checklist.md` in order and stop at its four review
  gates.
- Treat `scope.md`, `prd.md`, and `spec.md` as accepted product truth. Record a
  deliberate change before implementing behavior that conflicts with them.
- Keep money as decimal strings and integer minor/base units; never use native
  JavaScript floating-point for invoice or token arithmetic.
- A transaction hash, RPC response, or wallet submission alone cannot mark an
  invoice verified. Only normalized Telegraph evidence plus exact local checks
  may do so.
- Keep server secrets in server-only modules. Never expose or log private keys,
  raw payment authorizations, contact details, or full sensitive payloads.
- Use current official documentation through Context7 for libraries, SDKs, APIs,
  CLIs, and cloud services.

## Commands

- `npm run dev`
- `npm run lint`
- `npm run typecheck`
- `npm run test:run`
- `npm run build`
- `npm run check`

## Quality Gates

Before committing a checklist item, run all relevant tests and `npm run check`.
Inspect user-facing work at desktop and mobile widths. Keep TypeScript strict and
ESLint warning-free. Add a regression test for each fixed defect.

The detailed quality policy is in
`.thoughts/quality/2026-09-01-payproof-quality-profile.md`.

## Context Workflow

- Product documents: `docs/payproof-build/`
- Interface direction: `docs/payproof-build/design/`
- Telegraph research and live compatibility: `context/`
- Comparable-project research: `research/`

Read only the context relevant to the current checklist item. Add durable
findings to those folders instead of expanding this file.

## PR And Review Expectations

Abu is integration lead and reviews every teammate pull request before merge.
The teammate owns assigned UI and testing slices on short feature branches. Keep
one checklist item per commit, explain verification in the PR, and call out any
environment or migration change explicitly.

## Do Not

- Do not add mainnet, other chains/tokens, automatic messaging, recurring or
  partial invoices, escrow, disputes, tax, or teams to the MVP.
- Do not mock Telegraph or Base evidence in production paths.
- Do not claim direct Miner calls count toward Miner leaderboard volume.
- Do not copy source from researched repositories without a compatible license
  review and explicit attribution.
- Do not commit `.env.local`, private keys, wallets, generated test artifacts, or
  unrelated workspace changes.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
