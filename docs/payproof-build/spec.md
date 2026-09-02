# PayProof Technical Specification

Accepted product source: [`prd.md`](./prd.md).

Specification date: **2026-09-01**.

## Overview

PayProof will be one deployed full-stack TypeScript application. The browser
handles presentation, wallet connection, and the client's direct test-USDC
transfer. Server-only code handles creator authorization, persistence,
Telegraph/x402 spending, Miner-response validation, payment classification, and
receipt issuance.

There is no PayProof smart contract and no custody. The client's wallet invokes
the existing USDC `transfer(address,uint256)` function on Base Sepolia, sending
test USDC directly to the freelancer's authenticated wallet.

The trusted verification decision is:

```text
invoice + locked quote + submitted transaction hash
  -> live Telegraph ONCHAIN_TX_LOOKUP Miner response
  -> Miner-specific schema validation and normalization
  -> exact deterministic comparison
  -> Verified | Mismatch | Verification unavailable
```

A normal Base RPC may be used to wait until a transaction is mined and avoid
paying Telegraph to inspect a still-pending hash. RPC data must never by itself
issue a PayProof verified receipt.

## Accepted Architecture Decisions

- Public production deployment on Vercel.
- Supabase Postgres and Supabase Auth for persistence and wallet identity.
- Next.js App Router with TypeScript for the web and server API.
- RainbowKit, Wagmi, and Viem for wallet connection and Base Sepolia contract
  interaction.
- A dedicated testnet-only server wallet pays Telegraph x402 fees.
- Direct, configurable Telegraph Miner selection because live probes established
  which Miners correctly handle Base Sepolia.
- Primary plus one backup Miner per intelligence action; never an unbounded
  fallback loop.
- No custom payment contract, queue, worker service, mobile application, or
  separate backend deployment.
- Five application tables, with compound display states derived rather than
  stored redundantly.
- One optional technical deepening round completed; all proposed spend, retry,
  privacy, abuse, and demo-recovery safeguards were accepted.

## Stack

### Application

