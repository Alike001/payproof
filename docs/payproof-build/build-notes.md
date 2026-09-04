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
- Team: two people; Ali is primary implementer and merge reviewer.
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
- A 2026-09-01 unpaid live challenge showed that the Telegraph HTTPS Engine
  reverse proxy advertises its same-host resource as internal HTTP and removes
  the `/engine` prefix. The x402 policy deliberately accepts only that exact
  same-host/path rewrite; the real request remains HTTPS and all other origin or
  path changes fail before signing.

## 2026-09-01 — Checklist item 4 implementation

- Added a server-only x402 v2 client using the official core and EVM packages,
  registered only for `eip155:84532`; automatic paid retries are intentionally
  not used so every challenge is inspected and reserved before signing.
- Added fixed direct-ask routing, strict challenge/network/asset/origin/amount
  checks, the hard 50,000-base-unit per-call cap, a configurable lower cap,
  timeout/cooldown helpers, settlement normalization, and persistence redaction.
- Hardened `reserve_telegraph_spend` so the same action and attempt role never
  receives a second signing reservation; primary and backup remain separately
  limited attempts. Daily spend remains serialized with an advisory lock.
- Verified 27 focused TypeScript tests, 30 PostgreSQL assertions, schema lint,
  the full 71-test application suite, production build, and zero x402/private
  key identifiers in browser assets. The unpaid live challenge was inspected;
  no signature or test-USDC payment was submitted.
- Production dependency audit has zero high or critical findings. The 22
  moderate findings are the already documented wallet-connector dependency
  family; no new x402 package finding was reported.

## 2026-09-01 — Build checklist preferences

### Planning and execution choices

- The participant delegated detailed sequencing to Codex: "use the best
  approach."
- Build mode is autonomous between milestone review gates rather than a pause
  after every small task.
- Four review gates are fixed: usable shell/auth, paid Telegraph proof, complete
  invoice-to-receipt journey, and production readiness.
- Git cadence is one focused commit per checklist item. The teammate works
  through short branches and pull requests; Ali reviews before merging.
- Comprehension is handled through plain-language milestone walkthroughs rather
  than interrupting every implementation step.

### Team shaping

The participant explicitly reminded the planning process not to forget the
second teammate. The checklist therefore gives the teammate ownership of
interface, responsive behavior, browser coverage, screenshots, and presentation
work, while Ali retains auth, database/RLS, x402, Miner normalization, exact
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
UI/testing slices use short pull requests reviewed by Ali. No teammate
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
is claimed until Ali routes this checkpoint through the agreed PR process.

## 2026-09-01 — Deliberate Telegraph devnet timeout adjustment

- The accepted specification originally limited each Miner request to 10
  seconds. A controlled paid FX Rate Mirror request passed the unpaid challenge,
  local spend reservation, and Telegraph-compatible EIP-3009 signing, but the
  paid Engine response did not arrive before that boundary.
- The call finalized locally as `paid_error`, stored no settlement transaction,
  and the dedicated wallet remained at exactly 20 test USDC. This is evidence of
  an unavailable request, not evidence of a paid or verified result.
- PayProof will allow 30 seconds per live Telegraph request for the hackathon
  devnet. This remains below the challenge's advertised 60-second maximum and
  does not change the fail-closed evidence rules, per-call cap, daily budget, or
  action idempotency.
- The paid smoke test itself receives a slightly larger test-runner deadline so
  the transport—not Vitest—owns the timeout decision. If the single controlled
  retry still fails, paid retries stop until the Telegraph team reviews the
  sanitized request shape and error.
- The controlled 30-second retry returned HTTP 402 after about 19.7 seconds with
  no response body or settlement proof. The dedicated wallet again remained at
  exactly 20 test USDC. Paid retries are therefore stopped pending organizer
  review; this checklist item and review gate 2 remain open.

## 2026-09-01 — Official x402 guide correction

- Telegraph's newly promoted integration guide explicitly warns that a
  malformed hand-built payment payload returns a bare HTTP 402 and instructs
  applications to use the standard `@x402/*` client.
- The earlier standard-library attempt had reached Miner endpoint validation;
  the bare 402 appeared only after the temporary custom payment envelope was
  added. The custom signer/encoder has therefore been removed before checklist
  item 5 is committed.
- PayProof again uses `x402HTTPClient.createPaymentPayload` and
  `encodePaymentSignatureHeader` with the registered Base Sepolia exact EVM
  scheme. Its independent pre-sign origin/asset/network/cap checks, atomic daily
  reservation, idempotency, redaction, and settlement validation are unchanged.
- No additional paid request was made for this correction. The focused and full
  local suites must pass before another organizer-directed live attempt.

## 2026-09-01 — Organizer resolution and safe retry boundary

- The Telegraph organizer reported that the server-side issue was resolved and
  asked PayProof to report it if it recurs.
- A single NGN FX Rate Mirror retry was started with the standard x402 client.
  The unpaid challenge completed, but PayProof stopped before creating a payment
  signature because the local Supabase admin configuration and atomic
  `reserve_telegraph_spend` ledger are not available yet.
