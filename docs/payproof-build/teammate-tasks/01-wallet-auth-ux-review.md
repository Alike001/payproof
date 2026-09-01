# Teammate Task 01 — Wallet-auth UX and accessibility review

## Goal

Make the wallet access step understandable and comfortable on a phone without
changing how authentication or wallet verification works.

This is a real pull-request task for PayProof's second teammate. Abu remains the
reviewer and merge owner.

## Start here

1. Pull the latest `main` at commit `5db0110` or newer.
2. Create branch `feat/wallet-auth-ux-review`.
3. Read the wallet section of `docs/payproof-build/prd.md` and checklist item 3.
4. Open `/invoices/new` and `/dashboard` at desktop and mobile widths.

## Work to do

- Review and improve the plain-language wording that explains the difference
  between **Connect wallet** and **Sign in free**.
- Add a compact, accessible “What am I signing?” disclosure using native HTML
  semantics. It must explain that the signature:
  - proves control of the public wallet address;
  - costs no gas and sends no transaction;
  - cannot move USDC or other funds.
- Improve keyboard and screen-reader feedback for connecting, switching network,
  waiting for a signature, cancellation, success, and sign-out states.
- Check the authenticated and signed-out layouts at `320px`, `390px`, and
  desktop width. Fix wrapping, spacing, touch-target, or overflow problems.
- Capture before/after mobile and desktop screenshots and attach them to the PR.

## Files you may change

- `src/features/auth/wallet-auth-card.tsx`
- `src/features/auth/wallet-auth-card.module.css`
- `src/components/workspace-shell.module.css`
- New presentation-only components or CSS inside `src/features/auth/`
- New screenshots inside `docs/payproof-build/design/renders/`

## Do not change

- `creator-identity.ts` or `creator-session.server.ts`
- `src/proxy.ts`
- Wagmi, RainbowKit, Supabase, chain, or environment configuration
- Database migrations, RLS policies, money helpers, or generated types
- Package dependencies or lockfiles
- Any Telegraph/x402 code

If a security or authentication change seems necessary, describe it in the PR
instead of implementing it.

## Acceptance checklist

- [ ] A new visitor can explain “connect” versus “sign” after reading the card.
- [ ] The UI still says Base Sepolia, test USDC, and no real funds.
- [ ] Signature cancellation remains a safe, recoverable state.
- [ ] Loading/status changes are announced accessibly and buttons cannot be
      double-submitted while busy.
- [ ] No horizontal overflow occurs at 320px or 390px.
- [ ] All changed controls are usable by keyboard and have visible focus.
- [ ] `npm run check` passes with no warning.
- [ ] The PR includes desktop/mobile evidence and a short summary of manual
      keyboard checks.

## Pull request handoff

Open the PR against `main` and request Abu's review. Use this title:

`feat: improve wallet authentication UX`

Do not merge it yourself. Abu will review the diff, run the checks, and merge it
after confirming that the verified-session security behavior is unchanged.