- **Next.js 16 App Router + React + TypeScript** — pages, Server Components,
  Route Handlers, and the production server. Sensitive modules use
  `import 'server-only'`. Dynamic invoice and dashboard reads are not statically
  cached. Documentation: [Next.js App Router](https://nextjs.org/docs/app) and
  [Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers).
- **Tailwind CSS** — responsive styling with a small set of local reusable
  components. Avoid a large theme or animation dependency during the MVP.
  Documentation: [Tailwind CSS](https://tailwindcss.com/docs).
- **Zod 4** — strict schemas for forms, API inputs, environment variables,
  Telegraph envelopes, and each Miner adapter. Unknown external fields may be
  retained only in the server-only raw response, never trusted for decisions.
  Documentation: [Zod](https://zod.dev/).
- **Decimal.js** — exact string-based FX arithmetic and `ROUND_HALF_UP`
  conversion to six-decimal USDC base units. Native JavaScript floating-point
  values are forbidden for payment decisions. Documentation:
  [Decimal.js](https://mikemcl.github.io/decimal.js/).

### Wallet and chain

- **RainbowKit** — wallet selection UI. Configuration enables SSR and supports
  only Base Sepolia for this release. A Reown/WalletConnect project ID is a
  public client configuration value. Documentation:
  [RainbowKit installation](https://rainbowkit.com/docs/installation).
- **Wagmi** — React wallet/contract hooks and transaction lifecycle.
  Documentation: [Wagmi React](https://wagmi.sh/react/getting-started).
- **Viem** — addresses, ABI encoding, `bigint` token amounts, public-client
  receipt readiness, and the server x402 account. Documentation:
  [Viem](https://viem.sh/).
- **Official Base Sepolia USDC** — contract
  `0x036CbD53842c5426634e7929541eC2318f3dCF7e`, six decimals. Documentation:
  [Circle USDC contract addresses](https://developers.circle.com/stablecoins/usdc-contract-addresses).

### Data, identity, and hosting

- **Supabase Postgres** — five application tables, migrations, indexes, Row
  Level Security, and generated TypeScript database types. Documentation:
  [Supabase Database](https://supabase.com/docs/guides/database).
- **Supabase Auth Sign in with Web3** — Ethereum/SIWE login for invoice
  creators. The signed statement is bound to the PayProof origin; no gas or
  blockchain transaction is involved. Documentation:
  [Supabase Web3 authentication](https://supabase.com/docs/guides/auth/auth-web3).
- **`@supabase/ssr`** — cookie-based Next.js browser/server clients. Server code
  verifies the user rather than trusting a wallet address sent in a form.
  Documentation: [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/nextjs).
- **Vercel** — production URL, preview deployments, Node.js Route Handlers, and
  encrypted deployment environment variables. Documentation:
  [Vercel Next.js deployment](https://vercel.com/docs/frameworks/full-stack/nextjs).

### Telegraph and x402

- **Telegraph Engine direct ask** — `POST /engine/v1/ask/{miner_id}` with a
  direct envelope containing `method`, `endpoint`, and `payload`.
  Documentation:
  [Telegraph Engine OpenAPI](https://github.com/telegraphprotocol/telegraph-api-docs/blob/main/openapi/engine.yaml).
- **`@x402/fetch` + `@x402/evm`** — server-only automatic handling of the 402
  challenge and EIP-3009 test-USDC authorization. Registration is restricted to
  CAIP-2 network `eip155:84532`; `eip155:8453` is Base mainnet and must never be
  accepted by this build. Documentation:
  [x402 buyer quickstart](https://docs.x402.org/getting-started/quickstart-for-buyers)
  and [x402 repository](https://github.com/coinbase/x402).
- **Telegraph Miner catalog** — unpaid readiness metadata and endpoint schemas.
  Source: [live catalog](https://devnode.telegraphprotocol.com/api/miners).

### Quality

- **Vitest** — unit and server-service tests. Documentation:
  [Vitest](https://vitest.dev/guide/).
- **React Testing Library** — component behavior and accessibility-oriented
  queries. Documentation: [Testing Library](https://testing-library.com/docs/react-testing-library/intro/).
- **Playwright** — deployed browser smoke paths and responsive checks.
  Documentation: [Playwright](https://playwright.dev/docs/intro).
- **GitHub Actions** — lint, typecheck, unit tests, and production build on pull
  requests. Vercel supplies preview URLs. Documentation:
  [GitHub Actions](https://docs.github.com/actions).

Dependency versions will be installed from current stable releases and locked
in the package lockfile. Do not use floating CDN imports or canary releases.

## External APIs And Dependencies

| System | PayProof use | Trust rule |
|---|---|---|
| Telegraph Engine and Miner catalog | Paid direct FX/transaction intelligence and unpaid readiness metadata | Server only; strict origin, spend, envelope, and Miner-adapter validation |
| Base Sepolia JSON-RPC | Chain switch metadata and mined-receipt readiness | May delay a call but can never issue a verified receipt |
| Official Base Sepolia USDC | Direct client-to-freelancer ERC-20 transfer | Chain, contract, recipient, and integer amount are fixed by the server-issued quote |
| Supabase Auth and Postgres | Creator SIWE identity, persistent records, RLS, atomic finalization | Service secret remains server-only; public pages use sanitized DTOs |
| Reown/WalletConnect | Mobile and browser wallet transport used by RainbowKit | Project ID is public; no wallet private key reaches PayProof |
| Vercel | Public URL, Node Route Handlers, previews, and environment secrets | Production x402 routes must use Node runtime and server-only variables |

All URLs, contracts, request shapes, and documentation sources for these
dependencies are linked in the Stack section above. Telegraph-specific payloads
and failure semantics are defined under **Telegraph Integration**.

## Architecture

### Trust boundary

```text
Untrusted browser
  - form input
  - connected wallet address
  - public invoice identifier
  - submitted transaction hash
          |
          v HTTPS + strict Zod schemas
Trusted Next.js Node runtime
  - verified Supabase creator session
  - server-only database client
  - x402 signer and spending policy
  - Miner adapters and exact verifier
          |
          +--> Supabase Postgres
          +--> Telegraph Engine / paid Miners
          +--> Base Sepolia RPC for readiness only
```

No secret, service-role key, Telegraph raw response, or x402 signer is imported
from a Client Component. The build must fail if a server-only module crosses the
client boundary.

### Rendering model

- Landing and static explanatory content may be cached.
- Public invoice pages are dynamic because quote/payment state changes.
- Dashboard pages are dynamic and require a verified Supabase session.
- Mutations use Route Handlers and return typed JSON envelopes.
- Public pages receive sanitized data-transfer objects rather than database rows.
- Payment interaction is a Client Component embedded in the server-rendered
  invoice page.

### PRD-to-component map

| PRD epic | Primary technical components |
|---|---|
| Epic 1: Understand and enter | landing route, layout, testnet banner, navigation |
| Epic 2: Identify creator | wallet providers, Web3 sign-in, protected layout, auth service |
| Epic 3: Create and share | invoice form, invoice Route Handler, invoice service, share actions |
| Epic 4: Telegraph quote | quote endpoint, FX adapters, money module, quote table |
| Epic 5: Pay | payment panel, USDC ABI, Wagmi write/wait flow, payment-attempt endpoint |
| Epic 6: Verify | verification endpoint, transaction adapters, exact verifier, Telegraph call log |
| Epic 7: Receipt | public invoice route, receipt view, explorer/provenance formatter |
| Epic 8: Creator history | protected dashboard, owner queries, cancel/duplicate flows |
| Epic 9: Usage evidence | usage event recorder and server-only reporting query |

## Database Design

Supabase's built-in `auth.users` table stores authenticated creator identities.
The application adds exactly five tables.

### `invoices`

Purpose: immutable published commercial details plus minimal lifecycle fields.

Key fields:

```text
id                    uuid primary key
public_id             uuid unique, cryptographically random public URL key
creator_user_id       uuid -> auth.users.id
creator_wallet        text, normalized checksum address
freelancer_name       text
client_reference      text nullable
description           text
currency              text check in (NGN, USD, EUR, GBP)
amount_minor          bigint > 0
minor_unit_decimals   smallint fixed at 2
recipient_wallet      text, equal to authenticated creator wallet in MVP
due_date              date
lifecycle             text check in (open, cancelled, verified)
created_at            timestamptz
cancelled_at          timestamptz nullable
verified_at           timestamptz nullable
```

Rules:

- Publishing is immediate; there is no draft table.
- Published commercial fields never update.
- Duplicate pre-fills a new form and produces a new invoice/public ID only after
  creator confirmation.
- Overdue is computed as `due_date < current local date` while lifecycle is
  `open`; it is not stored.
- Only the authenticated creator can cancel an open invoice.

### `quotes`

Purpose: preserve the exact rate and USDC amount offered to a payer.

Key fields:

```text
id                    uuid primary key
invoice_id            uuid -> invoices.id
source_kind           text check in (telegraph_fx, usd_parity)
source_currency       text
target_currency       text fixed at USD
source_amount_minor   bigint
rate_decimal          numeric(38,18)
usdc_amount_units     bigint > 0
quoted_at             timestamptz
expires_at            timestamptz
telegraph_call_id     uuid nullable -> telegraph_calls.id
source_observed_at    timestamptz nullable
source_name           text
created_at            timestamptz
```

Rules:

- A current unexpired quote is reused.
- USD invoices use `source_kind=usd_parity`, rate `1`, and no fake Telegraph FX
  call.
- NGN, EUR, and GBP require a validated Telegraph FX response.
- Quote expiry is computed from `expires_at`; the quote row remains as evidence.
- The payment record permanently selects one quote, even if later quotes exist.

### `payments`

Purpose: one submitted on-chain transaction and its normalized classification.

Key fields:

```text
id                       uuid primary key
invoice_id               uuid -> invoices.id
quote_id                 uuid -> quotes.id
tx_hash                  text unique
submitted_by_wallet      text
verified_transfer_sender text nullable
state                    text check in
                         (submitted, unavailable, mismatch, verified)
mismatch_code            text nullable
mismatch_details         jsonb nullable, sanitized
observed_chain_id        bigint nullable
observed_token           text nullable
observed_recipient       text nullable
observed_amount_units    bigint nullable
observed_tx_status       text nullable
verification_call_id     uuid nullable -> telegraph_calls.id
submitted_at             timestamptz
last_checked_at          timestamptz nullable
verified_at              timestamptz nullable
```

Indexes and invariants:

- `tx_hash` is unique globally, case-normalized to lowercase.
- A partial unique index permits at most one `verified` payment per invoice.
- A payment's invoice and quote relationship cannot change after insertion.
- `verified_transfer_sender`, derived from the actual USDC Transfer event, is
  the payer shown on a receipt. The browser-provided wallet is diagnostic only.

### `telegraph_calls`

Purpose: operational evidence for every paid or rejected intelligence attempt.

Key fields:

```text
id                    uuid primary key
action_key            text
invoice_id            uuid nullable
quote_id              uuid nullable
payment_id            uuid nullable
intent                text check in (CURRENCY_EXCHANGE, ONCHAIN_TX_LOOKUP)
miner_id              text
miner_name            text
attempt_role          text check in (primary, backup)
status                text check in
                      (started, rejected_budget, paid_success,
                       paid_invalid, paid_error, unpaid_error)
request_sanitized     jsonb
response_raw          jsonb nullable, server-only
error_code            text nullable
error_message         text nullable, secret-scrubbed
x402_network          text nullable
x402_amount_units     bigint nullable
x402_transaction      text nullable
latency_ms            integer nullable
created_at            timestamptz
completed_at          timestamptz nullable
```

Rules:

- Raw responses have no public RLS policy.
- Private keys, payment signatures, cookies, and authorization headers are
  never stored.
- `action_key` and attempt role provide idempotency for concurrent retries.
- The daily spending calculation includes reserved/started paid attempts
  conservatively, even if settlement later fails.

### `usage_events`

Purpose: privacy-conscious product/adoption evidence and endpoint throttling.

Key fields:

```text
id                    uuid primary key
event_name            text from an allowlist
invoice_id            uuid nullable
creator_user_id       uuid nullable
actor_wallet_hash     text nullable
anonymous_session_hash text nullable
network_hash          text nullable
traffic_source        text check in (internal, recruited, organic, unknown)
metadata              jsonb sanitized and event-specific
occurred_at           timestamptz
```

Rules:

- Raw network addresses, email addresses, phone numbers, and wallet private
  data are not stored.
- Network hashes use a server secret plus a rotating date salt; they are for
  short-window abuse controls, not identity.
- Events are deduplicated where appropriate; page refreshes are not reported as
  new users.
- Internal team wallets/sessions are labelled through a server-side allowlist.

### Row Level Security

- Enable RLS on every application table.
- Authenticated creators may select their own invoice and quote/payment summary
  through owner-scoped policies or server queries.
- Authenticated browsers cannot insert or update invoice rows directly.
  Server-only publication and cancellation first verify the creator session,
  derive the authenticated user ID and Web3 wallet, then use the privileged
  database client with an explicit owner predicate. Creator-controlled fields
  cannot override these values.
- Direct browser access to `telegraph_calls` and `usage_events` is denied.
- Public invoice reads go through a server-only sanitized query by `public_id`;
  there is no anonymous broad-table SELECT policy.
- The Supabase service-role/secret key is used only in `server-only` modules.

## Money And Quote Rules

### Local amount representation

All four supported currencies use two minor-unit decimals in PayProof:

```text
NGN 250,000.00 -> amount_minor 25000000
USD 125.50     -> amount_minor 12550
EUR 80.00      -> amount_minor 8000
GBP 40.25      -> amount_minor 4025
```

The form accepts a decimal string and converts it once to an integer. Commas,
symbols, exponent notation, negative values, and more than two fractional digits
are rejected at the API boundary.

### FX computation

For NGN, EUR, and GBP:

```text
local_major = Decimal(amount_minor) / 100
usd_decimal = local_major * Decimal(validated_rate_string)
usdc_decimal = usd_decimal rounded to 6 places with ROUND_HALF_UP
usdc_amount_units = integer(usdc_decimal * 1_000_000)
```

For USD:

```text
usdc_amount_units = amount_minor * 10_000
source_kind = usd_parity
source_name = "Nominal 1 USD = 1 test USDC"
```

No JavaScript `number`, binary float, localized formatted string, or Miner prose
participates in these calculations.

### Valid FX response

The FX Rate Mirror primary response is accepted only if:

- `status` is `ok`;
- `pair` matches the requested source currency and USD direction;
- `rate` is a positive, finite decimal string;
- `stale` is false when supplied;
- `confidence >= 0.8` when supplied;
- `as_of` is parseable and within the configured maximum source age;
- the calculated base-unit result is positive and within a `bigint`-safe,
  configured application bound.

Preflight backup has its own strict adapter. A response is never accepted by
relabeling a primary-Miner schema as the backup schema.

Every successful quote lasts exactly 15 minutes from PayProof's `quoted_at`.
The upstream `as_of` remains separately visible on the final receipt.

## Telegraph Integration

### Server-only x402 client

`src/lib/telegraph/x402-client.server.ts`:

1. Loads a dedicated testnet private key from `TELEGRAPH_EVM_PRIVATE_KEY`.
2. Converts it to a Viem account.
3. registers the exact EVM x402 scheme only for `eip155:84532`.
4. Allows calls only to the configured Telegraph HTTPS origin.
5. Uses the x402 HTTP client's payment-required hook to inspect the actual
   challenge that would be signed.
6. Parses and validates the required network, asset, and amount.
7. Atomically reserves the amount against the daily budget before signing.
8. Rejects any single challenge above `50,000` test-USDC base units (`$0.05`).
9. Allows the wrapper to authorize and retry only after policy approval. If the
   installed SDK cannot enforce a pre-sign hook, use an explicit challenge and
   retry flow and require the signed requirements to equal the inspected ones.
10. Captures the settlement `PAYMENT-RESPONSE` information and never logs the
    payment signature.

Default spend controls:

```text
maximum per call: 0.05 test USDC
maximum attempts per action: 2 (primary + backup)
daily service-wallet budget: 5.00 test USDC, deployment-configurable
```

If challenge parsing or budget reservation is uncertain, fail before signing.

### Direct-call envelope

Every selected Miner is called through:

```http
POST {TELEGRAPH_NODE_URL}/engine/v1/ask/{miner_id}
Content-Type: application/json

{
  "method": "GET | POST",
  "endpoint": "/miner-specific-path",
  "payload": {}
}
```

The Engine response envelope and the nested Miner result are validated
separately. HTTP 200 is not evidence that the nested result is usable.

### Configured Miner adapters

#### FX primary — FX Rate Mirror

```text
miner ID: 20260827
intent: CURRENCY_EXCHANGE
method: GET
endpoint: /rate?from={ISO_CODE}&to=USD
trusted fields: status, pair, rate, as_of, stale, confidence, source
```

#### FX backup — Preflight

```text
miner ID: 20260828
intent: CURRENCY_EXCHANGE
method: GET
endpoint: /fx-rate?pair={ISO_CODE}%2FUSD
trusted fields: validated adapter output only
```

#### Transaction primary — Truvian

```text
miner ID: 8453
intent: ONCHAIN_TX_LOOKUP
method: GET
endpoint: /tx?hash={TX_HASH}&chain=base-sepolia
required normalized output: chain, hash, lifecycle/status, ERC-20 transfers,
                            observation timestamp, provenance
```

#### Transaction backup — INTERLOCK

```text
miner ID: 9007
intent: ONCHAIN_TX_LOOKUP
method: POST
endpoint: /miner/onchain-tx-lookup
payload: { "chainId": 84532, "txHash": "0x..." }
required normalized output: chainId, txHash, exists, lifecycle, status,
                            transfers, observedAt, evidenceScope
```

Miner IDs and node origin are environment-controlled so a proven backup can be
promoted without a code change. Endpoint method and normalization code remain
version-controlled; arbitrary endpoint strings are never accepted from users.

### Primary/backup algorithm

```text
return saved valid result if one exists
enforce cooldown and action idempotency
call primary once
if transport, timeout, malformed, stale, or semantically invalid:
    call backup once
if backup validates:
    use backup
else:
    return unavailable
```

A valid mismatch from a transaction Miner is a successful intelligence result,
not a reason to call the backup looking for a preferred answer. Backup is for
unavailable or invalid evidence, not outcome shopping.

### Timeouts and retries

- Per-Miner timeout: 30 seconds on the Telegraph hackathon devnet.
- Overall primary-plus-backup budget: 65 seconds.
- No library-level blind retry after a possibly paid request.
- Quote retry cooldown: 10 seconds when no valid quote exists.
- Verification retry cooldown: 15 seconds after `unavailable`.
- Verified and mismatch results are returned from storage without another paid
  call.
- A current quote is returned from storage without another paid call.

## Payment And Verification

### Payment request

The browser uses Wagmi `useWriteContract` with the minimal ERC-20 ABI:

```text
function transfer(address to, uint256 amount) returns (bool)
```

Required parameters come only from the selected server-issued quote and invoice
DTO:

```text
chainId: 84532
contract: official Base Sepolia USDC
to: invoice recipient
amount: quote.usdc_amount_units as bigint
```

Before writing, the UI requests a switch to Base Sepolia when required. User
rejection does not create a payment record. After the wallet returns a hash, the
browser immediately stores it through the payment-attempt endpoint before
waiting for confirmation.

### Normalized transaction evidence

Both transaction Miner adapters output one internal type:

```text
NormalizedTransactionEvidence
  minerId
  minerName
  chainId
  txHash
  exists
  lifecycle: not_found | pending | mined
  status: pending | success | reverted | not_found
  transfers[]
    tokenAddress
    from
    to
    amountUnits
    standard
  observedAt
  source
```

Missing required facts produce an invalid Miner response, not default values.

### Exact verifier

`verifyInvoicePayment()` is a pure function. It returns a discriminated union:

```text
{ outcome: "verified", matchedTransfer, evidence }
{ outcome: "mismatch", code, expected, observed, evidence }
{ outcome: "unavailable", code }
```

Verification requires:

```text
evidence.chainId == 84532
evidence.txHash == submitted tx hash
evidence.exists == true
evidence.lifecycle == mined
evidence.status == success
there is an ERC-20 Transfer where:
  tokenAddress == official Base Sepolia USDC
  to == invoice.recipient_wallet
  amountUnits == quote.usdc_amount_units
```

Addresses and hashes compare in normalized form. Amounts compare as integers.
The actual matching Transfer event's `from` becomes the receipt payer.

Stable verification result/error codes:

```text
WRONG_CHAIN
WRONG_TRANSACTION_HASH
TRANSACTION_NOT_FOUND
TRANSACTION_PENDING
TRANSACTION_REVERTED
USDC_TRANSFER_NOT_FOUND
WRONG_TOKEN
WRONG_RECIPIENT
WRONG_AMOUNT
INVOICE_ALREADY_VERIFIED
TRANSACTION_ALREADY_USED
```

`TRANSACTION_PENDING` keeps the payment in `submitted`; it is not presented as
a final mismatch. `TRANSACTION_NOT_FOUND` remains retryable because Miner/RPC
indexing can lag. Transport, schema, provenance, or missing-evidence failures
produce `unavailable` codes and preserve retry eligibility.

### Concurrency and double payment

- Persist transaction hash before paid verification.
- Use the unique hash index to make repeat submission idempotent.
- Finalize payment and invoice lifecycle in one database transaction.
- Lock the invoice row during finalization.
- If another payment already verified the invoice, keep the later attempt as
  non-receipted and return `INVOICE_ALREADY_VERIFIED`.
- Once verified, clients refreshing the invoice receive the receipt state and no
  Pay button.
- Unsolicited transfers are not discovered or assigned automatically.

## API Contracts

All JSON mutation endpoints return:

```json
{
  "data": {},
  "requestId": "uuid"
}
```

or:

```json
{
  "error": {
    "code": "STABLE_MACHINE_CODE",
    "message": "Safe user-facing explanation",
    "retryable": false
  },
  "requestId": "uuid"
}
```

Raw exception messages and upstream bodies never pass through to the browser.

### `POST /api/invoices`

Auth: verified creator session.

Input:

```json
{
  "freelancerName": "Ada Studio",
  "clientReference": "Launch photos",
  "description": "Event photography",
  "currency": "NGN",
  "amount": "250000.00",
  "dueDate": "2026-09-05"
}
```

The server derives creator and recipient wallets from the authenticated Web3
identity. Output contains the sanitized invoice and public URL.

### `POST /api/invoices/{publicId}/quote`

Auth: public link possession; rate-limited.

Input: empty JSON object.

Behavior: returns a current saved quote, creates USD parity, or pays for a live
Telegraph FX primary/backup call. Cancelled and verified invoices reject new
quotes.

Output includes quote ID, local amount, rate, exact formatted USDC, base-unit
string, quote/source timestamps, expiry, and sanitized Miner provenance.

### `POST /api/invoices/{publicId}/payments`

Auth: public link possession; rate-limited.

Input:

```json
{
  "quoteId": "uuid",
  "txHash": "0x64-hex-characters",
  "submittedByWallet": "0xaddress"
}
```

Behavior: validates invoice/quote relationship and quote validity at the client
submission time, inserts idempotently by transaction hash, and returns payment
ID/state. It does not claim verification.

### `POST /api/invoices/{publicId}/payments/{paymentId}/verify`

Auth: public link possession; rate-limited and cooldown-protected.

Input: empty JSON object.

Behavior: returns saved final result, checks mining readiness, or makes one
primary plus one eligible backup Telegraph call. Finalization is transactional.

Output is a public payment-result DTO with expected/observed safe fields,
mismatch reason, retry timing, and sanitized provenance.

### `POST /api/invoices/{invoiceId}/cancel`

Auth: verified owner session.

Behavior: cancels only an open, unverified invoice. Idempotently returns an
already-cancelled invoice; rejects verified invoices.

### Creator dashboard reads

The dashboard uses authenticated server queries rather than a public list API.
Pagination is cursor-based by `created_at,id`; the initial page may contain up
to 25 invoices.

### Operational endpoint

`GET /api/health` returns only non-secret readiness flags:

```json
{
  "status": "ready|degraded",
  "database": "ready|unavailable",
  "telegraphConfig": "ready|unavailable",
  "baseSepolia": "ready|unavailable",
  "timestamp": "ISO-8601"
}
```

It performs no paid Telegraph call.

## Components And Responsibilities

### Landing and application shell

Implements: `prd.md > Epic 1`.

- Delivers the 30-second explanation and two primary actions.
- Carries the persistent Base Sepolia/test-funds banner.
- Hosts wallet/data providers only where client interaction needs them.

### Wallet identity

Implements: `prd.md > Epic 2`.

- Connects through RainbowKit.
- Passes the selected EIP-1193 wallet to Supabase `signInWithWeb3`.
- Uses a domain-bound SIWE statement.
- Reads the verified server session for creator actions.
- Never equates a client-supplied address with authenticated ownership.

### Invoice service

Implements: `prd.md > Epic 3` and `Epic 8`.

- Validates publication fields.
- Converts the amount string to minor units.
- Generates the public identifier.
- Enforces immutable fields, cancellation rules, duplication prefill, and
  owner-scoped history.

### Quote service

Implements: `prd.md > Epic 4`.

- Reuses a valid quote.
- Handles the honest USD parity special case.
- Invokes FX adapters for other currencies.
- Performs exact Decimal.js calculation and stores the locked result.
- Exposes source and expiry without leaking raw Miner data.

### Payment client

Implements: `prd.md > Epic 5`.

- Shows chain/token/recipient/amount before wallet confirmation.
- Switches to Base Sepolia.
- Calls official USDC `transfer` and saves the hash immediately.
- Separates wallet rejection, broadcasting, mining, and Telegraph verification.

### Verification service

Implements: `prd.md > Epic 6`.

- Prevents premature/duplicate paid calls.
- Chooses configured primary/backup adapters.
- Validates and normalizes evidence.
- Runs the pure exact verifier.
- Atomically finalizes payment and invoice state.

### Public invoice and receipt presenter

Implements: `prd.md > Epic 7`.

- Resolves the combined display state from invoice, quote, and payment records.
- Returns only sanitized public fields.
- Changes the same URL from payable invoice to locked receipt.
- Links to Base Sepolia explorer evidence and supports native share/print.

### Usage and operational evidence

Implements: `prd.md > Epic 9`.

- Records allowlisted, deduplicated events.
- Separates internal/recruited/organic sources.
- Stores Telegraph cost, latency, failures, and x402 settlement proof.
- Produces server-only judging summaries without claiming Miner leaderboard
  traffic credit.

## File Structure

The Next.js application lives at the repository root beside the planning and
research folders.

```text
payproof/
├── .github/
│   └── workflows/ci.yml                 # PR lint, types, unit tests, build
├── context/                              # Telegraph ecosystem and live-Miner research
├── docs/payproof-build/                  # Accepted scope, PRD, spec, checklist, notes
├── public/                               # Static icons and non-sensitive product assets
├── research/                             # Read-only reference repositories and comparisons
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── health/route.ts           # Unpaid deployment readiness response
│   │   │   └── invoices/
│   │   │       ├── route.ts              # Authenticated invoice publication
│   │   │       ├── [invoiceId]/
│   │   │       │   └── cancel/route.ts   # Authenticated owner cancellation
│   │   │       └── public/[publicId]/
│   │   │           ├── quote/route.ts    # Cached/live quote creation
│   │   │           └── payments/
│   │   │               ├── route.ts      # Idempotent transaction-hash storage
│   │   │               └── [paymentId]/
│   │   │                   └── verify/route.ts # Paid Telegraph verification
│   │   ├── dashboard/
│   │   │   ├── loading.tsx               # Owner-history loading state
│   │   │   └── page.tsx                  # Protected creator invoice history
│   │   ├── invoices/new/
│   │   │   └── page.tsx                  # Create/review/duplicate-prefill page
│   │   ├── i/[publicId]/
│   │   │   ├── loading.tsx               # Public invoice loading shell
│   │   │   ├── not-found.tsx             # Safe missing-link response
│   │   │   └── page.tsx                  # Invoice, payment, or receipt surface
│   │   ├── error.tsx                      # Recoverable application error boundary
│   │   ├── globals.css                    # Tailwind import and global tokens
│   │   ├── layout.tsx                     # Metadata, shell, providers, testnet banner
│   │   ├── page.tsx                       # Landing and 30-second explanation
│   │   └── providers.tsx                  # Wagmi, RainbowKit, Query providers
│   ├── components/
│   │   ├── ui/                            # Small accessible Button/Input/Card primitives
│   │   ├── address.tsx                    # Checksummed truncation and copy action
│   │   ├── network-badge.tsx              # Base Sepolia/testnet identity
│   │   ├── share-actions.tsx              # Native share with copy fallback
│   │   ├── status-badge.tsx               # Derived product-state presentation
│   │   └── wallet-button.tsx              # Branded RainbowKit entry point
│   ├── features/
│   │   ├── analytics/
│   │   │   └── record-event.server.ts     # Allowlisted, privacy-safe usage events
│   │   ├── auth/
│   │   │   ├── require-creator.server.ts  # Verified creator-session guard
│   │   │   └── web3-sign-in.tsx           # Wallet signature/login interaction
│   │   ├── invoices/
│   │   │   ├── invoice-form.tsx           # Create and review form
│   │   │   ├── invoice-service.server.ts  # Publish/cancel/history rules
│   │   │   ├── invoice-view.tsx           # Public commercial details
│   │   │   ├── schemas.ts                 # Strict input and DTO schemas
│   │   │   └── state.ts                   # Pure combined display-state resolver
│   │   ├── payments/
│   │   │   ├── payment-panel.tsx          # Chain switch, USDC transfer, save, verify
│   │   │   ├── payment-service.server.ts  # Idempotency and lifecycle persistence
│   │   │   ├── receipt-view.tsx           # Locked verified evidence view
│   │   │   ├── usdc-abi.ts                # Minimal constant transfer ABI
│   │   │   └── verifier.ts                 # Pure exact comparison and codes
│   │   └── quotes/
│   │       ├── quote-card.tsx              # Rate, amount, countdown, refresh UI
│   │       ├── quote-service.server.ts     # Cache, FX fallback, exact quote storage
│   │       └── schemas.ts                  # Quote API and normalized FX schemas
│   └── lib/
│       ├── base/
│       │   ├── constants.ts                # 84532, official USDC, explorer origin
│       │   ├── public-client.server.ts     # Receipt readiness only, never final proof
│       │   └── wagmi-config.ts             # RainbowKit/Wagmi Base Sepolia-only config
│       ├── database/
│       │   ├── admin.server.ts             # Server-only Supabase secret client
│       │   ├── browser.ts                  # Publishable browser client
│       │   ├── server.ts                   # Cookie-aware authenticated server client
│       │   └── types.ts                    # Generated database types
│       ├── env.server.ts                   # Strict secret/config validation
│       ├── errors.ts                       # Stable error codes and safe envelopes
│       ├── money.ts                        # Exact parse/format/Decimal conversion
│       ├── request.ts                      # Request IDs, safe JSON, timeout helpers
│       └── telegraph/
│           ├── adapters/
│           │   ├── fx-rate-mirror.ts       # Miner 20260827 validation/normalization
│           │   ├── preflight-fx.ts         # Miner 20260828 validation/normalization
│           │   ├── truvian-tx.ts           # Miner 8453 validation/normalization
│           │   └── interlock-tx.ts         # Miner 9007 validation/normalization
│           ├── client.server.ts             # Direct ask envelope and safe response handling
│           ├── miners.ts                    # Fixed endpoint config + env-selected IDs
│           ├── schemas.ts                   # Engine envelope and normalized evidence
│           ├── service.server.ts            # Primary/backup orchestration and logging
│           ├── spend-policy.server.ts       # Challenge allowlist and budget reservation
│           └── x402-client.server.ts        # Base Sepolia-only paid fetch signer
├── supabase/
│   ├── migrations/
│   │   ├── 001_schema.sql                  # Five tables, constraints, indexes
│   │   ├── 002_rls.sql                     # Owner policies and deny-public defaults
│   │   └── 003_functions.sql               # Atomic finalize and spend reservation
│   └── seed.sql                             # Local non-secret sample invoice only
├── tests/
│   ├── e2e/                                # Playwright public/creator journeys
│   ├── fixtures/                           # Sanitized Miner payload samples
│   ├── integration/                        # Route + local Supabase service tests
│   ├── live/                               # Explicit opt-in Base Sepolia/Telegraph smoke tests
│   └── unit/                               # Money, state, adapters, verifier, errors
├── .env.example                            # Names and explanations, never values
├── .gitignore                              # Secrets, build output, local artifacts
├── AGENTS.md                               # Team/AI contribution and verification rules
├── next.config.ts                          # Security headers and Next configuration
├── package.json                            # Locked scripts and dependencies
├── playwright.config.ts                    # Browser test projects and base URL
├── tsconfig.json                           # Strict TypeScript and path aliases
├── vitest.config.ts                        # Unit/integration test configuration
└── README.md                               # Setup, architecture, demo, evidence, limits
```

## Data Flow

### 1. Creator authentication

```text
wallet connects through RainbowKit
  -> creator chooses Create/View invoices
  -> Supabase signInWithWeb3 requests SIWE signature
  -> Supabase validates signature and issues cookie session
  -> server verifies session user
  -> verified wallet identity is used for creator and recipient
```

Navigating away does not lose the authenticated session. Disconnecting the
wallet removes the active UI connection; logout clears the Supabase session.

### 2. Invoice lifecycle

```text
form strings
  -> Zod strict validation
  -> money string becomes amount_minor bigint
  -> creator fields come from server session
  -> immutable invoice row + random public_id
  -> public DTO and share URL
  -> dashboard reads same row by creator_user_id
```

The invoice survives browser/device changes because it lives in Postgres, not
local storage.

### 3. Quote lifecycle

```text
public invoice requests quote
  -> reject cancelled/verified invoice
  -> return current saved quote if present
  -> USD: create parity quote without paid call
  -> otherwise reserve action and x402 budget
  -> FX primary direct ask
  -> validate envelope + primary schema + freshness
  -> on invalid/unavailable, one backup direct ask
  -> Decimal string arithmetic
  -> store rate, USDC units, expiry, provenance
  -> sanitized quote DTO to client
```

Refreshing the page returns the stored valid quote. An expired quote remains in
history but a new payment must select a new quote.

### 4. Payment and receipt lifecycle

```text
client reviews server-issued quote
  -> connects wallet and switches to 84532
  -> calls official USDC transfer(recipient, exact bigint amount)
  -> wallet returns transaction hash
  -> hash + quote ID saved idempotently
  -> browser waits for Base receipt readiness
  -> verification endpoint calls Telegraph primary/backup
  -> adapter normalizes Miner evidence
  -> pure verifier checks exact facts
  -> database transaction finalizes payment + invoice
  -> same public URL renders locked receipt
```

If the tab closes after the hash is saved, reopening the invoice recovers the
submitted payment and offers the appropriate wait or verification retry. If it
closes before the hash reaches the server, the user can submit the hash through
the recovered wallet transaction link only as a post-MVP convenience; the MVP
must prioritize saving immediately after broadcast.

### 5. Usage evidence lifecycle

```text
allowlisted product action
  -> server attaches invoice/session context
  -> hashes permitted identifiers
  -> marks internal/recruited/organic source
  -> inserts deduplicated usage event
  -> server-only aggregate for judging/reporting
```

Telegraph-call rows remain separate from user-action rows so the team cannot
mistake paid API volume for real adoption.

## Public State Resolution

The UI calls one pure resolver with invoice, newest relevant quote, and current
payment:

```text
if invoice.lifecycle == verified      -> Verified
else if invoice.lifecycle == cancelled -> Cancelled
else if payment.state == unavailable  -> Verification unavailable
else if payment.state == submitted    -> Payment submitted
else if payment.state == mismatch     -> Mismatch (retry allowed)
else if no valid quote exists         -> Awaiting payment / Quote expired
else                                  -> Awaiting payment
```

`Overdue` is an additional label when an open invoice's due date passed. It does
not replace the operational state or disable payment.

## Rate Limiting And Abuse Controls

Default production limits:

```text
quote endpoint:       6 requests/minute per invoice + network hash
new paid FX action:   at most 1 per 10 seconds; valid quote always reused
payment submission:  6 requests/minute per invoice + network hash
verification action: at most 1 paid attempt set per 15 seconds/payment
Miner attempts:      exactly 1 primary + at most 1 backup/action
```

The database's idempotency keys and unique indexes are the hard financial
protection. Usage-event rate checks are a secondary abuse signal, not the only
defense.

## Security And Privacy

- Dedicated x402 wallet contains only limited test funds and is never a personal
  or mainnet wallet.
- All payment and intelligence chains are asserted as `84532` / `eip155:84532`.
- The Telegraph origin is allowlisted; endpoint paths come from code, preventing
  server-side request forgery through user input.
- Environment variables are validated on server startup. Secrets never use a
  `NEXT_PUBLIC_` prefix.
- Logs redact private keys, signatures, cookies, authorization/payment headers,
  and full upstream errors.
- Public fields are rendered as text, never arbitrary HTML.
- Public invoice IDs contain at least UUIDv4-equivalent entropy. Link possession
  permits view/pay/retry, not creator mutation or dashboard access.
- Creator ownership comes from Supabase's verified Web3 session.
- Database finalization and spend reservation are atomic.
- The x402 challenge is checked before signing: exact network, expected USDC
  asset, official Telegraph origin, per-call cap, and daily cap.
- Public receipts expose on-chain addresses by design but no email, phone,
  network address, raw Miner body, or analytics identity.
- Production source has no success mock, demo bypass, local Miner fallback, or
  environment flag capable of returning fabricated verification.

## Environment Contract

`.env.example` documents these names:

```text
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID

SUPABASE_SECRET_KEY
TELEGRAPH_NODE_URL
TELEGRAPH_EVM_PRIVATE_KEY
TELEGRAPH_FX_PRIMARY_MINER_ID
TELEGRAPH_FX_BACKUP_MINER_ID
TELEGRAPH_TX_PRIMARY_MINER_ID
TELEGRAPH_TX_BACKUP_MINER_ID
X402_MAX_CALL_USDC_UNITS
X402_DAILY_BUDGET_USDC_UNITS
FX_MAX_SOURCE_AGE_MINUTES
ANALYTICS_HASH_SECRET
INTERNAL_TEST_WALLETS
```

Expected Miner defaults:

```text
FX primary: 20260827
FX backup: 20260828
TX primary: 8453
TX backup: 9007
```

No real value appears in `.env.example`, tests, screenshots, build logs, or the
repository history.

## Error Strategy

### User-facing categories

- **Needs user action:** wrong network, insufficient gas/test USDC, wallet
  rejected, quote expired, mismatch.
- **Safe retry:** Telegraph timeout/unavailable, Base readiness unavailable,
  transient database failure.
- **Final:** verified, cancelled, transaction reverted, wrong payment facts.
- **Team-only diagnostic:** malformed Miner response, budget rejection,
  configuration failure, database constraint conflict.

### Most likely demo failures

1. **Telegraph/x402 failure** — show unavailable, retain hash, allow cooldown
   retry, and keep a real prior receipt available.
2. **Wallet lacks test funds or uses wrong chain** — preflight labels, chain
   switch, faucet guidance, and a funded backup test wallet.
3. **Miner schema/behavior drift** — independent adapters, strict validation,
   live health smoke test, and environment-promotable backup.

No catch block may convert an error into Verified.

## Testing And Verification

### Unit tests

- Local amount parsing for every currency and invalid formats.
- Decimal rate multiplication and half-up six-decimal rounding.
- USD parity conversion.
- Quote expiry boundary at exactly 15 minutes.
- State resolver combinations, including Overdue plus Mismatch.
- Each Miner adapter using captured sanitized passing/failing fixtures.
- Exact verifier for every mismatch code.
- Address/hash normalization and integer amount comparisons.
- x402 challenge policy for wrong chain, mainnet `8453`, excessive amount,
  wrong asset, wrong origin, and exhausted daily budget.

### Database/integration tests

- RLS prevents cross-wallet dashboard access.
- Anonymous clients cannot enumerate invoices or raw Telegraph calls.
- Invoice publication ignores forged creator/recipient input.
- Hash uniqueness and verified-payment partial uniqueness hold under concurrency.
- Finalization updates invoice and payment atomically.
- Valid quote reuse and paid-action idempotency prevent duplicate spending.
- Cancel/verify races produce one valid terminal result.

### Browser tests

- Landing explanation and mobile layout.
- Creator Web3 sign-in boundary and invoice form validation.
- Public invoice view without account.
- Copy/share fallback.
- Quote countdown/refresh and unavailable UI.
- Wallet rejection and wrong-chain messaging.
- Submitted, mismatch, unavailable, cancelled, overdue, and verified rendering.
- Receipt print layout and explorer link.

Automated browser tests may stub external boundaries only in the isolated test
configuration. The deployed production bundle has no stub path.

### Live smoke tests

Live tests are opt-in, spend-limited, and use dedicated wallets:

- One NGN, EUR, and GBP FX quote through the production x402 path.
- USD parity without an FX charge.
- One exact Base Sepolia test-USDC transfer verified by the primary Miner.
- One deliberately wrong amount classified as Mismatch.
- One forced-primary failure proving backup behavior.
- Saved x402 settlement proof and Telegraph provenance.

## AI Usage

AI tools may help both team members research, draft, implement, test, and review.
Every pull request remains human-reviewed by the project lead, and generated
code must pass the same tests and security checks.

PayProof itself does not use an LLM to decide payment. Its intelligence comes
from Telegraph FX and on-chain Miners, followed by deterministic rules. This is
deliberate: a receipt should not depend on persuasive generated prose.

## Deployment And Collaboration

- Initialize one public GitHub repository named `payproof` at this workspace
  root after the checklist authorizes construction.
- Protect `main`; the second teammate works on short branches and pull requests.
- Required PR checks: lint, typecheck, unit tests, production build.
- Vercel creates preview deployments per pull request and one stable production
  URL from `main`.
- Supabase migrations are version-controlled and applied deliberately; no schema
  is edited only through the dashboard without a matching migration.
- Production secrets are entered directly into Supabase/Vercel settings and
  never pasted into chat or committed.
- Deployment uses the Node.js runtime for x402 signer compatibility, not the
  Edge runtime.

## Risks And Verification

| Risk | Consequence | Mitigation and proof |
|---|---|---|
| Current compatible Miner later changes | Quote or verification becomes unavailable | Strict adapter, daily smoke test, configurable proven backup, no outcome guessing |
| Truvian catalog schema understates Sepolia support | A deployment assumes behavior that disappears | Keep INTERLOCK backup and re-run paid readiness before launch |
| x402 SDK/example chain confusion | Accidental mainnet authorization | Register only `eip155:84532`; unit test rejection of `8453` and all other networks |
| Duplicate retry pays twice | Service-wallet budget drains | Saved-result reuse, action key, challenge reservation, no blind fetch retry |
| Browser closes after broadcast | Hash/result may appear lost | Save hash before waiting; recover saved submitted payment on reopen |
| Malformed or rounded Miner values | False amount or receipt | Zod adapters, structured strings, Decimal.js, bigint exact comparison |
| Public link leaks commercial text | Unintended invoice disclosure | Unguessable UUID, privacy warning, no contact details; link possession is explicitly public access |
| "Permanent" receipt is interpreted as immutable storage | Overclaim if service is offline | Lock database facts; expose explorer evidence; describe permanence as revisitable within PayProof, not decentralized archival storage |
| Web3 auth and wallet connector interop fails | Creators cannot access history | Build the authentication spike first and test browser/mobile wallets before feature work |
| Test-fund faucets are unreliable | Outside testers cannot complete payment | Fund several small dedicated tester wallets early and provide clear faucet guidance |
| Real adoption begins too late | Weak 45% usage score | Deploy the thin creator-to-receipt slice before polish and recruit testers immediately |

## Architecture Self-Review

### Finding 1: five tables are justified but must stay five

`telegraph_calls` cannot be folded into payments because FX calls also need
evidence, and `usage_events` cannot be treated as financial truth. Additional
profile, session, receipt, status-history, or rate-limit tables are unnecessary
for this timeframe. Supabase Auth covers identity; receipts are projections of
invoice/quote/payment data.

### Finding 2: no smart contract is a product advantage

A custom invoice contract would add deployment, audit, approval, and failure
paths without improving the core proof. Direct USDC transfer makes the product
non-custodial and keeps Telegraph as the essential verification layer.

### Finding 3: live Miner compatibility is stronger evidence than catalog prose

The primary transaction Miner's declared input description does not clearly
promise Base Sepolia, yet the recorded live probe decoded Base Sepolia USDC.
PayProof therefore treats compatibility as a continuously checked operational
fact, not a permanent assumption. Backup and fail-closed behavior are required.

## Demo And Submission Flow

### Pre-demo preparation

- Verify production health without spending.
- Run one capped paid FX and transaction smoke test.
- Fund dedicated creator, payer, and backup payer wallets with small Base
  Sepolia test balances.
- Prepare one prior real verified receipt as outage recovery evidence.
- Confirm production analytics marks team wallets internal.

### Live path

1. Open the landing page and explain PayProof in under 30 seconds.
2. Connect/sign the freelancer wallet.
3. Create a `250,000 NGN` invoice and copy its public link.
4. Open the link in a client/mobile context without signing up.
5. Show the live Telegraph FX Miner, rate, exact USDC amount, x402 proof, and
   15-minute countdown.
6. Connect the payer wallet and transfer exact official Base Sepolia test USDC.
7. Show hash persistence, payment-submitted state, and Telegraph verification.
8. Show the same link as a locked receipt with the actual transfer sender,
   recipient, amount, Miner provenance, and Base explorer link.
9. Return to creator history and show Verified.
10. If time permits, submit a wrong-amount test transaction to demonstrate a
    specific Mismatch with no receipt.

### Evidence mapped to judging

- **45% adoption:** distinct external creator/payer wallets, complete journeys,
  honest funnel, and tester feedback.
- **25% usefulness/depth:** FX output controls payable amount; transaction
  output controls receipt issuance; both are real paid Telegraph calls where
  conversion is required.
- **25% updates:** real progress, x402/transaction links, failure handling, and
  tester learning tagged correctly on X.
- **5% execution:** public URL, clean source, strict adapters, exact tests,
  server-only keys, and reliable failure states.

## Checklist Handoff

The build checklist must sequence work by risk rather than page order:

1. repository/tooling and secret-safe environment;
2. Supabase Web3 authentication spike;
3. database migrations and exact money unit tests;
4. paid Telegraph/x402 adapter spikes against all four configured Miners;
5. invoice creation/public read thin slice;
6. quote persistence and countdown;
7. Base Sepolia USDC payment and immediate hash persistence;
8. exact verification/finalization and receipt;
9. analytics, failure hardening, responsive UX, external testing;
10. deployment, evidence, demo rehearsal, and submission readiness.

Every checklist section needs an objective verification checkpoint. UI polish
must not begin before authentication, x402 payment, and Base Sepolia
verification risks have passed live spikes.