- The result was `Unable to reserve the Telegraph spend safely.` No paid retry
  was submitted and no test USDC was intentionally spent. PayProof will not
  bypass the ledger; the next controlled attempt must follow database setup and
  migration verification.

## 2026-09-01 — Paid Miner spike after organizer resolution

- PR #8 was merged into `main`; teammate Task 03 was moved from `blocked` to
  `ready` with the accepted public-invoice DTO contract.
- The local Supabase stack already had migrations 001–004 applied. The pgTAP
  spend test was made independent of legitimate same-day live-call records by
  deleting those rows only inside its rollback transaction; all four spend
  assertions then passed without deleting the persisted evidence.
- Standard x402 calls succeeded for FX Rate Mirror NGN and GBP, Preflight NGN,
  Truvian Base Sepolia transaction lookup, and INTERLOCK Base Sepolia
  transaction lookup. Every successful call cost 10,000 Base Sepolia USDC base
  units, stored a settlement transaction, and passed its strict Miner adapter.
- Both transaction Miners returned chain 84532, successful mined evidence, and
  the expected known transaction with official-USDC transfer evidence. Neither
  RPC data nor a transaction hash alone was used to declare that result valid.
- FX Rate Mirror EUR reached the paid request but returned a bare HTTP 402 after
  about 20.5 seconds. It was stored as `paid_error` with no settlement
  transaction. Further paid retries stopped; checklist item 5 and review gate 2
  remain open until the organizer reviews this recurrence or EUR succeeds in a
  later controlled attempt.

## 2026-09-01 — Checklist item 5 adapter audit

- Compared the four strict Miner adapters with the accepted evidence rules
  before review gate 2. The FX adapters already rejected wrong pairs, stale
  observation times, non-decimal or non-positive rates, and incomplete primary
  source checks.
- Closed one fail-closed gap: FX Rate Mirror and Preflight now reject evidence
  whose declared confidence is below `0.8`, matching the accepted specification.
  Regression tests cover primary confidence `0.79` and backup confidence `0.5`.
- Focused adapter tests, ESLint, and strict TypeScript passed after the change.
  The remaining item 5 blocker is still the paid EUR FX Rate Mirror call; no
  additional paid request was made during this audit.

## 2026-09-01 — First public Track 3 progress update

- Published PayProof's first X progress update and tagged `@Telegraphprotoc`:
  <https://x.com/IamAlikeX/status/2094909102166094146>.
- The post accurately describes the testnet-only product, its four local
  currencies, Base Sepolia test USDC, Telegraph FX/on-chain intelligence, and
  the five successful paid x402 checks completed so far.
- Attached the current wallet-authentication product capture rather than a
  mocked receipt or an unfinished payment claim. Later updates will cover the
  working payment-to-verified-receipt moment and genuine tester usage.

## 2026-09-02 — EUR paid retry and checklist item 5 completion

- The Telegraph administrator reconfirmed that the x402 route was working and
  asked PayProof to retry. The retry selected only the parameterized EUR case;
  NGN, GBP, Preflight, Truvian, and INTERLOCK were explicitly skipped, so no
  duplicate smoke spend occurred.
- FX Rate Mirror `20260827` returned valid structured EUR/USD evidence in 7.37
  seconds. The strict pair, freshness, positive-decimal, source-check,
  confidence, Miner identity, and x402 settlement assertions all passed.
- The sanitized spend ledger finalized the call as `paid_success` on
  `eip155:84532` for `10000` test-USDC base units. Settlement transaction:
  `0x5bfa22d2ef2858967b0671b5cec716597d124eb63602d20215095b25c79fb225`.
- Across the required item 5 paths, six successful calls persisted six
  settlement transactions and charged `60000` base units (`0.06` test USDC):
  FX Rate Mirror NGN/EUR/GBP, Preflight NGN, Truvian transaction evidence, and
  INTERLOCK transaction evidence.
- The live worker's environment guard initially skipped twice without making a
  request. The successful run passed `.env.local` values and the ephemeral
  local Supabase service credential into one child process without printing or
  persisting secrets. The temporary boolean-only diagnostic was removed.

## 2026-09-02 — Review gate 2 accepted

- Ali accepted review gate 2 after reviewing the six paid x402 paths, Miner
  identities, normalized FX and transaction evidence, settlement costs,
  primary/backup behavior, and the honestly persisted earlier EUR failure.
- Checklist item 6 may now begin. The lead will establish authenticated invoice
  services and DTO/route contracts before assigning the teammate's UI
  integration branch, preserving the shared-file rule.

## 2026-09-02 — Deliberate invoice write-boundary correction

- Item 6 review found that the existing authenticated-role invoice
  `INSERT`/`UPDATE` grants could be called directly from a browser. The RLS
  policy proved the creator user ID but could not independently bind a supplied
  recipient address to the Web3 identity inspected by the application server.
