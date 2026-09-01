# PayProof Project Scope

Accepted: **2026-09-01**.

## Project Name

**PayProof**

Working descriptor: **Local-currency invoices with verifiable USDC receipts**.

## One-Line Summary

PayProof lets a freelancer create an invoice in a familiar currency, lets the
client pay the converted amount in test USDC on Base Sepolia, and checks the
transaction before issuing a permanent receipt.

## Thirty-Second Explanation

A freelancer creates an invoice in NGN, USD, EUR, or GBP and shares a link. The
client sees a live USDC conversion, connects a wallet, and pays on Base Sepolia.
PayProof checks that the correct USDC token, amount, recipient, chain, and
successful transaction all match the invoice. Both parties receive a receipt
they can trust instead of relying on a screenshot.

## Target User

### Primary user

A remote freelancer receiving cross-border payment from a client.

### Launch wedge

Nigerian remote freelancers are the first reachable cohort because the team can
recruit testers through personal contacts, social media, and WhatsApp Status.
PayProof remains an international product rather than an NGN-only product.

### Secondary user

The freelancer's client, who should be able to open and understand the invoice
without creating a PayProof account.

## Problem

Freelancers and clients may agree on a price in a familiar currency while the
actual payment happens in USDC. The conversion, receiving address, token,
amount, chain, and transaction status can be confusing. A screenshot can be
wrong, edited, old, or taken from a different transaction.

PayProof turns those separate facts into one verifiable invoice lifecycle.

## Product Principles

- Understandable in 30 seconds.
- The client does not create an account.
- Blockchain details are visible when they protect the user, not as decoration.
- A transaction is never called verified merely because it exists.
- Telegraph errors remain visible; no mocked or fabricated successful result.
- The first release supports a small tested currency set rather than claiming
  every currency works.
- Testnet funds are clearly labeled as having no real monetary value.

## Core Workflow

### 1. Freelancer creates an invoice

The freelancer connects a wallet and enters:

- freelancer/display name;
- optional client name or reference;
- work description;
- local amount;
- currency: NGN, USD, EUR, or GBP;
- payment due date;
- receiving wallet, derived from or confirmed against the connected wallet.

PayProof stores the invoice and generates an unguessable public link.

### 2. Client opens the invoice

The client does not sign up. PayProof displays:

- invoice details and local amount;
- receiving wallet;
- Base Sepolia and test-USDC labels;
- a 15-minute USDC quote: live Telegraph FX for NGN, EUR, and GBP, or a clearly
  labelled nominal `1 USD = 1 test USDC` rule for USD;
- when the quote expires;
- a clear Pay button.

### 3. Quote is locked

The USDC quote is locked for 15 minutes. If it expires before the payment is
submitted, PayProof refreshes the Telegraph quote and requires the client to
review the new USDC amount.

### 4. Client pays inside PayProof

The client connects a wallet only at the payment step. PayProof requests an
exact transfer of official Base Sepolia test USDC to the invoice recipient.
The application records the submitted transaction hash.

### 5. PayProof verifies the payment

PayProof uses a compatible live Telegraph Miner through the permitted x402
direct route. It marks the invoice **Verified** only when:

```text
chain_id == 84532
token == official Base Sepolia test-USDC contract
recipient == invoice receiving wallet
amount == locked invoice amount in six-decimal base units
transaction status == success
```

The implementation may accept `amount >= expected` only if the product wording
and receipt clearly disclose the overpayment. The default scope is exact amount.

### 6. PayProof issues the result

Possible user-facing states:

- **Awaiting payment** — no transaction has been submitted.
- **Payment submitted** — transaction is awaiting a reliable result.
- **Verified** — every required field matches.
- **Mismatch** — a transaction exists but token, amount, recipient, chain, or
  status does not match the invoice.
- **Verification unavailable** — Telegraph could not provide sufficient
  evidence; PayProof does not guess.
- **Quote expired** — conversion must be refreshed before payment.
- **Overdue** — due date has passed without a verified payment, but the invoice
  remains payable until the creator cancels it.
- **Cancelled** — the creator cancelled an unpaid invoice; its public page stays
  visible but payment is disabled.

### 7. Both parties receive a receipt

The receipt is a permanent shareable webpage containing:

- invoice reference and description;
- original local amount and currency;
- locked rate and USDC amount;
- payer and recipient wallets;
- transaction hash and Base Sepolia explorer link;
- verification result and timestamp;
- Telegraph Miner/provenance information available from the response;
- a prominent testnet/no-real-value notice.

The browser's print/save function provides PDF output. A custom PDF generator
is not part of the MVP.

### 8. Freelancer views invoice history

After reconnecting the creator wallet, the freelancer can view invoices they
created and their current states. The dashboard is a useful history, not a
general financial analytics product.

## Telegraph's Essential Role

### `CURRENCY_EXCHANGE`

Supplies the live conversion from NGN, EUR, or GBP into the USD value used for
the USDC amount. Structured fields are normalized and formatted by PayProof;
misleading rounded prose is not displayed. USD invoices use a clearly labelled
nominal `1 USD = 1 test USDC` rule and do not purchase a fake USD-to-USD quote.

### `ONCHAIN_TX_LOOKUP`

