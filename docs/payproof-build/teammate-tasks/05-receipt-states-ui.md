# Teammate Task 05 — Verification, mismatch, and permanent receipt UI

## Goal

Turn the public invoice link into an understandable Telegraph-verified testnet
receipt while presenting every non-success state honestly. This implements the
teammate portion of checklist item 9.

## Dependency

Start after Task 04 is merged and the lead supplies the final public-state and
receipt DTOs plus stable verification result codes.

## Branch and PR

- Branch: `feat/verified-receipt-ui`
- PR title: `feat: build Telegraph verified receipt states`
- Start from the latest `main` after Task 04.

## Work to do

- Build Submitted/Pending, Verification unavailable, Mismatch, Cancelled,
  Overdue, and Verified views from the supplied public state.
- Give mismatch states a clear failed fact—chain, token, recipient, amount, or
  transaction status—without implying payment succeeded.
- Preserve and show retry affordances only when the supplied state permits it.
- Build the final receipt with invoice facts, locked rate, exact USDC amount,
  payer, recipient, transaction hash, verification time, Telegraph provenance,
  and Base Sepolia explorer link.
- Add Copy link, native Share fallback, and clean browser print/save styling.
- State clearly that PayProof verified payment facts only—not work delivery,
  identity, tax, quality, or dispute resolution.

## Boundaries

Do not parse Miner responses, inspect RPC output, decide verification, map raw
errors, or edit finalized payment facts. UI renders the lead's sanitized and
already-normalized state only. Do not create any local “verified” fallback.

## Acceptance checklist

- [ ] Only the supplied `verified` state uses verified styling/language.
- [ ] Every mismatch names the failed requirement and never looks paid.
- [ ] Unavailable retains the hash and provides safe retry wording.
- [ ] Verified receipt facts and evidence links are complete and non-editable.
- [ ] Print view is readable and removes navigation/actions appropriately.
- [ ] Mobile/desktop, keyboard, share, print, tests, and `npm run check` pass.
- [ ] PR contains screenshots for Verified, Mismatch, Unavailable, and print.

Ali reviews and merges; the teammate must not merge their own PR.