- Publication and cancellation are therefore server-only writes after
  `requireCreatorSession()` derives both creator and recipient identity.
  Authenticated browsers retain owner-scoped RLS reads for history and
  duplication, while anonymous browsers retain no table-enumeration access.
- This intentionally tightens the accepted specification before the production
  route exists. It does not change product behavior; it removes a bypass around
  the promised receiving-address protection.

## 2026-09-02 — Item 6 lead foundation verified

- Added authenticated server-only publication and cancellation, owner-scoped
  history and duplication reads, sanitized public invoice lookup, and connected
  Route Handler/client boundaries. Creator and recipient identity are derived
  from the verified wallet session; strict request validation rejects forged
  fields before any write.
- A disposable local creator completed a real database publish → public read →
  cancel → repeated-cancel journey. The public DTO contained the expected EUR
  invoice data without the private creator user ID, and the fixture was deleted
  after verification.
- The built production server returned the unguessable public route with HTTP
  200 and the exact stored amount. Headless Chrome inspection passed at 1440px
  and 390px widths. Turbopack development compilation stalled on the first
  dynamic-route render in this environment, but the optimized production build
  compiled and rendered the same route correctly; this is recorded as a local
  development-tool observation, not hidden as a passing dev-server check.
- Final lead checks passed: database lint, 32 pgTAP assertions, 122 application
  tests with 8 opt-in tests skipped in the normal suite, strict typecheck,
  warning-free ESLint, and the Next.js production build. Item 6 remains open
  until the teammate supplies the required browser-journey and responsive QA
  evidence against these locked contracts.
- Added the Playwright browser-test baseline in a separate shared tooling slice.
  `npm run test:e2e` builds the production application, starts it on an isolated
  local port, and runs serial desktop/mobile projects. This Linux host crashes
  Chromium when Playwright launches it through a debugging pipe, so the reusable
  test helper starts system Chrome with an isolated disposable profile and uses
  Playwright's supported CDP connection. Both initial fail-closed public-route
  smoke tests pass, and the helper removes its profile after every run.

## 2026-09-02 — Checklist item 6 completion

- Merged teammate invoice-creator, public-invoice, interaction, and browser-
  journey work now covers the complete create, review, publish, share, public
  read, owner history, duplicate-prefill, cancellation, overdue, and responsive
  presentation required by item 6.
- The post-merge browser run exposed a test-cleanup regression after the quote UI
  began recording invoice-linked usage events. Cleanup now removes those child
  test events before deleting disposable invoices, and the journey has a
  60-second budget that includes fixture teardown.
- Removed only the failed run's two generated test users, six generated invoices,
  and two linked test usage events. No real user data or Telegraph settlement
  evidence was touched.
- Focused verification passed 35 invoice unit/UI tests, two real local-database
  service tests, and the complete public-invoice journey in desktop and mobile
  Chrome. The final project gate passed warning-free lint, strict TypeScript,
  171 normal tests with 23 opt-in tests skipped, and the optimized Next.js build.
- Item 6 is complete. Current Next.js 16 guidance confirmed that dynamic Route
  Handler parameters remain asynchronous and mutation handlers are uncached;
  current Supabase guidance reconfirmed that the privileged secret bypasses RLS
  and therefore remains confined to server-only owner-checked services.

## 2026-09-02 — Item 7 lead quote foundation

- Added a server-only quote service and strict `POST
  /api/invoices/{publicId}/quote` boundary. It accepts no caller-supplied money,
  Miner, or rate fields, rejects non-open invoices, and returns only sanitized
  exact-string DTOs.
- USD invoices use the declared nominal `1 USD = 1 test USDC` rule without a
  Telegraph request. NGN, EUR, and GBP call the validated primary/backup FX
  service, store the paid Telegraph call ID and sanitized Miner provenance, and
  calculate six-decimal test-USDC units with Decimal.js rather than JavaScript
  floating-point arithmetic.
- Current quotes are read through a privileged database function that casts
  bigint/numeric values to text before PostgREST serialization. Valid quotes are
  reused until the exclusive 15-minute boundary; the database-backed endpoint
  limit permits six requests per invoice and daily network hash each minute,
  while a ten-second paid-attempt cooldown prevents rapid repeated Miner spend.
- The browser boundary validates the complete success/error payload and fails
  closed on malformed responses. Raw network addresses are never persisted;
  the rate limiter receives only a daily rotating SHA-256 identifier.
- Local database integration proved exact USD creation and reuse, exact NGN
  conversion (`250000.00 NGN` to `160.307500` test USDC for the controlled
  `0.00064123` rate), Miner provenance, atomic seventh-request rejection,
  cooldown behavior, and cancelled-invoice rejection. Every disposable quote,
  usage event, invoice, Telegraph-call fixture, and auth user was removed.
- This foundation made no new paid Telegraph request and preserved the six
  successful item 5 settlement records. Item 7 remains open until the teammate
  supplies the quote presentation/countdown journey and a capped
  production-style quote is compared with its stored evidence.
- Final verification passed schema lint, all 36 pgTAP assertions, all five
  opt-in local quote-service integrations, 132 normal application tests with 13
  live/opt-in cases skipped, warning-free ESLint, strict TypeScript, and the
  optimized Next.js production build.

