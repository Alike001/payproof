# PayProof Build Checklist

Accepted planning basis: [`scope.md`](./scope.md), [`prd.md`](./prd.md), and
[`spec.md`](./spec.md).

## Build Preferences

- **Plan design:** Delegated to Codex using the accepted specification.
- **Build mode:** Autonomous between four explicit review gates. This locks when
  implementation begins.
- **Comprehension checks:** N/A during each atomic task; every review gate includes
  a plain-language walkthrough for the project lead.
- **Git:** One focused commit per completed checklist item. Teammate work uses a
  dedicated branch and pull request; Ali reviews its code and verification proof
  before merging to `main`.
- **Verification:** Required. No item completes from code inspection alone.
- **Check-in cadence:** Milestone-based: stop only at the four review gates, a
  genuine blocker requiring credentials/authority, or a failed safety check.
- **Time model:** Tasks are intended as focused implementation slices, generally
  15–30 minutes before verification. Live network, deployment, and tester waits
  may take longer without expanding scope.
- **No unhealthy-hours assumption:** The sequence protects review and testing
  time and does not require repeated 20-hour days.

## Team Split

### Ali — project lead

- Owns repository setup, dependency/security review, Supabase schema and RLS,
  wallet authentication, Telegraph/x402, Miner adapters, exact payment logic,
  deployment settings, and merges.
- Reviews every teammate pull request before merge.
- Owns shared files such as `package.json`, environment contracts, providers,
  generated database types, and API DTO contracts.

### Teammate — product interface and test contributor

- Owns landing/invoice/quote/payment/receipt presentation, responsive behavior,
  accessibility checks, browser-test additions, and submission screenshots.
- Works only from the accepted DTO/state contracts; does not handle service-role
  keys, x402 private keys, payment finalization, or RLS policy changes.
- Uses short branches such as `feat/public-invoice-ui` and
  `test/payment-journey`, with screenshots and test output in each pull request.

### Shared-file rule

The lead creates interfaces and server contracts first. The teammate consumes
them from client components. If a shared contract must change, the teammate
raises it in the pull request rather than editing security-sensitive code in
parallel.

## Review Gates

1. **Usable product shell:** after item 3 — landing, wallet sign-in, and creator
   access are understandable on desktop and mobile.
2. **Live intelligence proof:** after item 5 — a capped paid x402 call reaches
   each required primary/backup path and fails safely.
3. **Core wow moment:** after item 9 — one real Base Sepolia payment turns the
   public invoice link into a Telegraph-verified receipt.
4. **Production readiness:** after item 11 — deployed URL, genuine tester path,
   metrics, and demo recovery are reviewed before submission materials.

## Wow Moment

> A client pays a local-currency invoice in test USDC, and the same link visibly
> transforms into a Telegraph-verified receipt—without trusting a screenshot.

The build order protects this moment. Styling or secondary analytics cannot
delay the live quote, transfer, verification, and receipt path.

## Checklist

- [x] **1. [Lead + teammate] Establish the repository, quality gates, and product shell**
  Spec ref: `spec.md > Deployment And Collaboration`; `spec.md > File Structure`; `prd.md > Epic 1: Understand and enter the product`
  What to build: The lead initializes the public `payproof` Git repository at the workspace root, scaffolds the current stable Next.js App Router TypeScript application, installs and locks the accepted baseline dependencies, adds `.env.example`, secret-safe `.gitignore`, strict TypeScript, lint/typecheck/test/build scripts, GitHub Actions, and Vercel-ready configuration. The teammate adds the responsive landing shell, Base Sepolia warning, and the two primary actions using only local UI components. Preserve `context/`, `docs/`, and `research/`.
  Acceptance: A first-time visitor sees who PayProof is for, what it does, that funds are testnet-only, and the two actions **Create an invoice** and **View my invoices**. No secret is tracked, no existing research file is lost, and CI can reproduce a clean install.
  Verify: Run `npm ci`, `npm run lint`, `npm run typecheck`, `npm run test:run`, and `npm run build`; run a secret-pattern scan over tracked files; open the landing page at mobile and desktop widths; review the teammate PR before merging.

