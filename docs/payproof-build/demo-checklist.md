# PayProof Demo Checklist — Telegraph Track 3

## 1. Executive Summary & 30-Second Story

> **Problem**: A freelancer and client can see that a wallet transaction happened, but a screenshot or raw transaction hash does not by itself prove that the correct invoice was paid using the expected chain, token, recipient, and amount.
>
> **Solution**: PayProof is a testnet invoicing application where a freelancer invoices in local currency, the client pays official test USDC directly on Base Sepolia, and Telegraph currency & transaction intelligence verifies the exact on-chain settlement before locking the URL into a permanent verified receipt.

---

## 2. Pre-Flight Preparation Checklist

Complete these checks 15 minutes before the demo:
- [ ] **Application Health**: Verify `/api/health` returns HTTP `200` with `status`, `database`, `telegraphConfig`, and `baseSepolia` all set to `"ready"`.
- [ ] **Freelancer Wallet**: Disposable wallet available for the free sign-in signature. Creating an invoice does not require gas.
- [ ] **Client Wallet**: Disposable wallet funded with Base Sepolia test ETH and official test USDC (`0x036CbD53842c5426634e7929541eC2318f3dCF7e`).
- [ ] **Clean Browser Context**:
  - Window A (Freelancer): Desktop browser at `/invoices/new`.
  - Window B (Client): Incognito or mobile browser window (390px viewport).
  - Window C (Explorer): BaseScan Base Sepolia explorer (`https://sepolia.basescan.org`).
- [ ] **Outage / Fallback Recovery Ready**:
  - Bookmark one prior real verified receipt as backup demonstration.
  - Confirm production analytics flags internal test wallets with `internal` tag.

---

## 3. Live 2-Minute Demo Script

### Phase 1: Freelancer Invoicing (0:00 – 0:30)
1. **Explain the Non-Custodial Advantage**:
   - Freelancer connects wallet on Base Sepolia and signs a free authentication message.
   - Highlight: The recipient address is automatically locked to the verified wallet, eliminating dangerous copy-paste errors and address spoofing.
2. **Create Invoice**:
   - Set currency to **NGN** (e.g. `₦450,000.00`) or **EUR** (`€300.00`).
   - Add description: `"Smart Contract Security Audit & Architecture"`.
   - Set due date and click **"Review & Publish"**.
3. **Copy Public Link**:
   - Copy the unguessable link (`/i/[publicId]`).
   - Note: Possession of the unguessable link is public access; no client login required.

### Phase 2: Client View & Telegraph Currency Intelligence (0:30 – 1:00)
1. **Open as Client**:
   - Paste link into Window B (mobile viewport 390px).
   - Point out responsive mobile layout and strict absence of private creator IDs.
2. **Telegraph FX Quote**:
   - Show live 15-minute conversion quote into test USDC.
   - Point to Telegraph Miner provenance: `FX Rate Mirror` or `Preflight`.
   - Point out the active 15-minute countdown badge (`aria-live` accessible).
   - *(Optional note)*: If USD invoice, point out nominal `1 USD = 1 test USDC` testnet parity rule without fake FX calls.

### Phase 3: Base Sepolia Payment & Hash Persistence (1:00 – 1:30)
1. **Connect Client Wallet**:
   - Connect client wallet on Base Sepolia.
   - Point out clear testnet notice (Test USDC has no monetary value).
2. **Broadcast Transaction**:
   - Click **"Review & Pay [amount] test USDC"**.
   - Approve ERC-20 `transfer` in wallet.
3. **Immediate Persistence**:
   - Notice: As soon as the transaction hash is received, PayProof saves it immediately.
   - Show the saved transaction hash and click the link to inspect it on BaseScan Explorer.
   - Point out: PayProof never touches funds; funds flow directly wallet-to-wallet.

### Phase 4: Telegraph Settlement Verification & Permanent Receipt (1:30 – 2:00)
1. **Check Verification Status**:
   - Click **"Check verification status"**.
   - Telegraph intelligence inspects the mined Base Sepolia transaction.
2. **Permanent Verified Receipt**:
   - The same public URL transforms into **"Telegraph Verified Receipt"** with green badge `✓ Verified Receipt`.
   - Point out locked invoice facts: non-editable reference, original local amount, verified test USDC settlement, payer address, recipient address, and timestamp.
   - Highlight **Telegraph Provenance Box**: Miner Name, Miner ID, Attempt Role, and Observation Time.
3. **Receipt Actions**:
   - Demonstrate **"Print / Save PDF"** (`@media print` cleanly removes UI buttons and testnet banners).
   - Demonstrate **"Share receipt"** with native share and clipboard fallback.

### Phase 5 (Optional): Failure & Recovery Showcase (30s Bonus)
- **Payment Mismatch Demo**:
  - Show the recorded real mismatch where the quote required `0.037500 test USDC` and the transfer contained `0.037499 test USDC`.
  - Highlight the side-by-side **Comparison Table** (`Expected` vs `Observed`), failed requirement breakdown, and **"Retry with the exact payment"** recovery action.
  - Explain: PayProof never issues a receipt for partial or invalid payments.

---

## 4. Judging Criteria Mapping

| Judging Criterion | Weight | How It Is Proven In This Demo |
|---|---|---|
| **Adoption & Real Usage** | 45% | Complete real journeys on Base Sepolia; honest funnel distinguishing internal developer tests from genuine external testers; consent-safe feedback. |
| **Usefulness & Telegraph Depth** | 25% | Telegraph FX Miner directly controls payable amount; Telegraph transaction intelligence controls receipt issuance; paid x402 calls. |
| **Project Updates & Communication** | 25% | Transparent technical progress, x402 settlement links, BaseScan explorer links, and honest failure recovery tagged `@Telegraphprotoc` on X. |
| **Execution & Code Quality** | 5% | All configured quality checks and real-route Playwright journeys pass; coverage is measured and reported separately without claiming 100%; strict TypeScript, integer/decimal money arithmetic, server-only secret isolation, and responsive 320px/390px/desktop layouts. |