## 2026-09-02 — Checklist item 7 completion

- Merged teammate quote presentation now covers loading, exact source/rate and
  test-USDC display, accessible countdown, expiry, refresh, changed-quote
  review, unavailable/cooldown, USD parity, and payment-disabled states.
- Strengthened the production-server browser journey so every invoice quote
  request is intercepted during E2E runs. This prevents an overdue-invoice
  assertion from accidentally reaching the paid Telegraph route and proves
  expiry, changed-rate refresh, unavailable handling, retry, reuse, and the
  desktop/mobile layouts without testnet spend.
- Added a dedicated opt-in live quote-flow harness. Its Node parent loads the
  ignored local environment before Vitest enters `NODE_ENV=test`, so secrets
  remain private and the paid suite cannot silently skip because Next.js
  deliberately excludes `.env.local` in the test environment.
- One real NGN quote action used FX Rate Mirror `20260827` as primary. The
  structured rate was `0.00075`; `250,000.00 NGN` produced the exact integer
  amount `187500000` and display amount `187.500000` test USDC. The paid call
  cost `10000` Base Sepolia USDC base units and stored settlement transaction
  `0x33985cdeb5f07b27358405d791df9499efac3b531def3152e00620959f993fe5`.
- The live assertion exposed only a representation difference: PostgreSQL
  returned the same numeric rate padded to 18 decimal places. The harness now
  compares through the existing exact decimal normalizer; no second paid call
  was made. The temporary auth user, invoice, quote, and usage events were
  removed, while the sanitized paid-success settlement record remains.
- Final verification passed 24 focused quote/payment UI and real-database
  tests, the desktop/mobile production-server quote journey, warning-free lint,
  strict TypeScript, 171 normal tests with 24 opt-in tests skipped, and the
  optimized Next.js build. Item 7 is complete.

## 2026-09-02 — Item 8 lead payment-submission foundation

- Added the minimal ERC-20 `transfer(address,uint256)` ABI and a pure transfer
  request builder fixed to chain `84532` and official Base Sepolia test USDC.
  Recipient and exact bigint units come only from sanitized server-issued
  invoice/quote data; an expired quote or unsafe amount fails before the wallet
  request is built.
- Added the strict public payment-submission route and browser boundary. The
  only accepted post-broadcast fields are quote ID, complete transaction hash,
  and submitting wallet; caller-supplied token, chain, recipient, rate, or
  amount fields are rejected.
- Added a privileged atomic database submission function. It locks the invoice,
  checks quote ownership and the exclusive expiry boundary, normalizes the hash,
  returns an exact idempotent retry, rejects reuse across a different payment,
  and permits only one submitted/unavailable attempt per invoice. The browser
  has no direct write or function permission.
- Payment-submission abuse is limited to six valid-format attempts per invoice
  and daily network hash each minute. Rate-check events remain distinct from the
  single `payment_submitted` event, so invalid requests cannot be presented as
  successful adoption later.
- Added a Base Sepolia receipt client for readiness only. It can report pending,
  mined-success, mined-reverted, or RPC unavailable, but intentionally has no
  `verified` outcome and performs no Transfer interpretation; only normalized
  Telegraph evidence plus Item 9's exact verifier may finalize a receipt.
- Four opt-in local database integrations proved create/reuse idempotency,
  global transaction-hash protection, competing-payment rejection, exact quote
  expiry, atomic endpoint limiting, and cancelled-invoice rejection. All
  disposable users, invoices, quotes, payments, and usage events were removed.
- No wallet transaction was broadcast in this foundation slice. Item 8 remains
  open until the teammate connects the wallet UI and a small real Base Sepolia
  test-USDC transfer proves that its hash is persisted immediately after
  broadcast.
- Final foundation verification passed schema lint, all 40 pgTAP assertions,
  all four opt-in payment-service integrations, 144 normal application tests
  with 17 live/opt-in cases skipped, warning-free ESLint, strict TypeScript,
  and the optimized Next.js production build.

## 2026-09-02 — Item 9 lead verification and receipt foundation

- Added a pure exact verifier that requires matching chain `84532`, saved
  transaction hash, mined-success status, official Base Sepolia test USDC,
  invoice recipient, and exact integer quote amount. The matched Transfer
  event's `from` address—not the browser-supplied wallet—becomes the receipt
  payer.
- Added deterministic final classifications for wrong chain, hash, reverted
  transaction, missing transfer, wrong token, wrong recipient, and wrong
  amount. Not-found and pending evidence remain retryable rather than becoming
  false final mismatches; incomplete evidence throws and fails closed.
- Added the strict empty-body verification endpoint, complete browser response
  validation, six-per-minute database-backed endpoint limiting, 15-second paid
  action cooldown, and deterministic primary/backup action keys. A saved
  Verified or Mismatch result is returned without buying more intelligence.
