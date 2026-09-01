# Teammate Task 03 — Public invoice, sharing, and lifecycle UI

## Goal

Build the client-facing public invoice page at `/i/[publicId]` and the sharing,
cancelled, and overdue presentation from checklist item 6.

## Dependency

Start after Task 02 is merged and the lead supplies the sanitized public-invoice
DTO. This task must not read a database row directly or expose creator-only data.

## Branch and PR

- Branch: `feat/public-invoice-ui`
- PR title: `feat: build public invoice and sharing experience`
- Start from the latest `main` after Task 02.

## Work to do

- Render reference, freelancer name, non-sensitive client reference when
  present, description, original local amount, due date, recipient summary, and
  lifecycle state from the public DTO.
- Add a prominent Base Sepolia/test-USDC/no-real-funds notice.
- Add the privacy reminder that anyone with the unguessable link can view its
  public fields; never show email, phone, or private dashboard data.
- Add native Share where supported and Copy link fallback with accessible
  success/error feedback.
- Present Open, Overdue, Cancelled, and already-Verified entry states. Overdue
  remains payable; Cancelled permanently disables payment.
- Add not-found, temporary-unavailable, and loading states without inventing an
  invoice or showing raw server errors.

## Boundaries

You may change the public invoice route, presentation components/CSS, UI tests,
and screenshots. Use only the supplied DTO and action functions. Do not query
Supabase from the browser, change public-read authorization, add quote/payment
logic, or add mocks to a production path.

## Acceptance checklist

- [ ] Public viewing requires no login or wallet connection.
- [ ] No private creator/session/database field reaches the rendered page.
- [ ] Share works with native share and copy fallback.
- [ ] Cancelled disables payment; Overdue does not.
- [ ] Missing/invalid links reveal no existence-sensitive diagnostics.
- [ ] Mobile 320px/390px and desktop layouts have no overflow.
- [ ] Keyboard, focus, announcements, tests, and `npm run check` pass.
- [ ] PR includes screenshots for Open, Overdue, Cancelled, and not-found.

Abu reviews and merges; the teammate must not merge their own PR.
