# Teammate Task 02 — Invoice creation and creator dashboard UI

## Goal

Build the freelancer-facing invoice form, review step, publication result, and
invoice-history presentation against the lead-provided DTO/actions. This task
implements the teammate portion of checklist item 6.

## Dependency

Start only after Task 01 is merged and Ali posts the accepted invoice DTO/action
contract in this issue. Never invent a temporary API or mock production data.

## Branch and PR

- Branch: `feat/invoice-creator-ui`
- PR title: `feat: build invoice creator experience`
- Base the branch on the latest `main`; do not reuse the Task 01 branch.

## Work to do

- Build the create form for freelancer name, optional non-sensitive client
  reference, work description, amount, NGN/USD/EUR/GBP, and due date.
- Do not add a receiving-address field; show the verified session wallet as the
  read-only recipient.
- Add field-level validation presentation using errors returned by the accepted
  schema/action contract. Do not duplicate money validation with JavaScript
  floating-point logic.
- Add a review-before-publish step and public-link success state.
- Build dashboard empty, loading, error, and invoice-list states with reference,
  local amount, due date, and status.
- Add responsive status badges for Open, Overdue, Cancelled, Mismatch, and
  Verified. Overdue must not look disabled.
- Add presentation for open, copy-link, duplicate, and eligible cancel actions;
  wire only the actions supplied by the lead.

## Boundaries

You may change invoice presentation components, `/invoices/new`, `/dashboard`,
their CSS, UI tests, and screenshots. Do not change migrations, RLS, server-only
auth, money helpers, API/action implementation, or Telegraph code. Do not add a
package without discussing it in the issue first.

## Acceptance checklist

- [ ] All four supported currencies appear and no others do.
- [ ] Amount error states cover empty, zero, negative, exponent, and more than
      two decimal places without client-side floating-point conversion.
- [ ] Recipient wallet is read-only and comes from the verified session.
- [ ] Review is required before publish; published facts are not editable.
- [ ] Empty/history/status/action states work at 320px, 390px, and desktop.
- [ ] Keyboard focus, labels, error association, and touch targets pass review.
- [ ] Tests and `npm run check` pass.
- [ ] The PR includes mobile/desktop screenshots and lists every DTO/action used.

Ali reviews and merges; the teammate must not merge their own PR.