- Base Sepolia RPC gates paid work only on mining readiness. A pending receipt
  makes no Telegraph call; a mined receipt still cannot determine the outcome.
  The existing strict Truvian/INTERLOCK orchestration supplies the only evidence
  passed into the exact verifier and never calls backup after valid primary
  evidence, including a valid mismatch.
- Strengthened atomic database finalization so the referenced paid-success
  Telegraph call must belong to the exact payment and invoice, while chain,
  official token, recipient, exact amount, status, normalized source, and
  observation time are checked again under row locks. Mismatch and unavailable
  results are recorded separately, and the final payment/invoice transition
  emits one deduplicated success event.
- Added a sanitized public payment/receipt DTO and attached the newest payment
  state to the existing public invoice read. Refreshing the same unguessable URL
  can therefore recover Submitted, Unavailable, Mismatch, or the permanent
  Verified receipt without reading raw Miner bodies.
- The local integration suite proved exact atomic finalization, a one-base-unit
  wrong-amount mismatch, database rejection of mismatched finalization inputs,
  pending-without-Telegraph behavior, honest Miner unavailability/cooldown,
  endpoint limiting, receipt reconstruction after refresh, and concurrent hash
  protection. Disposable verification fixtures were neutralized and removed;
  the six real item 5 paid-success records remain intact.
- No real wallet transfer or new paid Telegraph call was made in this slice.
  Item 9 remains open until the teammate completes the submitted/mismatch/
  unavailable/receipt views and the team proves one exact plus one wrong-amount
  Base Sepolia transaction through the live end-to-end path.
- The first browser-harness run exposed a Next.js dynamic-route collision:
  sibling API folders used `[invoiceId]` and `[publicId]` for the same URL
  position. All invoice mutation routes now share the internal `[invoiceRef]`
  folder name; external URLs and whether a handler expects the owner ID or
  public ID are unchanged. A clean cache rebuild and both desktop/mobile
  Playwright projects then passed. The displaced 346 MB stale `.next` cache was
  deleted after the successful rebuild; it contained generated output only.
- Final lead checks passed database lint, 48 pgTAP assertions, the transactional
  database behavior script, five payment-submission integrations, five
  verification integrations, 161 normal application tests with 23 live/opt-in
  cases skipped, warning-free ESLint, strict TypeScript, the clean optimized
  build, and two production-server browser projects. All disposable rows were
  removed and the six earlier real paid-success call records remain present.

## 2026-09-02 — Teammate receipt UI merge and visual QA

- Reviewed and merged teammate PR #15 for Submitted, Unavailable, Mismatch, and
  permanent Verified receipt presentation. Review fixes keep cancelled invoices
  terminal, update the page-level status immediately after verification, honor
  server-supplied verification cooldowns, show verification errors visibly,
  and prevent missing observed facts from appearing as successful matches.
- Regression coverage now proves the cancelled/payment precedence, live header
  transition, pending cooldown, missing-evidence comparison, receipt actions,
  and all four payment-result states. The merged GitHub quality, database, and
  secret-scanning checks passed.
- Captured six post-merge screenshots from disposable local database fixtures:
  desktop Verified, wrong-amount Mismatch, Verification unavailable, print,
  390px mobile Verified, and successful copy feedback. The browser reported no
  console errors or horizontal overflow, and every disposable invoice, quote,
  payment, Telegraph-call row, usage event, and auth user was removed.
- Attached the screenshots to PR #15 with an explicit fixture-only label. They
  demonstrate rendering and recovery UX only; they are not presented as real
  Base Sepolia, Telegraph Miner volume, or user-adoption evidence.
- Items 8 and 9 remain open. Completion still requires a small real Base
  Sepolia test-USDC transfer, immediate hash-persistence proof, one exact live
  Telegraph verification to Verified, one wrong-amount live Mismatch, explorer
  inspection, and Ali's Review Gate 3 walkthrough.

## 2026-09-02 — Live item 8 pre-sign inspection and wallet-choice regression

- Recorded the second public progress update:
  `https://x.com/IamAlikeX/status/2095262512153346204?s=20`.
- Ali created the real local NGN 50.00 invoice at public ID
  `2566f7c0-3833-4498-9b93-2a739e603d1e`. It remains Open with no payment
  record. The selected live quote requires exactly 37,520 official test-USDC
  base units (`0.037520` test USDC) and expires after 15 minutes.
- Rendered QA reproduced duplicate-looking browser-wallet buttons. Wagmi's
  default EIP-6963 discovery was adding installed providers beside PayProof's
  explicit generic injected connector. Disabled that redundant discovery;
  desktop QA now shows exactly one browser-wallet choice and one WalletConnect
  choice.
- The same QA run exposed two concurrent initial quote requests under React's
  development effect check. They produced separate primary and backup paid
  calls and two quote rows one millisecond apart. Added a component-level
  initial-request guard and prevented action-level/possibly-paid Telegraph
  transport failures from triggering a backup purchase. Valid/invalid Miner
  evidence and genuinely unpaid primary unavailability can still use backup.
