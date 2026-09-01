# PayProof Interface Direction

## Product feeling

PayProof should feel like a dependable invoice product first and a Web3 product
second. The interface is calm, bright, and exact: familiar financial documents,
plain-language actions, and visible proof only where it matters.

The generated reference boards are:

- `payproof-landing-concept.png` — landing page hierarchy and receipt preview.
- `payproof-product-flow-concept.png` — invoice creation and mobile payment flow.

These boards define direction, not literal product data. Dates, amounts, wallet
addresses, and status text in the implementation must come from real application
state.

## Visual tokens

| Role | Token | Value |
| --- | --- | --- |
| Canvas | `--color-canvas` | `#ffffff` |
| Soft surface | `--color-surface` | `#f4f7fb` |
| Navy text | `--color-ink` | `#07162f` |
| Muted text | `--color-muted` | `#5d6b82` |
| Primary blue | `--color-primary` | `#1459f5` |
| Primary hover | `--color-primary-strong` | `#0a46d4` |
| Pale blue | `--color-primary-soft` | `#eaf1ff` |
| Border | `--color-border` | `#dce4ef` |
| Success | `--color-success` | `#087a55` |
| Success surface | `--color-success-soft` | `#e9f8f1` |
| Warning | `--color-warning` | `#9a6400` |
| Warning surface | `--color-warning-soft` | `#fff7df` |
| Error | `--color-danger` | `#c9362b` |

- Body type uses a dependable system sans stack with compact tracking.
- Display type uses the same family at heavier weight so loading never depends
  on an external font request.
- Content width is `1180px`; reading width is approximately `680px`.
- Spacing follows a 4px base with primary intervals of 8, 12, 16, 24, 32, 48,
  64, and 96px.
- Controls use 10px corners. Cards use 16px corners. Pills are reserved for
  real states such as `Base Sepolia` and `Verified`.
- Shadows are restrained and only communicate elevation or document layering.

## Landing hierarchy

1. A slim, persistent testnet notice says that no real funds are used.
2. Navigation contains the PayProof wordmark, `How it works`, `Create an
   invoice`, and `View my invoices`.
3. The hero explains the complete product in one sentence and repeats the two
   primary actions.
4. A code-native invoice-to-receipt preview demonstrates the outcome without
   pretending to be a live transaction.
5. A three-step explanation names create, pay, and verify.
6. Trust copy explains that PayProof never holds funds and that Telegraph checks
   the real Base Sepolia transaction.

## Voice and copy rules

- Lead with invoice language: client, amount, due date, payment, receipt.
- Explain blockchain terms at the moment they become useful.
- Always say `Base Sepolia testnet` and `test USDC` near payment actions.
- Never say a payment is verified until all required on-chain facts match.
- Never imply that PayProof converts, swaps, holds, or supplies currency.
- Describe Telegraph as the independent intelligence layer used to check the
  payment, not as decorative branding.
- Use `Telegraph-verified receipt` only for the completed, matched state.

## Responsive behavior

- At 960px and above, the hero is a two-column layout with the proof preview on
  the right.
- Below 960px, copy and preview stack; primary actions remain visible without
  horizontal scrolling.
- Below 680px, navigation reduces to the wordmark and one primary action; cards
  use smaller padding and action buttons become full-width.
- No essential meaning depends on hover, color alone, or wallet-address width.

## Accessibility baseline

- Maintain WCAG AA text contrast.
- Use semantic landmarks, headings, links, and buttons.
- Keep focus rings visible and keyboard order equal to visual order.
- Pair every status color with text and, where useful, an icon.
- Respect reduced-motion preferences; animation is optional and never blocks an
  action.

## Reusable interface inventory

- Testnet notice
- Site header and PayProof wordmark
- Primary and secondary actions
- Invoice document card
- Quote summary
- Network/status pill
- Verification checklist
- Wallet address display and copy action
- Empty, loading, unavailable, mismatch, cancelled, overdue, and verified states
- Share and print actions

The first implementation slice will build only the inventory needed by the
landing shell. Later checklist items will extend the same tokens and components
instead of introducing a second visual language.
