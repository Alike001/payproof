# PayProof Build Notes

## 2026-09-01 — Scope interview, round 1

### Decisions captured

- Selected product: PayProof.
- Core trust problem: a screenshot does not prove that the correct token,
  amount, recipient, chain, and successful transaction all match an invoice.
- Core value: familiar local-currency invoice plus USDC settlement and an
  independently checked receipt.
- Intended market: international freelancers, with Nigerian remote freelancers
  as the initial reachable cohort rather than an NGN-only permanent identity.
- Team: two people; Abu is primary implementer and merge reviewer.
- Tester recruitment: direct contacts, social media, and WhatsApp Status.
- No implementation has started.

### Active shaping

The participant described the product in their own words and emphasized that
the local-currency-to-USDC conversion is the emotional hook. They requested the
best-fit technology rather than imposing a familiar stack.

### Scope pressure

The phrase "any local currency" is a product vision, not yet an MVP promise.
Live Miner support and failure behavior vary by currency. The MVP must either
publish a tested currency set or show unsupported currencies honestly.

The stated 20-hour daily availability is not used as a planning assumption.
Payment verification needs rested review and focused testing.

## 2026-09-01 — Scope interview, round 2 and cut

### Accepted workflow decisions

- Freelancer connects a wallet to create and review invoices.
- Client creates no account and connects a wallet only to pay.
- Client pays inside PayProof rather than manually copying payment details.
- A quote lasts 15 minutes and refreshes after expiry.
- Receipt is a permanent shareable webpage; browser print/save covers PDF.
- Verified requires the correct chain, official token, recipient, exact amount,
  and successful status.
- A detected wrong payment becomes Mismatch rather than Verified.
- Initial currencies are NGN, USD, EUR, and GBP.

### Explicitly cut

- mainnet payments;
- additional chains and tokens;
- automatic email and WhatsApp delivery;
- recurring invoices;
- partial payments;
- escrow and dispute handling;
- tax calculation;
- team workspaces;
- currencies beyond the initial four;
- fiat on/off-ramp, accounting integrations, and custom mobile apps.

### Rationale

The participant asked for every cut feature to be explained in layman terms
before accepting the cut. After reviewing how each would work and why it would
expand risk or scope, they explicitly accepted the complete cut list.

### Deepening rounds

No optional deepening round was requested before writing the scope. The two
mandatory interview rounds produced enough detail for a focused document.

## 2026-09-01 — PRD interview and acceptance

### Accepted product behavior

- Public invoice links are unguessable but viewable by anyone who receives one;
  no email or phone number is displayed.
- Wrong chain, token, recipient, amount, or status remains unpaid and may be
  retried; no mismatched transaction receives a verified receipt.
- Published invoices are immutable. An unpaid invoice can be cancelled or
  duplicated; a verified invoice cannot be edited or cancelled.
- A transaction submitted within a valid quote remains tied to that quote even
  if confirmation occurs after expiry.
- Telegraph unavailability preserves the hash and permits honest retry.
- Due dates produce an Overdue label but do not block late payment.
- The same public link becomes the receipt after verification.
- Manual copy/native share is included; automatic delivery remains cut.
- Real-use analytics separate internal activity and do not inflate Miner volume.
- NGN, EUR, and GBP use live Telegraph conversion. The later technical review
  clarified that USD uses an honest nominal one-to-one test-USDC rule rather
  than purchasing a meaningless USD-to-USD quote.

### Deepening rounds

No optional PRD deepening round was requested. Three short mandatory decision
batches covered first use, privacy, payment failure, quote behavior, sharing,
due dates, and adoption evidence.

## 2026-09-01 — Technical specification interview

### Accepted technical direction

- One deployed Next.js/TypeScript application with Supabase and Vercel.
- RainbowKit/Wagmi/Viem for Base Sepolia wallet interaction.
- Public GitHub repository and pull-request workflow for the two-person team.
- Dedicated server-only testnet wallet for Telegraph x402 payments.
- Browser transfers official test USDC directly to the freelancer; PayProof has
  no custom contract and never holds funds.
