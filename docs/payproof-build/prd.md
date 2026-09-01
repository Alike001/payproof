# PayProof Product Requirements Document

Accepted product decisions through **2026-09-01**.

## Product Summary

PayProof is a testnet invoicing product for freelancers and their clients. A
freelancer prices work in NGN, USD, EUR, or GBP and shares a payment link. The
client receives a time-limited USDC quote, pays test USDC on Base Sepolia, and
uses the same link to view the final result. PayProof issues a verified receipt
only after Telegraph intelligence confirms the transaction's chain, token,
recipient, amount, and successful status.

The product replaces "I sent it—see this screenshot" with a result both parties
can independently revisit.

### Thirty-second explanation

> Create an invoice in a currency you understand. Your client pays the converted
> amount in test USDC on Base Sepolia. PayProof checks the real transaction with
> Telegraph and turns the invoice link into a verified receipt.

### Product promise

PayProof can prove whether the specified on-chain payment matches an invoice. It
does not prove that the freelancer completed satisfactory work, settle disputes,
or move money between fiat and crypto.

## Target User

### Primary user: invoice creator

A remote freelancer who:

- agrees on a price with a client in a familiar currency;
- is willing to receive USDC;
- wants a professional invoice and reliable proof of payment;
- may not want to explain block explorers or token contracts to a client.

The launch wedge is Nigerian freelancers reached through the team's existing
network, WhatsApp Status, and social media. The product remains usable by
international freelancers because USD, EUR, and GBP are also supported.

### Secondary user: invoice payer

A freelancer's client who:

- receives a PayProof link;
- should understand what to do without a PayProof account;
- can connect a wallet at the payment step;
- needs clear testnet funding and payment instructions;
- wants proof that the payment reached the correct wallet.

### Internal user: PayProof team

The two-person team needs honest evidence of real product use, visible failure
information, and enough diagnostic context to distinguish product defects from
wallet, network, or Telegraph failures.

## Product Principles

- A new visitor should understand the product within 30 seconds.
- The payer should not create an account.
- The interface uses invoice language first and blockchain terminology only
  where it protects the user.
- PayProof never treats a wallet submission, screenshot, or transaction hash by
  itself as proof of successful payment.
- Telegraph unavailability produces an honest unavailable state, never a guessed
  or mocked success.
- Every page involving funds prominently says **Base Sepolia testnet** and
  **test funds have no real monetary value**.
- Scope remains narrow enough to operate as a reliable product during Track 3.

## Core User Journey

1. A freelancer lands on PayProof, understands the value proposition, and
   selects **Create an invoice**.
2. The freelancer connects a wallet and enters the invoice information in one
   form.
3. PayProof publishes the invoice and returns an unguessable public link with
   manual **Copy link** and **Share** actions.
4. The client opens the link without signing up and sees the local-currency
   amount, recipient, testnet notice, and a live 15-minute USDC quote. NGN, EUR,
   and GBP use Telegraph FX intelligence; USD uses a clearly labelled nominal
   `1 USD = 1 test USDC` parity rule rather than a fake conversion request.
5. The client connects a wallet and pays the exact amount of official Base
   Sepolia test USDC inside PayProof.
6. PayProof records the transaction hash and asks Telegraph for independent
   on-chain transaction evidence.
7. If every required field matches, the invoice becomes **Verified** and the
   public URL becomes its permanent receipt. Otherwise, PayProof explains the
   mismatch or verification failure and does not issue a verified receipt.
8. The freelancer reconnects the creator wallet to view the invoice and its
   current state in invoice history.

## Product States

| State | Meaning | Can the client pay? |
|---|---|---|
| Awaiting payment | Published invoice with no submitted transaction | Yes, with a current quote |
| Quote expired | The 15-minute quote expired before submission | Not until a new quote is shown |
| Payment submitted | A transaction was submitted and is awaiting a reliable result | No, to prevent an accidental duplicate |
| Verification unavailable | The transaction hash is saved, but Telegraph cannot currently provide sufficient evidence | No; verification can be retried |
| Mismatch | A submitted transaction failed or does not match one or more invoice requirements | Yes, after the reason is shown and a current quote is available |
| Overdue | The due date passed without verified payment | Yes; the due date is informational |
| Cancelled | The creator cancelled an unpaid invoice | No |
| Verified | All required payment facts match | No; the page is now the receipt |

`Overdue` may be displayed alongside the operational payment state. For example,
an overdue invoice may also be awaiting payment or have a mismatch.

## Epics And User Stories

### Epic 1: Understand and enter the product