- Regression coverage proves the initial quote is requested once under
  `StrictMode`, EIP-6963 discovery remains disabled, and an unsafe primary
  failure does not call backup. A fresh rendered visit reused the selected
  `0.037520` quote without adding any quote or Telegraph-call rows. No wallet
  was connected and no payment transaction was sent during inspection.
- Follow-up payer testing showed that RainbowKit's disconnected `ConnectButton`
  modal had no registered RainbowKit wallet definitions when fed PayProof's raw
  Wagmi connectors. The public payment panel now renders the same explicit
  **Connect browser wallet** and **WalletConnect** actions used by creator
  authentication, while RainbowKit remains responsible only for the connected
  account menu. This also avoids importing unrelated Base/Solana wallet code.
- Desktop Playwright QA confirmed one visible browser-wallet action, one visible
  WalletConnect action, and no empty dialog. Unit interaction coverage confirms
  the browser action receives the configured injected connector. The actual
  extension account chooser remains a user-authorized manual verification step;
  no wallet connection or payment was simulated.

## 2026-09-02 — Item 8 real Base Sepolia payment proof complete

- Ali personally reviewed and approved the prepared transfer before signing:
  quote `f7fec0c9-0cbd-4a02-bbd3-566a9530a5de`, Base Sepolia chain `84532`,
  official test-USDC contract `0x036CbD53842c5426634e7929541eC2318f3dCF7e`,
  recipient `0x67FEF9A8e7054b6d8c50453bA1A55d7812A54d12`, payer
  `0xdE67A35B322e5A31e8215B5245CA4e48d7977F71`, and exactly 37,500
  base units (`0.037500` test USDC).
- The real transaction
  `0xd98f74a8b79466bb541ccaa741e1697ab2be014d052f45b5a19a42e914122b56`
  was broadcast once. PayProof displayed **Transaction hash saved** and persisted
  the Submitted payment at `2026-09-02 22:37:44.472 UTC` before Telegraph
  finalized it at `2026-09-02 22:39:00.904924 UTC`; the 76-second separation is
  durable proof of immediate hash persistence before verification.
- Independent Base Sepolia JSON-RPC receipt inspection found successful status
  `0x1` and the official-USDC Transfer log from the exact payer to the exact
  recipient with data `0x927c` (37,500). No screenshot or wallet-returned claim
  was used to decide success.
- The paid `ONCHAIN_TX_LOOKUP` call used Truvian Exact On-Chain Truth Engine
  Miner `8453` as primary, cost 10,000 test-USDC base units, stored x402
  settlement transaction
  `0xdd77fe70a7879d0221b4e899fd60407b63a1cf1f7a5d8c71413e3c33e0b922ab`,
  and produced the normalized evidence consumed by exact local checks.
- A clean browser reopened the public invoice URL and recovered the permanent
  Telegraph Verified Receipt with the exact transaction hash, amount, payer,
  Miner provenance, and no console errors. The real evidence screenshot is
  saved outside the repository at
  `/home/ali/Desktop/payproof-live-verified-receipt.png`.
- Checklist item 8 is complete. Item 9 now has its required real exact-payment
  proof but remains open until a separate real wrong-amount transfer produces
  Mismatch and that hash is independently inspected.

## 2026-09-02 — Public invoice wallet reconnect regression

- Opening a public invoice after a previous wallet session could let Wagmi's
  default mount-time reconnect attempt invoke the remembered connector before
  the visitor clicked a wallet action. Public invoice links must remain passive,
  so the application provider now disables automatic reconnect on mount.
- A provider regression test asserts that `reconnectOnMount` remains disabled.
  The full quality check passed: warning-free lint, strict TypeScript, 184 unit
  and integration tests, and the optimized production build.
- Fresh rendered QA opened invoice `97ffb400-5cab-455c-be5b-558b19cd8a57`,
  waited through live quote loading, and found no browser dialog, wallet modal,
  console error, or failed request. The two explicit wallet choices appeared
  only as buttons awaiting a user click.
- Database timestamps are stored in UTC for consistent evidence. Nigeria uses
  WAT (UTC+1), while user-facing receipt times are formatted in the visitor's
  browser timezone; the one-hour display difference is expected.

## 2026-09-03 — Item 9 real wrong-amount rejection complete

- Ali deliberately sent transaction
  `0x950db3d257bcd3e084ccedd2659e80a45cd87e2f52ab2a795e224d712cf0f5af`
  on Base Sepolia to test the exact-payment guard. Independent JSON-RPC receipt
  inspection showed successful status, the official test-USDC contract, payer
  `0xdE67A35B322e5A31e8215B5245CA4e48d7977F71`, recipient
  `0x67FEF9A8e7054b6d8c50453bA1A55d7812A54d12`, and Transfer data `0x927b`
  (37,499 base units).
- PayProof saved payment `c7792ba5-afc8-4c17-83ef-01af35b36692` against the
  locked quote requiring 37,500 base units before starting verification.
  Truvian Exact On-Chain Truth Engine Miner `8453` returned normalized evidence;
  the exact verifier persisted terminal `WRONG_AMOUNT` Mismatch, left the invoice
  open for a correct retry, and did not issue a receipt.
