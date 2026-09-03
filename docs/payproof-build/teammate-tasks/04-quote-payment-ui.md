# Teammate Task 04 — Telegraph quote and Base Sepolia payment UI

## Goal

Build the client experience for a Telegraph-backed 15-minute quote and exact
official test-USDC transfer. This covers the teammate portions of checklist
items 7 and 8.

## Dependency

Start after Task 03 is merged and Ali supplies stable quote/payment DTOs and
actions backed by live Telegraph adapters. Never build against invented rates,
transactions, or production mocks.

## Branch and PR

- Branch: `feat/quote-payment-ui`
- PR title: `feat: build quote and test USDC payment experience`
- Start from the latest `main` after Task 03.

## Work to do

- Build quote loading, ready, expiring, expired, refreshing, and unavailable
  states.
- Display original local amount, rate/rule, exact USDC amount, source, quote
  time, expiry, and an accessible countdown.
- Label USD honestly as nominal `1 USD = 1 test USDC`; do not show a fake Miner.
- Pause payment when non-USD Telegraph evidence is unavailable or expired.
- Build wallet connect, wrong-chain switch, missing test funds guidance, review,
  wallet confirmation, rejected, broadcast/submitted, and recoverable error
  states for Base Sepolia official test USDC.
- Disable duplicate payment actions while a transaction is submitted and show
  the saved transaction hash/explorer path supplied by the action.
- Explain that PayProof never holds, swaps, sells, bridges, or supplies funds.

## Boundaries

Presentation and browser interaction only. Use the lead's exact integer/formatted
DTO values and supplied Viem actions. Do not calculate money with `Number`, edit
the USDC ABI/address, write API routes, change quote/payment persistence, or call
Telegraph directly from the browser.

## Acceptance checklist

- [ ] A changed refreshed quote must be visibly reviewed before payment.
- [ ] Expired/unavailable evidence cannot enable Pay.
- [ ] Exact amount, chain, official token, and recipient are visible pre-sign.
- [ ] Rejection creates no false submitted state; broadcast disables duplicates.
- [ ] Countdown is accessible and does not cause noisy per-second announcements.
- [ ] All states work at 320px, 390px, and desktop with keyboard navigation.
- [ ] Tests and `npm run check` pass; PR includes quote and payment screenshots.

Ali reviews and merges; the teammate must not merge their own PR.