- As a first-time visitor, I want to understand PayProof quickly so that I can
  decide whether it solves my payment-proof problem.
- As a returning freelancer, I want direct access to my invoices so that I do
  not have to repeat onboarding.

Acceptance criteria:

- The first screen explains who the product is for, what it does, and that it
  uses Base Sepolia test funds.
- The first screen presents **Create an invoice** and **View my invoices** as
  the two primary actions.
- The explanation does not imply fiat conversion, custody, escrow, mainnet
  payment, or legal payment protection.
- A payer following an invoice link goes directly to that invoice rather than
  through creator onboarding.

### Epic 2: Identify the invoice creator

- As a freelancer, I want to use my wallet as my PayProof identity so that I do
  not need another username and password.
- As a freelancer, I want the receiving wallet to be explicit so that I do not
  accidentally invoice payment to an unrelated address.

Acceptance criteria:

- Creating or viewing creator history requires a connected wallet.
- The receiving address is derived from or explicitly confirmed against the
  connected creator wallet.
- The full receiving address is reviewable before the invoice is published.
- Connecting a different wallet shows the history belonging to that wallet; it
  does not expose another creator's private dashboard.
- No email address, phone number, or social profile is required.

### Epic 3: Create and share an invoice

- As a freelancer, I want to price work in a familiar currency so that I can
  preserve the commercial agreement I made with my client.
- As a freelancer, I want a simple public link so that I can send the invoice
  through the communication tool I already use.

Acceptance criteria:

- The creation form requires a freelancer/display name, work description,
  positive amount, supported currency, due date, and receiving wallet.
- The form permits an optional client name or non-sensitive reference.
- The supported currency choices are exactly NGN, USD, EUR, and GBP.
- Invalid, zero, negative, unsupported, or unreasonably precise amounts cannot
  be published.
- The creator reviews the invoice details before final publication.
- Publishing creates an unguessable public URL.
- Anyone with that URL can view the invoice; the page warns the creator not to
  place private information in public fields.
- The public page never reveals an email address or phone number.
- **Copy link** copies the URL, and **Share** invokes an available device share
  action or offers copying as a fallback.
- PayProof does not automatically send email or WhatsApp messages.
- A published invoice cannot be edited. The creator may duplicate it into a new
  invoice or cancel it while it remains unpaid.
- Cancelling preserves the existing page and evidence but permanently disables
  payment on that invoice.
- A verified invoice cannot be edited or cancelled.

### Epic 4: Obtain and understand a Telegraph-backed quote

- As a client, I want to see the exact test-USDC amount before connecting my
  wallet so that I know what the invoice will cost.
- As either party, I want the conversion evidence recorded so that the final
  amount is explainable later.

Acceptance criteria:

- The original local amount and currency remain unchanged for the life of the
  invoice.
- Opening a payable NGN, EUR, or GBP invoice requests live
  `CURRENCY_EXCHANGE` intelligence through Telegraph. A USD invoice uses a
  clearly labelled nominal `1 USD = 1 test USDC` rule and makes no meaningless
  USD-to-USD Miner request.
- A usable quote displays the local amount, conversion rate, exact USDC amount,
  quote timestamp, and expiry time.
- A quote is valid for 15 minutes.
- Expiry before transaction submission prevents payment until a new quote is
  fetched and shown to the client.
- The refreshed quote may produce a different USDC amount; the client must see
  the new amount before proceeding.
- If payment is submitted while the quote is valid, that quote remains the
  invoice's expected amount even if confirmation occurs after expiry.
- If Telegraph cannot provide a trustworthy non-USD quote, the page displays
  **Quote unavailable**, explains that payment is paused, and offers a retry.
- No stale, locally invented, hard-coded, or mocked rate can silently replace a
  failed Telegraph quote.

### Epic 5: Pay the invoice on Base Sepolia

- As a client, I want to pay from the invoice page so that I do not have to copy
  payment details into another interface.
- As a client unfamiliar with testnets, I want clear prerequisites so that I
  can complete the test without guessing.

Acceptance criteria:

- Viewing an invoice does not require wallet connection; connection is required
  only when the client chooses to pay.
- The payment page clearly identifies Base Sepolia, official test USDC, the
  recipient, exact amount, and testnet/no-real-value status.
- The page explains that Base Sepolia ETH is required for gas and test USDC is
  required for payment, with links to appropriate external acquisition steps.
- PayProof does not claim to supply, sell, swap, bridge, or custody those funds.
- Payment requests one exact transfer to the invoice recipient.
- Rejecting the wallet request leaves the invoice payable and does not create a
  false payment attempt or receipt.