- [x] **2. [Lead] Build the exact money core and Supabase database contract**
  Spec ref: `spec.md > Database Design`; `spec.md > Money And Quote Rules`; `prd.md > Epic 3: Create and share an invoice`
  What to build: Initialize Supabase locally; add the five tables, constraints, indexes, RLS policies, atomic finalization/spend functions, generated TypeScript types, server/browser/admin clients, strict environment schema, supported-currency schema, address normalization, and Decimal.js minor-unit/USDC conversion helpers. Add fixtures and unit/integration tests before any page writes data.
  Acceptance: NGN, USD, EUR, and GBP inputs accept at most two decimal places; stored local values are integers; USDC values are six-decimal integer units; USD parity is exact; invalid/negative/zero/scientific-notation amounts fail; anonymous users cannot enumerate data; cross-wallet creator reads fail.
  Verify: Run `npx supabase db reset`, `npx supabase db lint`, generate types with the documented Supabase CLI command, run `npm run test:run -- tests/unit/money` and database/RLS integration tests, then run the full lint/typecheck suite.

- [x] **3. [Lead, teammate review] Prove wallet connection and creator Web3 authentication**
  Spec ref: `spec.md > Components And Responsibilities > Wallet identity`; `spec.md > Data Flow > 1. Creator authentication`; `prd.md > Epic 2: Identify the invoice creator`
  What to build: Configure RainbowKit/Wagmi/Viem for Base Sepolia only with SSR, connect the selected EIP-1193 provider to Supabase `signInWithWeb3`, add cookie-aware session handling and the server `require-creator` guard, derive the receiving address from the verified identity, and render connected/signed-out/error states. The teammate validates wording and mobile wallet affordances without changing auth code.
  Acceptance: Viewing a public invoice needs no login; creating or viewing history requires a free wallet signature; forged wallet fields cannot change creator or recipient; a different signed wallet cannot access another creator's dashboard; secrets remain server-only.
  Verify: Run auth unit/integration tests; manually connect, reject a signature, sign successfully, refresh, log out, and connect a second wallet; inspect the server response to confirm the creator address comes from the verified session; run lint/typecheck/build.

  **Review gate 1:** Pause and give Ali a plain-language walkthrough of the live shell, mobile layout, wallet connection, free sign-in signature, and creator protection. Record requested changes before continuing.

- [x] **4. [Lead] Implement the spend-safe Telegraph x402 transport**
  Spec ref: `spec.md > Telegraph Integration > Server-only x402 client`; `spec.md > Rate Limiting And Abuse Controls`; `spec.md > Security And Privacy`
  What to build: Add the Node-only Telegraph client, direct-ask envelope, x402 EVM signer restricted to `eip155:84532`, official-origin/asset allowlists, pre-sign challenge policy, per-call cap, atomic daily budget reservation, primary/backup action idempotency, timeout/cooldown helpers, settlement-proof capture, and redacted Telegraph-call persistence. Do not add a production mock or local fallback.
  Acceptance: The browser bundle contains no x402 key; chain `8453`, every non-84532 network, wrong asset/origin, calls over 0.05 test USDC, and exhausted daily budget fail before signing; retries cannot silently buy the same action twice; raw headers/signatures are never logged.
  Verify: Run unit tests for every challenge rejection and budget/idempotency branch; inspect the client bundle/environment exposure; make one deliberately unpaid challenge inspection; run `npm run test:run -- tests/unit/telegraph` plus lint/typecheck/build.

- [x] **5. [Lead] Build all Miner adapters and pass paid live intelligence spikes**
  Spec ref: `spec.md > Telegraph Integration > Configured Miner adapters`; `spec.md > Testing And Verification > Live smoke tests`; `prd.md > Epic 4: Obtain and understand a Telegraph-backed quote`; `prd.md > Epic 6: Verify payment with Telegraph`
  What to build: Implement separate strict Zod adapters for FX Rate Mirror `20260827`, Preflight `20260828`, Truvian `8453`, and INTERLOCK `9007`; normalize the two transaction formats into one evidence type; add primary/backup orchestration that falls back only on unavailable/invalid evidence; capture sanitized real fixtures; run capped paid Base Sepolia calls with the dedicated service wallet.
  Acceptance: NGN, EUR, and GBP rates validate as positive, correctly directed, fresh structured data; rounded prose is ignored; both transaction adapters identify chain/status and exact official-USDC Transfer events from the known test transaction; malformed or unsupported evidence returns unavailable; a valid mismatch never triggers outcome shopping through the backup.
  Verify: Run adapter fixture tests, opt-in live tests for all four Miners, a forced-primary failure test, and the 2026-09-01 known-transaction regression; confirm x402 settlement hashes/costs are stored and no call exceeds the cap.

  **Review gate 2:** Pause and show Ali the paid x402 proof, Miner identities, normalized FX/transaction evidence, costs, primary/backup behavior, and one honest failure. Do not proceed if the live transaction adapters cannot prove an exact Base Sepolia USDC transfer.

