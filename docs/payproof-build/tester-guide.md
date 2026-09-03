# PayProof Tester Guide — Base Sepolia Testnet

> **CRITICAL WARNING — TESTNET ONLY**
>
> PayProof operates **exclusively** on the **Base Sepolia testnet** (`Chain ID: 84532`).
> Test ETH and test USDC have **zero monetary value**.
> **NEVER** send mainnet funds, real ETH, real USDC, or real fiat.
> **NEVER** provide private keys, recovery seed phrases, or sensitive passwords. PayProof will never request them. Only use disposable test accounts.

---

## 1. Tester Prerequisites

Before testing, ensure you have:
1. **An EVM-Compatible Web3 Wallet**:
   - MetaMask, Rainbow, Coinbase Wallet, or Rabby.
   - Configured for **Base Sepolia** (Chain ID: `84532`, RPC: `https://sepolia.base.org`).
2. **Base Sepolia Test ETH** (for gas fees):
   - Obtain from the official Base Sepolia faucet: `https://www.alchemy.com/faucets/base-sepolia` or `https://faucets.chain.link`.
3. **Official Base Sepolia Test USDC**:
   - Contract Address: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
   - Token Decimals: `6`
   - Symbol: `USDC`
   - Can be minted from Circle's official testnet faucet: `https://faucet.circle.com/` (select Base Sepolia).

---

## 2. Core Testing Journeys

### Path A: Freelancer / Invoice Creator Journey
1. **Connect & Sign In**:
   - Navigate to `/invoices/new` or `/dashboard`.
   - Click **"Connect wallet"** and select your test wallet on Base Sepolia.
   - Sign the free authentication message. This message incurs zero gas and binds the recipient address to your verified wallet so no intermediary can tamper with payout destinations.
2. **Create Local-Currency Invoice**:
   - Choose from supported currencies: **NGN** (Nigerian Naira), **USD** (US Dollar), **EUR** (Euro), or **GBP** (British Pound).
   - Enter your client reference, itemized work description, positive invoice amount (max 2 decimal places), and due date.
3. **Review & Publish**:
   - Review the non-editable summary on the preview dialog.
   - Click **"Publish invoice"**. PayProof generates an unguessable public invoice link (`/i/[publicId]`).
4. **Share & Manage**:
   - Test **"Copy link"** and native **"Share invoice link"**.
   - Navigate to `/dashboard` to confirm your invoice appears in your verified history with status `Awaiting Payment`.

### Path B: Client / Payer Journey
1. **Open Invoice Link**:
   - Open the public invoice link (`/i/[publicId]`) in an incognito window or clean mobile browser.
   - **No login or account creation required.**
   - Confirm public invoice facts (freelancer name, description, reference, local amount, due date) and absence of private creator account IDs.
2. **Review Telegraph Currency Intelligence**:
   - View the live 15-minute conversion quote into Base Sepolia test USDC.
   - Review the conversion rate, locked rule, source Miner name (`FX Rate Mirror` or `Preflight`), and live countdown timer.
3. **Execute Payment**:
   - Connect your test wallet on Base Sepolia. (If connected to another chain, verify the one-click switch prompt).
   - Click **"Review & Pay [amount] test USDC"**.
   - Confirm the transaction in your wallet.
4. **Immediate Hash Persistence**:
   - Notice that the transaction hash is immediately saved on screen with an active link to BaseScan Explorer (`https://sepolia.basescan.org/tx/[hash]`).
5. **Telegraph Settlement Verification**:
   - Click **"Check verification status"**.
   - Telegraph intelligence checks on-chain transfer facts (exact chain 84532, official test USDC token, recipient address, exact units, and transaction success).
6. **Permanent Verified Receipt**:
   - Once verified, the page permanently transitions to **"Telegraph Verified Receipt"** with a green badge `✓ Verified Receipt`.
   - Review locked facts, payer wallet address, verification timestamp, and Telegraph provenance (miner name, role, observation time, source record).
   - Test **"Print / Save PDF"** (`window.print()`) and **"Share receipt"**.

---

## 3. Failure & Recovery Testing

Please actively exercise and document the following failure modes:

| Scenario | How to Trigger | Expected Truthful Behavior |
|---|---|---|
| **Wallet Rejection** | Click Pay, then click "Reject" / "Cancel" in your wallet | Honest alert: *"Transaction cancelled in wallet. No test USDC was sent."* Payment paused, zero transaction stored. |
| **Expired Quote** | Wait for 15-minute countdown to reach `00:00` | Countdown displays `Quote Expired`. Pay button disables with *"Quote expired — Refresh to pay"*. Refresh recalculates quote. |
| **Wrong Network** | Switch wallet to Ethereum Mainnet or Sepolia | Clear warning with one-click **"Switch to Base Sepolia"** button. Payment disabled until on chain 84532. |
| **Payment Mismatch** | Send incorrect test USDC amount via raw wallet transfer to recipient | Honest alert: *"Payment Mismatch Detected"*. Displays side-by-side **Comparison Table** highlighting failed requirement. Never marks paid or verified. |
| **Telegraph Unavailable** | Temporary network or intelligence outage | Reassuring notice: *"Trustworthy Telegraph evidence is temporarily unavailable. The saved transaction hash is safe to retry."* Hash retained, cooldown timer active. |

---

## 4. Safe Failure Reporting

If you encounter an unexpected error, layout defect, or unhandled rejection:
1. **Never disclose private keys, secret phrases, or server environment variables.**
2. Note your browser type and device viewport (desktop, 390px mobile, 320px small mobile).
3. Record the public invoice URL and Base Sepolia transaction hash (if applicable).
4. File a report using the [Issue Reproduction Template](issue-report-template.md).

---

## 5. Tester Observation & Consent Policy

All testing data collected for the Telegraph Hackathon Season I Track 3 evaluation adheres to strict privacy standards:
- **Separation of Activity**: Internal development/smoke tests are strictly tagged `internal` and distinguished from genuine external tester feedback.
- **No Private Data Stored**: Invoices and receipts display only public on-chain wallet addresses, currency amounts, references, and Telegraph verification proofs.
- **Voluntary Feedback**: Any quotes, impressions, or usability feedback submitted by testers will only be included in judging documentation with explicit tester consent.