- Supabase Sign in with Web3 protects creator actions; payers create no account.
- Direct proven Miners with one configurable primary and one backup: FX Rate
  Mirror/Preflight for FX and Truvian/INTERLOCK for transaction evidence.
- Five application tables: invoices, quotes, payments, Telegraph calls, and
  usage events.
- Exact integer/decimal money arithmetic and derived compound UI states.
- Zod boundary validation, Vitest rules tests, and Playwright browser journeys.

### Deepening round 1

The participant accepted all five proposed safeguards:

- per-call and daily x402 spend limits;
- cached/idempotent results and cooldown-controlled retries;
- raw Miner evidence kept server-side;
- invoice/session/network rate limiting and unique transaction hashes;
- environment-switchable proven Miners plus an honest historical-receipt demo
  fallback, never a mocked success.

### Research-driven shaping

- Current official docs support Next.js server-only Route Handlers, Supabase
  Ethereum `signInWithWeb3`, RainbowKit SSR, Wagmi contract writes, and the x402
  EVM fetch wrapper.
- An upstream x402 documentation snippet comments that chain `8453` is Base
  Sepolia even though `8453` is Base mainnet. The spec explicitly permits only
  `eip155:84532` and requires a regression test rejecting `8453`.
- Live Miner catalog shapes differ, so each Miner receives a dedicated adapter
  before normalization. A generic permissive parser is prohibited.

## 2026-09-01 — Build checklist preferences

### Planning and execution choices

- The participant delegated detailed sequencing to Codex: "use the best
  approach."
- Build mode is autonomous between milestone review gates rather than a pause
  after every small task.
- Four review gates are fixed: usable shell/auth, paid Telegraph proof, complete
  invoice-to-receipt journey, and production readiness.
- Git cadence is one focused commit per checklist item. The teammate works
  through short branches and pull requests; Abu reviews before merging.
- Comprehension is handled through plain-language milestone walkthroughs rather
  than interrupting every implementation step.

### Team shaping

The participant explicitly reminded the planning process not to forget the
second teammate. The checklist therefore gives the teammate ownership of
interface, responsive behavior, browser coverage, screenshots, and presentation
work, while Abu retains auth, database/RLS, x402, Miner normalization, exact
verification, deployment secrets, and shared contracts. This split is designed
to create parallel progress with minimal same-file conflict.

### Wow moment

Accepted submission focus:

> A client pays a local-currency invoice in test USDC, and the same link visibly
> transforms into a Telegraph-verified receipt—without trusting a screenshot.

### Deepening rounds

The participant chose delegated checklist design, so no optional checklist
deepening interview was run. The finished checklist itself is the gut-check
artifact before implementation begins.

## 2026-09-01 — Checklist item 1 implementation

### Delivered

- Initialized the local `main` Git repository and verified the authenticated
  GitHub account needed to publish it.
- Scaffolded Next.js 16.3.4 App Router, React 19, strict TypeScript, Tailwind 4,
  ESLint, Vitest, locked npm dependencies, GitHub Actions, and secret-safe
  environment handling.
- Added a repository `AGENTS.md`, project quality profile, setup README, and the
  accepted two-person PR/review workflow.
- Generated two PayProof visual concept boards before UI code, extracted the
  design system, and built a responsive landing shell with both required entry
  actions and an explicit Base Sepolia/test-USDC warning.
- Added desktop and mobile browser captures plus a fidelity ledger comparing the
  implementation to the concept direction.

### Verification evidence

- `npm run lint` passed with zero warnings.
- `npm run typecheck` passed in strict mode.
- `npm run test:run` passed.
- `npm run build` produced the static landing route successfully.
- Playwright inspection passed at `1435 × 1096` and `390 × 844`; no current
  browser-console errors remain and there is no horizontal overflow.
- The secret-pattern scan found no private key or live credential. The only
  64-byte hexadecimal match in project context is recorded public transaction
  evidence, not a secret.

### Team execution note