- [x] **6. [Lead + teammate] Deliver invoice creation, public links, history, sharing, cancellation, and duplication**
  Spec ref: `spec.md > Components And Responsibilities > Invoice service`; `spec.md > API Contracts > POST /api/invoices`; `prd.md > Epic 3: Create and share an invoice`; `prd.md > Epic 8: Manage creator history`
  What to build: The lead implements authenticated publication, immutable storage, sanitized public reads, owner history, cancel, and duplicate-prefill services/routes. The teammate builds the create/review form, public invoice detail, empty/history states, status badges, copy/native-share actions, privacy warning, overdue label, and responsive layouts against the accepted DTOs.
  Acceptance: A signed creator can publish and share an unguessable invoice in any supported currency; anyone with its link can view only public fields; creator history returns after reconnecting; published details cannot be edited; open invoices can be cancelled or duplicated; overdue remains payable; verified invoices cannot be cancelled.
  Verify: Run route/RLS/state tests and Playwright create→share→public-view tests; manually inspect mobile sharing and an unguessable URL; test forged creator/recipient fields and cross-wallet history; review and merge the teammate PR only after screenshots and checks pass.

- [x] **7. [Lead + teammate] Add locked quote creation and countdown behavior**
  Spec ref: `spec.md > Money And Quote Rules`; `spec.md > API Contracts > POST /api/invoices/{publicId}/quote`; `prd.md > Epic 4: Obtain and understand a Telegraph-backed quote`
  What to build: The lead implements valid-quote reuse, USD parity, paid FX primary/backup calls, exact Decimal.js conversion, provenance storage, 15-minute expiry, cooldown/rate limits, and safe quote DTOs. The teammate builds the quote card, source labels, exact USDC display, countdown, refresh review, loading, expired, and unavailable states.
  Acceptance: USD makes no fake FX call; NGN/EUR/GBP require a real valid Telegraph result; repeated views reuse a valid quote; expiry blocks payment until the new amount is reviewed; submission before expiry locks that quote beyond confirmation; stale/invalid/unavailable rates never enable payment.
  Verify: Run money/quote/adaptor/route tests with a fake clock; run Playwright quote reuse, expiry, refresh, and unavailable cases; make one capped production-style quote and compare stored rate, base units, timestamps, Miner, and x402 proof.

- [x] **8. [Lead + teammate] Send official Base Sepolia test USDC and persist the hash immediately**
  Spec ref: `spec.md > Payment And Verification > Payment request`; `spec.md > API Contracts > POST /api/invoices/{publicId}/payments`; `prd.md > Epic 5: Pay the invoice on Base Sepolia`
  What to build: The lead adds the minimal official-USDC ABI, payment-attempt schema/route, quote/invoice checks, transaction-hash uniqueness, idempotency, and readiness-only Base client. The teammate builds the payment panel, chain-switch prompt, test-fund guidance, wallet confirmation/pending/rejection/error states, and the sequence that stores the hash before waiting for a receipt.
  Acceptance: The wallet is asked to call only official Base Sepolia USDC `transfer` with the exact quote units and recipient; rejecting the wallet creates no payment; broadcasting stores one hash; duplicate submission reuses the record; the Pay button disables while submitted; PayProof never holds funds.
  Verify: Run ABI/route/idempotency tests; inspect a prepared transaction before signing; broadcast a small real test transfer and confirm the hash is stored before mining completes; refresh/close/reopen to confirm recovery; test wrong chain and rejected wallet paths.

- [x] **9. [Lead + teammate] Turn verified transaction evidence into the permanent receipt**
  Spec ref: `spec.md > Payment And Verification > Exact verifier`; `spec.md > Public State Resolution`; `prd.md > Epic 6: Verify payment with Telegraph`; `prd.md > Epic 7: Revisit and share the receipt`
  What to build: The lead implements mined-readiness handling, the pure exact verifier, stable result codes, paid primary/backup verification, atomic invoice/payment finalization, retry cooldown, concurrent-payment protection, and sanitized receipt DTO. The teammate builds submitted, mismatch, unavailable, cancelled, overdue, and verified views plus receipt provenance, explorer, share, and print presentation.
  Acceptance: Only chain 84532, official test USDC, exact recipient, exact integer amount, matching hash, and successful mined status produce Verified; payer comes from the matched Transfer event; pending/not-found stays retryable; every mismatch names the failed fact and permits a valid retry where appropriate; the same URL becomes locked receipt; no failure becomes success.
  Verify: Run the full verifier matrix, Miner-adapter fixtures, concurrency/finalization tests, Playwright state journeys, one real exact payment to Verified, and one wrong-amount payment to Mismatch; independently inspect both hashes on Base Sepolia explorer.

  **Review gate 3:** Pause and let Ali personally complete the 30-second story: create a local-currency invoice, open it as client, pay test USDC, and watch the same link become a Telegraph-verified receipt. Review the code diff, database evidence, x402 proof, and explorer transaction before continuing.