- The paid `ONCHAIN_TX_LOOKUP` call was recorded as primary `paid_success` on
  `eip155:84532`, cost 10,000 test-USDC base units, and stored x402 settlement
  transaction
  `0x58ad4aa33120fb411decc680a03b1b52e1f2d71fcb825c96be18863d71b07660`.
- Fresh-browser QA recovered the mismatch from the same public URL, showed the
  expected `0.037500` versus observed `0.037499` comparison, displayed Miner and
  explorer provenance, issued no verified receipt, opened no wallet modal, and
  reported no console errors or failed requests. The evidence screenshot is
  saved outside the repository at
  `/home/ali/Desktop/payproof-live-wrong-amount-mismatch.png`.
- Item 9 is complete. Review Gate 3 is now active: Ali must review the exact and
  mismatch evidence plus the 30-second product story before item 10 begins.

## 2026-09-03 — Review Gate 3 mismatch-status correction

- Ali's review correctly identified that a terminal mismatched payment and an
  open invoice are separate facts. The invoice must remain payable, but showing
  only `Open` hid the most useful current status and conflicted with the accepted
  compound-state resolution.
- Public invoice headers and creator-history cards now surface `Payment
  Mismatch` / `Mismatch` while retaining the open invoice's retry and cancel
  capabilities. Creator history reads the latest payment state through the
  creator-scoped payments RLS policy; cancelled and verified invoice lifecycles
  still take precedence.
- The retry action now says `Retry with the exact payment` and explicitly warns
  that the earlier transfer was not reversed, is not combined toward settlement,
  and cannot be refunded by PayProof. This keeps the deliberately excluded
  partial-payment/refund behavior honest.
- Rendered Playwright QA used the real mismatched invoice at 1440x1000 and
  390x844. Both views showed the mismatch header and warning, omitted Awaiting
  Payment and Verified Receipt, opened no dialog, and reported no application
  console errors or failed requests. The first mobile pass exposed grid
  min-content overflow from the comparison table; constraining workspace grid
  children fixed it while preserving the table's local horizontal scrolling.
- `npm run check` passed with warning-free lint, strict TypeScript, 187 passing
  tests (24 live/opt-in tests skipped), and a successful optimized production
  build. Review Gate 3 remains open until Ali confirms the corrected real public
  invoice and creator dashboard presentation.

## 2026-09-03 — Review Gate 3 accepted

- Ali reviewed the real mismatch details, the corrected public status and retry
  warning, the creator-history state, and the permanent verified receipt, then
  explicitly accepted Review Gate 3.
- Checklist item 10 is now active. Lead work owns analytics integrity, abuse and
  operational controls, health reporting, redacted logs, and production-safety
  checks. Teammate issue #6 is released for browser, accessibility, responsive,
  and tester-handoff work that does not alter decision logic.

## 2026-09-03 — Item 10 lead hardening slice

- Migration `009_usage_analytics.sql` adds an explicit event allowlist for
  mismatch/unavailable outcomes, one-way deduplication keys, and source indexes.
  Browser view/share events use a 30-day HttpOnly analytics session, daily
  network hashes, one event per person/invoice/day, and a secondary 30/minute
  network-hash limit. Raw session and network values are never stored.
- Creator sign-in, invoice creation/cancellation, landing, invoice, receipt, and
  successful-share actions now emit best-effort evidence. Analytics rejection or
  downtime cannot break authentication, sharing, publication, or cancellation.
  The two wallets used for project-team payment testing are configured locally
  as internal; the diagnostic curl events were deleted, and the 25 prior local
  invoice events were honestly relabelled internal without changing payment,
  quote, Telegraph, or receipt evidence.
- A server-computed judging summary counts distinct creators, public viewers,
  payer wallets, invoices, quotes, attempts, outcomes, receipts, source classes,
  Telegraph intents, paid successes, and test-USDC spend. Only a signed-in wallet
  listed in `INTERNAL_TEST_WALLETS` can read it. The output explicitly sets
  `minerLeaderboardVolumeClaimed: false` because direct x402 Miner calls prove
  application integration but do not count as Miner leaderboard traffic.
- `GET /api/health` performs only free configuration, database, and Base Sepolia
  checks. A live local request returned HTTP 200 with all three dependencies
  ready and `Cache-Control: no-store`; no Telegraph request or payment occurred.
- Structured operational logs now contain allowlisted identifiers/outcomes and
  redact email, IPv4/IPv6, bearer, and private hexadecimal material. The global
  response baseline also sets nosniff, frame denial, strict referrer policy,
  restricted browser permissions, resource isolation, and wallet-compatible
  opener isolation. A source scan guards against production verification mocks
  and demo bypass flags.