- A submitted transaction hash is saved against the invoice before
  verification begins.
- The Pay button is disabled while a submitted transaction awaits a result.
- If the transaction fails or is mismatched, the client may retry with the
  correct payment after seeing the reason and obtaining a current quote when
  necessary.
- Once an invoice is verified, the Pay button remains unavailable.

### Epic 6: Verify payment with Telegraph

- As a freelancer, I want independent payment verification so that I do not
  rely on the client's screenshot or claim.
- As a client, I want the exact reason for a mismatch so that I can correct the
  payment safely.

Acceptance criteria:

- PayProof uses a live Telegraph Miner compatible with Base Sepolia transaction
  evidence; no mocked Miner response exists in the production flow.
- **Verified** requires all of the following facts to match the locked invoice:
  chain ID `84532`, official Base Sepolia test-USDC token, recipient address,
  exact six-decimal token amount, and successful transaction status.
- Address comparison is case-insensitive where the address format permits, but
  the displayed address remains human-readable.
- Token amount comparison uses the token's base units rather than rounded UI
  prose.
- Wrong chain, token, recipient, amount, or unsuccessful status can never
  produce **Verified**.
- A mismatch names the failed requirement without presenting the invoice as
  paid.
- Telegraph timeout, malformed response, insufficient evidence, or unavailable
  Miner produces **Verification unavailable**, retains the transaction hash,
  and permits a retry.
- A later successful retry can move the same submitted transaction from
  **Verification unavailable** to **Verified** if every requirement matches.
- A later retry cannot rewrite an actual mismatch into success unless new
  trustworthy evidence establishes that the original classification was
  incomplete or incorrect.
- Miner or response provenance supplied by Telegraph is retained for the final
  receipt and diagnostics.

### Epic 7: Revisit and share the receipt

- As either party, I want the invoice URL to become the receipt so that I do not
  need to locate a separate document.
- As either party, I want human-readable and explorer evidence so that I can
  understand and independently inspect the result.

Acceptance criteria:

- A verified invoice's existing public URL renders a permanent receipt view.
- The receipt includes invoice reference, description, original local amount
  and currency, locked rate, USDC amount, payer wallet, recipient wallet,
  transaction hash, verification timestamp, and available Telegraph
  provenance.
- The transaction hash links to the corresponding Base Sepolia block explorer.
- The receipt prominently states that the transaction used testnet funds with
  no real monetary value.
- The receipt never states or implies that PayProof verified work quality,
  delivery, tax compliance, identity, or dispute resolution.
- **Copy link**, **Share**, and browser print/save actions are available.
- No custom generated PDF is required.
- Receipt payment facts cannot be edited after verification.

### Epic 8: Manage creator history

- As a freelancer, I want to revisit invoices by reconnecting my wallet so that
  I can see what is awaiting payment, overdue, cancelled, mismatched, or paid.

Acceptance criteria:

- Creator history lists invoices created by the connected wallet.
- Each entry shows its reference, client reference when supplied, original
  amount/currency, due date, current status, and link.
- The creator can open, copy, share, duplicate, or—when eligible—cancel an
  invoice from its detail flow.
- Passing the due date changes the display to **Overdue** but does not prevent
  payment.
- Reconnecting the same wallet restores the same history.
- The dashboard is not presented as accounting, tax, treasury, or portfolio
  software.

### Epic 9: Demonstrate genuine Track 3 usage

- As the PayProof team, we want trustworthy usage evidence so that the product
  can be evaluated on adoption without inflating activity.

Acceptance criteria:

- The product records invoices created, public invoice views, quote attempts and
  outcomes, payment attempts, verification outcomes, receipt views, and
  returning creators.
- Reports can distinguish distinct creator wallets, distinct payer wallets, and
  internal team testing from recruited-user activity.
- Failed and unavailable Telegraph calls remain visible in operational evidence
  rather than being removed to improve reported success.
- Direct Miner calls are described as application integration and are not
  misrepresented as Miner leaderboard request-volume credit.
- No automated or artificial traffic is generated to inflate adoption.
- Analytics collection does not require payer email, phone number, or PayProof
  account creation.

## Edge Cases