- [ ] **10. [Lead + teammate] Add honest analytics, abuse controls, and reliability coverage**
  Spec ref: `spec.md > Rate Limiting And Abuse Controls`; `spec.md > Error Strategy`; `spec.md > Components And Responsibilities > Usage and operational evidence`; `prd.md > Epic 9: Demonstrate genuine Track 3 usage`
  What to build: The lead implements allowlisted/deduplicated usage events, privacy-safe hashes, internal-wallet tagging, server-only judging aggregates, endpoint rate checks, health endpoint, structured redacted logs, security headers, and production mock exclusion. The teammate expands Playwright/accessibility/responsive coverage and improves empty/error/retry wording without changing decision logic.
  Acceptance: Reports distinguish creators, viewers, payer wallets, invoices, quotes, attempts, outcomes, receipts, internal traffic, and Telegraph calls; direct calls are not labelled Miner leaderboard volume; raw network addresses/contact details are absent; repeated refreshes do not become fake users; all defined failures have useful UI.
  Verify: Run analytics deduplication/privacy/rate-limit tests, scan database/log fixtures for prohibited secrets or raw network addresses, run `npm run test:coverage`, `npx playwright test`, lint/typecheck/build, and manually exercise health plus the three likely demo failures.

- [ ] **11. [Lead + teammate] Deploy, recruit genuine testers, and rehearse the production path**
  Spec ref: `spec.md > Deployment And Collaboration`; `spec.md > Demo And Submission Flow`; `prd.md > Submission Proof Points`
  What to build: Link the approved GitHub repository to Supabase and Vercel, apply migrations with a dry run first, configure server/client environment variables through provider dashboards, deploy the Node runtime, run live smoke tests, recruit freelancers/clients through direct contacts/social media/WhatsApp Status, capture consent-safe feedback and funnel evidence, fix only journey-blocking defects, and rehearse exact plus mismatch paths. The teammate captures responsive screenshots and tester-facing instructions.
  Acceptance: The public URL works from a clean mobile browser; at least one genuine external creator/payer journey is attempted and honestly recorded; the complete verified path works in production; internal activity is separate; service-wallet spend stays capped; prior real receipt and unavailable-state recovery are ready; the app remains live for judging.
  Verify: Run `npm ci`, all local checks, `npx supabase db push --dry-run`, reviewed migration push, Vercel production build, `/api/health`, opt-in paid smoke tests, clean-device Playwright/smoke path, explorer/x402 link checks, and a manual review of analytics versus actual tester sessions.

  **Review gate 4:** Pause for Ali's production approval. Review the deployed URL, tester feedback, real-user counts, known limitations, screenshots, receipt, repository cleanliness, spending balance, and outage demo before freezing the build.

- [ ] **12. [Lead + teammate] Prepare the Telegraph Track 3 submission handoff**
  Spec ref: `spec.md > Demo And Submission Flow > Evidence mapped to judging`; `prd.md > Submission Proof Points`
  What to build: Freeze feature work; prepare the concise product story, 30-second explanation, problem/solution, public app URL, public repository, setup instructions, architecture summary, supported testnet/currency limits, Telegraph Intents and Miner IDs, x402 and Base explorer evidence, screenshots, demo script/video assets, real-usage metrics, tester feedback, X progress links tagged `@Telegraphprotoc`, team roles, known limitations, and an explicit judging-criteria map. Re-run current portal/rule checks before final submission rather than relying on stale copied fields.
  Acceptance: A judge can understand PayProof in 30 seconds, open the product and source, reproduce the Base Sepolia flow, see how Telegraph controls the quote/receipt decisions, distinguish genuine adoption from internal tests, and verify every material claim from an artifact or link.
  Verify: Run the final clean-install CI suite and production smoke path; audit every submission claim against the live app/repository/database/chain evidence; have both teammates review the complete handoff; confirm no secret or mainnet instruction appears; submit only through the official Telegraph hackathon process after the lead's explicit approval.

## Definition Of Checklist Completion

The implementation stage is complete only when all twelve items have proof,
all four review gates have been accepted, no production mock exists, the core
real Telegraph path works on the deployed URL, and outside-use evidence is
reported honestly. A visually polished but unverifiable payment flow is not an
MVP.