- The local analytics integration test proved two identical events create one
  row and that the raw session value is absent. Database migration lint passed;
  a database privacy scan found zero malformed analytics hashes, zero contact or
  raw IPv4 values in usage metadata, and zero raw authorization, payment
  signature, or private-key fields in stored Telegraph request records.
  `npm run test:coverage` passed 201 tests (25 opt-in/live tests skipped),
  `npm run check` passed, and Playwright passed the available desktop/mobile
  invalid-link checks. The two environment-dependent journey tests remain
  skipped pending teammate issue #6, so checklist item 10 remains open.

## 2026-09-03 — Teammate PR #16 review correction

- Review found that the proposed browser suite rendered copied HTML with
  `page.setContent()` instead of exercising PayProof. It also embedded stale
  Miner labels and recovery wording, so those assertions could pass while the
  application was broken. The suite was replaced with real-route checks for the
  landing page, creator workspaces, invalid-link recovery, keyboard focus, and
  320px/390px/desktop overflow.
- Placeholder Supabase and analytics credentials were removed from Playwright
  configuration, and unrelated package-lock churn was restored to the reviewed
  main-branch versions. Local browser tests now use the developer's actual
  ignored environment rather than fake configuration fallbacks.
- Tester and demo instructions now match the real health response, free creator
  signature, exact 37,500-versus-37,499 mismatch evidence, current retry label,
  and measured coverage. The documentation no longer claims 100% coverage.
- The full real-route Playwright suite passed 10 tests across desktop and mobile.
  `npm run check` passed 201 tests with 25 opt-in/live tests skipped, and the
  optimized Next.js build succeeded. Coverage is 58.86% statements, 53.26%
  branches, 59.62% functions, and 60.56% lines. Local database lint reports no
  schema errors.
- Checklist item 10 remains open until the reviewed PR is merged. Deployment,
  production screenshots, and genuine external testing remain checklist item
  11 work and are not claimed by this PR.

## 2026-09-04 — Item 10 post-merge audit complete

- PR #16 was merged as `c98b15e`, and `main` was fast-forwarded before the
  checklist status changed. The merged branch passed warning-free lint, strict
  TypeScript, 201 tests with 25 opt-in/live tests skipped, and the optimized
  Next.js build.
- Coverage passed at 58.86% statements, 53.26% branches, 59.62% functions, and
  60.56% lines. Local database lint reported no schema errors.
- The first full Playwright audit exposed a startup-only timeout in the first
  external-Chrome test. The suite previously depended on Playwright's 30-second
  default while the external browser and development machine were cold. The
  real-route suite now gives each test a documented 60-second ceiling; the full
  desktop/mobile run then passed all 10 tests without retries.
- A real local `GET /api/health` returned HTTP 200 with `status`, `database`,
  `telegraphConfig`, and `baseSepolia` all `ready`, plus `Cache-Control:
  no-store` and the expected security headers. It made no paid Telegraph call.
- Combined failure proof now covers the real 37,500-versus-37,499 payment
  mismatch, wallet rejection with no stored transaction, unavailable/expired
  intelligence with payment paused, and invalid/cancelled/overdue public states.
  Item 10 is complete. Item 11 deployment and genuine external usage are now
  active; no production deployment or outside adoption is claimed yet.

## 2026-09-04 — Item 11 deployment preflight started

- Vercel CLI authentication is active for `alike001` under the
  `alike001s-projects` scope. The local repository is linked to the Vercel
  project `payproof`, and that project is connected explicitly to
  `https://github.com/Alike001/payproof.git` rather than the contributor fork.
- Vercel initially misidentified a researched FastAPI Miner nested under
  `research/reference-repos/` as the deployment service. The generated local
  `vercel.json` was removed before any deployment, and the remote project was
  corrected to the Next.js preset with repository root `.` and Node.js 24.x.
  No deployment or production environment variables exist yet.
- Supabase CLI authentication is not present, and `.env.local` still points to
  the local Supabase stack. Hosted project creation/linking, migration dry run,
  and migration push are therefore the next deployment dependency. Supabase
  login and the database password must be completed privately by Ali; neither
  credential may be pasted into chat or committed.
- GitHub Actions for item 10 commit `8605694` passed both the locked-dependency
  quality job and the from-zero database migration/type-generation job.

## 2026-09-04 — Hosted infrastructure configured

- The linked hosted Supabase project is active in `eu-west-1`. A reviewed dry
  run listed exactly migrations `001` through `009`, with no seeds, custom
  roles, or Vault secrets. All nine migrations were then applied; local and
  remote migration histories match, and remote schema lint reports no errors.
- Supabase Auth now uses `https://payproof-two.vercel.app` as its site URL,
  allowlists that production origin plus both local development origins, and
  enables Ethereum Web3 sign-in. The complete checked-in Auth configuration was
  pushed to the new project; no dashboard-only schema change was made.
- Vercel production configuration now contains every environment key required
  by `.env.example`. Hosted Supabase keys were transferred directly from the
  authenticated CLI and existing Telegraph/wallet settings from the ignored
  local environment; values were neither printed nor committed. Production
  variables use Vercel's sensitive default.
- The stable production domain is `https://payproof-two.vercel.app`. The GitHub
  repository is connected, but production deployment and smoke testing remain
  pending at this checkpoint.
