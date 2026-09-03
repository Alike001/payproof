# PayProof Issue Reproduction & Report Template

> **Privacy & Security Notice**:
> - **DO NOT** post private keys, seed phrases, or sensitive passwords.
> - **DO NOT** commit `.env.local` or raw authentication tokens.
> - Mask any personal contact details or private billing information.

---

## Issue Metadata

- **Date / Time Reported**: YYYY-MM-DD HH:MM UTC
- **Tester Type**: `[ ] Internal Teammate  |  [ ] External Tester`
- **Environment**: `[ ] Local (localhost:3000)  |  [ ] Staging  |  [ ] Production Deploy`
- **Device & OS**: (e.g., macOS 14.5, Ubuntu 24.04, iOS 17.5, Android 14)
- **Browser & Viewport**:
  - `[ ] Desktop (1280px+)`
  - `[ ] Standard Mobile (390px — iPhone)`
  - `[ ] Small Mobile (320px)`
  - Browser Name & Version: (e.g. Chrome 128, Safari 17, Brave)
- **Connected Wallet & Network**:
  - Wallet: (e.g., MetaMask Mobile, Rainbow, Rabby, Coinbase Wallet)
  - Chain: Base Sepolia (`Chain ID: 84532`)
- **User Role**: `[ ] Freelancer (Creator)  |  [ ] Client (Payer)  |  [ ] Observer / Judge`

---

## Defect Classification

- **Category**:
  - `[ ] Currency Quote / FX Intelligence (Telegraph)`
  - `[ ] Base Sepolia Wallet / Transaction Signing`
  - `[ ] Payment Verification / Exact Verifier`
  - `[ ] Receipt Generation / Print / Sharing`
  - `[ ] Responsive Layout / Overflow / Visual Glitch`
  - `[ ] Accessibility / Keyboard Navigation`
  - `[ ] Other`
- **Severity**:
  - `[ ] Blocker (Cannot complete payment or issue receipt)`
  - `[ ] Major (Feature fails with confusing or missing error)`
  - `[ ] Minor (Cosmetic defect, typo, or minor styling issue)`

---

## Reproduction Details

### 1. Invoice & Transaction References
- **Invoice Reference**: (e.g., `INV-2026-042`)
- **Public Invoice ID / URL**: (e.g., `https://payproof.example/i/a1b2c3d4-...`)
- **Base Sepolia Transaction Hash** *(if broadcast)*: (e.g., `0x1234...`)
- **BaseScan Explorer Link**: `https://sepolia.basescan.org/tx/...`

### 2. Steps to Reproduce
1. Go to `...`
2. Connect wallet `0x...`
3. Enter amount `...` and currency `...`
4. Click `...`
5. Observe error

### 3. Expected Behavior
*(What should have happened truthfully according to specification)*
> Example: Clicking "Reject" in MetaMask should display "Transaction cancelled in wallet. No test USDC was sent." and keep the invoice open for payment without recording a transaction hash.

### 4. Observed Behavior
*(What actually happened)*
> Example: Page displayed an unhandled exception banner instead of the safe rejection notice.

---

## Logs and Screenshots

### Sanitized Console / Network Error
```text
// Paste redacted error logs from DevTools console or network tab
```

### Visual Evidence
Attach screenshot or screen recording here *(ensure wallet private keys and sensitive personal data are completely redacted)*.