Codex implemented the initial shell centrally so the technical foundation did
not wait on branch coordination. The teammate workflow remains intact: future
UI/testing slices use short pull requests reviewed by Abu. No teammate
contribution or review is claimed for this first commit.

## 2026-09-01 — Checklist item 2 implementation

### Delivered

- Added exact minor-unit money helpers for NGN, USD, EUR, GBP, and six-decimal
  USDC using `bigint` plus Decimal.js with explicit half-up rounding.
- Added strict Zod boundaries for supported currencies, invoice inputs,
  environment variables, and normalized EIP-55 wallet addresses.
- Initialized Supabase with the five accepted tables, constraints, indexes,
  Row Level Security, immutable commercial/payment fields, and generated
  TypeScript database types.
- Added atomic database functions for idempotent Telegraph-spend reservation
  and payment finalization that requires a successful Telegraph call.
- Added cookie-aware browser/server clients and a server-only privileged client;
  no service credential is accepted by browser code.
- Bounded persisted integer amounts to JavaScript's safe-integer maximum so the
  generated PostgREST number types cannot silently lose money precision.

### Verification evidence

- The schema was recreated from migrations and seed data on the official
  Supabase Postgres `17.6.1.165` image.
- All 26 pgTAP schema, constraint, RLS, policy, and function checks passed.
- The database behavior suite proved owner isolation, blocked forged inserts,
  immutable invoice fields, spend-budget idempotency, budget rejection, and
  atomic Telegraph-backed payment finalization.
- Supabase database lint returned no schema errors, and regenerated TypeScript
  types exactly matched the tracked file.
- ESLint and strict TypeScript passed; 40 unit tests passed; the production
  Next.js build completed successfully; `git diff --check` found no defects.

### Team execution note

This security-sensitive foundation remains lead-owned. The teammate receives
the generated database types and public DTO contracts rather than editing RLS,
money arithmetic, privileged clients, or atomic functions directly.

## 2026-09-01 — Checklist item 3 implementation

### Delivered

- Configured Wagmi 2, RainbowKit 2, Viem, and TanStack Query for Base Sepolia
  only, including cookie storage and server-to-client hydration.
- Added browser-wallet connection and optional WalletConnect support without
  bundling RainbowKit's unused Coinbase/Solana connector path.
- Enabled Supabase Ethereum Web3 authentication and added a clear two-step UI:
  connect the wallet, then sign a free EIP-4361 message.
- Added cookie-aware session refresh in Next.js 16 `proxy.ts`, while keeping the
  authoritative creator check in server-only code and database RLS.
- Derived the receiving wallet only from Supabase's verified `web3` identity
  claims for Ethereum network `84532`. User-editable metadata and other networks
  are rejected.
- Added signed-out, connected, rejected-signature, authenticated, sign-out,
  wrong-network, and session/wallet-mismatch presentation states.

### Verification evidence

- 46 normal tests passed; the opt-in live Supabase authentication test passed
  with two newly generated throwaway wallets.
- The live test proved EIP-4361 identity issuance, owner invoice access, zero
  cross-wallet rows, and a blocked forged-owner insert.
- Browser verification passed connect, cancelled signature, successful free
  signature, refresh persistence, sign-out, and second-wallet sign-in.
- The server-rendered creator panel displayed the exact verified session wallet
  as the future recipient; the client does not submit an editable recipient.
- Desktop `1440 × 1000` and mobile `390 × 844` inspection found no horizontal
  overflow and no browser-console errors. Captures are stored in
  `design/renders/payproof-auth-desktop.png` and `payproof-auth-mobile.png`.
- ESLint, strict TypeScript, the production Next.js build, and high-severity
  production dependency audit passed. Compatible overrides pin patched Axios
  and WebSocket transitive releases; remaining audit findings are moderate
  upstream wallet-tree advisories with only breaking-major remediation offered.

### Team execution note

The lead owns the identity extraction, session guard, Supabase provider setting,
and wallet configuration. The teammate's review slice is the wording, 390px
wallet affordances, and authenticated/signed-out screenshots; no teammate review
is claimed until Abu routes this checkpoint through the agreed PR process.
