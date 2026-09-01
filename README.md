# PayProof

PayProof lets a freelancer create an invoice in NGN, USD, EUR, or GBP, share one
public link, and receive test USDC directly on Base Sepolia. Telegraph supplies
the exchange-rate intelligence and independently checks that the real on-chain
payment matches the invoice. The same link then becomes a verified receipt.

> Testnet product: PayProof currently uses Base Sepolia and test USDC only. No
> token used in the product has real monetary value.

## Why it exists

Cross-border freelancers often describe work in one currency, receive crypto in
another unit, and prove payment with a screenshot or an unexplained transaction
hash. PayProof joins those facts into one understandable and verifiable flow.

PayProof does not custody funds, exchange currencies, bridge tokens, or settle
disputes. Payment travels directly from the payer wallet to the invoice creator.

## Current build status

Implementation follows the accepted documents in [`docs/payproof-build`](docs/payproof-build):

- [`scope.md`](docs/payproof-build/scope.md)
- [`prd.md`](docs/payproof-build/prd.md)
- [`spec.md`](docs/payproof-build/spec.md)
- [`checklist.md`](docs/payproof-build/checklist.md)

The current slice contains the responsive product shell. Database, wallet
identity, live Telegraph calls, and Base Sepolia payment are added in the ordered
checklist and reviewed at the recorded gates.

## Local development

Requirements:

- Node.js 24
- npm 11 or newer

```bash
cp .env.example .env.local
npm ci
npm run dev
```

Open `http://localhost:3000`.

Do not place private keys or service secrets in variables beginning with
`NEXT_PUBLIC_`. The dedicated Telegraph payer key is testnet-only and must never
be reused for personal funds.

## Quality checks

```bash
npm run lint
npm run typecheck
npm run test:run
npm run build
```

Run all four with `npm run check` before opening a pull request. Work is split
into small checklist-sized branches and reviewed by the other team member before
merge.

## Product limits

The seven-day MVP intentionally excludes mainnet payments, additional chains or
tokens, automatic email or WhatsApp delivery, recurring invoices, partial
payments, escrow, disputes, tax calculation, teams, and currencies beyond NGN,
USD, EUR, and GBP.

## Research and evidence

Telegraph ecosystem research and live-miner compatibility findings are preserved
in [`context`](context). Reverse-engineering notes for comparable open-source
products are preserved in [`research`](research). No reference-project source is
copied into PayProof.