Supplies independent evidence about the Base Sepolia transaction and its ERC-20
transfer effects. The app uses a compatible live Miner through Telegraph's
x402-gated direct endpoint, as permitted by organizers.

### `GAS_PRICE`

Optional supporting context. It may show the current Base Sepolia fee level if
a reliable Miner response is available. It is not required to decide whether
the invoice is paid and may be removed before submission without weakening the
core product.

## Real-Usage Evidence

PayProof will distinguish:

- unique invoice creators;
- unique invoice viewers/payers;
- invoices created and shared;
- live Telegraph quote attempts and outcomes;
- wallet payment attempts;
- verified, mismatched, unavailable, overdue, and cancelled results;
- completed receipt views;
- repeat creators.

Internal development traffic is labeled separately. Direct Miner calls are not
presented as Miner request-volume credit. Artificial traffic generation is
prohibited.

## What We Are Building

- responsive public landing page with a 30-second explanation;
- wallet connection for invoice creators and payers;
- invoice creation for NGN, USD, EUR, and GBP;
- unguessable public invoice links;
- live Telegraph currency conversion and 15-minute quote expiry;
- Base Sepolia test-USDC payment inside the application;
- strict Telegraph-backed transaction verification;
- clear invoice/result state machine;
- permanent shareable receipt page and explorer evidence;
- wallet-based creator invoice history;
- manual copy/share actions for invoice and receipt links;
- honest product analytics and failure logging;
- testnet onboarding links/instructions for testers;
- mobile-friendly flows suitable for WhatsApp-shared links.

## What We Are Not Building

### Mainnet payments

No real-value Base USDC is accepted during this build. Mainnet introduces real
financial loss risk and is unnecessary for the hackathon proof.

### Additional chains or tokens

No Ethereum, Polygon, Arbitrum, Celo, Solana, ETH, USDT, DAI, or other payment
rail. The only payment asset is official Base Sepolia test USDC.

### Automatic email or WhatsApp delivery

PayProof generates links users can manually share. It does not integrate email
delivery providers or the WhatsApp Business API.

### Recurring invoices

No weekly or monthly schedules, automatic invoice generation, subscriptions,
or automatic payment mandates.

### Partial payments

One invoice expects one exact payment. There are no installments or remaining
balance calculations.

### Escrow

PayProof does not custody or hold funds and does not deploy a contract that
releases money after work approval.

### Disputes

PayProof verifies payment facts. It does not decide whether work quality was
acceptable or which party is right in a commercial disagreement.

### Tax calculation

No VAT, sales tax, withholding, jurisdiction determination, or tax advice.

### Teams

No business workspaces, invitations, employees, accountants, roles, or
permissions.

### Currencies beyond the tested set

No public promise beyond NGN, USD, EUR, and GBP in the MVP. More currencies are
a post-hackathon expansion after live Miner testing.

### Other excluded surfaces

- no fiat on-ramp or off-ramp;
- no currency exchange or token swap performed by PayProof;
- no custom mobile application;
- no native messaging service;
- no AI-generated invoice descriptions;
- no accounting-system integration;
- no automatic collection or debt enforcement.

## Inspiration And What We Keep

- **EthMail:** use a familiar invoicing mental model.
- **CrossMeter:** hide chain plumbing while exposing payment status.
- **Am I Cooked:** produce one memorable verdict and a useful next action.
- **Telegraph:** use paid live intelligence to make a real product decision,
  with no mocked Miner answers.

PayProof does not copy reference-project code. Public repositories without a
compatible license are used only for product-pattern research.

## Demo Path

1. Connect a freelancer wallet.
2. Create a `250,000 NGN` invoice.
3. Open the public link as the client.
4. Show the live Telegraph quote and 15-minute lock.
5. Connect the payer wallet and send exact Base Sepolia test USDC.
6. Show transaction submission and Telegraph verification.
7. Open the permanent Verified receipt and its explorer evidence.
8. Return to the creator history and show the paid invoice.
9. Optionally submit a deliberately wrong transaction to demonstrate Mismatch
   or Verification unavailable without fabricating success.

## Submission Story

> Cross-border freelancers should not have to choose between familiar invoices
> and verifiable crypto payments. PayProof lets them price work in the currency
> they understand, receive test USDC on Base Sepolia, and give both parties a
> Telegraph-verified receipt. The product proves payment by checking the chain,
> official token, amount, recipient, and status—not by trusting a screenshot.

## Definition Of Done

PayProof is ready for outside testing when:

- a new freelancer can understand it without verbal explanation;
- a creator can complete and share an invoice from a mobile browser;
- NGN, EUR, and GBP return a tested live Telegraph result or fail visibly, and
  USD follows the tested nominal parity rule;
- a client can complete a Base Sepolia test-USDC payment inside PayProof;
- a correct transaction becomes Verified;
- wrong recipient, wrong amount, wrong token, failed transaction, unsupported
  response, and expired quote never become Verified;
- passing the due date marks an invoice Overdue without blocking a late payment;
- an unpaid invoice can be cancelled, while a verified invoice cannot be edited
  or cancelled;
- both parties can revisit the same receipt URL;
- creator history persists after reconnecting;
- analytics distinguish real users from internal tests;
- no mock Miner response exists in the production path.