| Situation | Required product behaviour |
|---|---|
| Quote expires while the client is reading | Disable payment, fetch a new quote, and require review of the new amount. |
| Quote expires after transaction submission | Continue verification against the quote that was valid at submission time. |
| Telegraph quote is unavailable | Pause payment, show the failure honestly, and permit retry. |
| Client lacks test ETH or test USDC | Explain the missing prerequisite and link to external testnet acquisition guidance. |
| Client rejects the wallet request | Keep the invoice payable; do not record a submitted payment. |
| Wallet broadcasts but the page closes | Preserve the saved invoice/transaction relationship so reopening can continue verification. |
| Transaction is pending for a long time | Remain in Payment submitted; never infer success from elapsed time. |
| Telegraph verification is unavailable | Save the transaction hash, show Verification unavailable, and permit retry. |
| Wrong network | Show Mismatch with the expected Base Sepolia network; do not issue a receipt. |
| Wrong token | Show Mismatch with the official expected test-USDC token; do not issue a receipt. |
| Wrong recipient | Show Mismatch without treating funds sent elsewhere as invoice payment. |
| Underpayment or overpayment | Show an amount mismatch; exact payment is required in the MVP. |
| Failed/reverted transaction | Show a failed-payment mismatch and permit a new attempt. |
| User submits the same hash again | Reuse the existing record and result rather than counting or processing it as a new payment. |
| Invoice becomes overdue | Display Overdue but continue allowing payment until cancellation or verification. |
| Creator cancels an unpaid invoice | Preserve a read-only Cancelled page and disable quoting/payment. |
| Creator tries to cancel a verified invoice | Reject the action; preserve the verified receipt. |
| Two people open the invoice simultaneously | The first transaction successfully verified completes the invoice; subsequent UI refreshes show Verified and disable payment. |
| Extra unsolicited transfer arrives after verification | Do not automatically attach it to the completed invoice or promise a refund. |
| Someone guesses or receives the public link | Allow invoice viewing by design, while exposing no email, phone number, or creator dashboard. |
| Unsupported currency is supplied through a manipulated request | Reject it; only NGN, USD, EUR, and GBP are valid. |
| Miner response contains rounded prose and structured values | Use validated structured values for decisions and display; never derive proof from persuasive prose. |

## What We Are Building

- A responsive landing page with a 30-second explanation.
- Wallet-based creator access and invoice history.
- Invoice creation in NGN, USD, EUR, and GBP.
- Unguessable public invoice/receipt links.
- Manual copy/share actions.
- Telegraph-backed 15-minute currency quotes.
- Exact test-USDC payments on Base Sepolia inside PayProof.
- Telegraph-backed transaction verification with strict matching.
- Honest pending, mismatch, unavailable, overdue, cancelled, and verified states.
- Permanent shareable receipt pages with explorer and provenance evidence.
- Testnet onboarding guidance.
- Genuine usage and reliability evidence suitable for Track 3 evaluation.

## What We Would Add With More Time

These are explicitly outside the hackathon MVP:

- Base mainnet payments and a production security review;
- additional chains, tokens, and local currencies;
- automatic email or WhatsApp delivery;
- recurring invoices and subscriptions;
- partial payments and installment balances;
- escrow, refunds, and dispute workflows;
- tax calculation and jurisdictional compliance features;
- teams, roles, and shared business workspaces;
- fiat on-ramps/off-ramps, swaps, or bridges;
- accounting integrations and custom PDF generation;
- a native mobile application.

## Submission Proof Points

### Real usage and adoption — 45%

- Distinct external freelancers create and share invoices.
- Distinct client wallets open invoices and attempt payments.
- At least one complete path reaches a Telegraph-verified receipt.
- Usage reporting separates team tests from recruited users and includes failed
  journeys rather than only successful ones.

### Usefulness, creativity, and integration depth — 25%

- One ordinary freelance workflow combines two Telegraph intelligence domains:
  currency conversion and on-chain transaction verification.
- Telegraph outputs change real product decisions: whether payment is enabled
  and whether a receipt is issued.
- The mismatch path demonstrates why verified intelligence is more useful than
  accepting a screenshot or raw transaction hash.

### Public updates and engagement — 25%

- Public progress can show a usable invoice flow, live testnet payment, honest
  failure cases, and tester feedback.
- Updates must accurately describe testnet status and tag `@Telegraphprotoc`.
- Tester feedback and adoption are gathered naturally through the team's
  reachable communities rather than artificial engagement.

### Technical execution and integration quality — 5%

- The live product remains operational during evaluation.
- The production path contains no mocked Telegraph success.
- Quote and verification failures have usable states and diagnostic evidence.
- Exact token base-unit matching prevents UI rounding from creating false
  verification.

## Product Acceptance Standard

PayProof is ready for external Track 3 testing when a new freelancer can create
and share an invoice on a mobile browser, a client can obtain a live Telegraph
quote and submit Base Sepolia test USDC, a correct transaction produces a
revisitable verified receipt, every defined mismatch fails safely, and the team
can show honest evidence of those real journeys.
