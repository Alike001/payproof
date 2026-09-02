# PayProof Paid Telegraph Smoke Setup

This setup is required only for the server-side Telegraph x402 wallet. Do not
use a personal or main wallet, and do not paste its private key into chat,
Discord, a GitHub issue, a commit, or a screenshot.

1. Create a new disposable EVM account dedicated to PayProof testnet inference.
2. Put its `0x`-prefixed private key in the ignored local file `.env.local`:

   ```text
   TELEGRAPH_EVM_PRIVATE_KEY=0x...
   ```

3. Copy the non-secret Telegraph defaults from `.env.example` into `.env.local`.
4. Fund the disposable account with at least `0.10` Circle Base Sepolia test
   USDC using <https://faucet.circle.com>. The official token contract is
   `0x036CbD53842c5426634e7929541eC2318f3dCF7e`. Test USDC has no financial
   value. The planned six-call smoke costs about `0.06` test USDC at the current
   `0.01` price per call.
5. Do not add mainnet funds. x402 uses a gasless EIP-3009 authorization for the
   payer, so the inference smoke does not require Base Sepolia ETH.

When the wallet is configured and funded, run:

```bash
npm run test:live:telegraph
```

The suite calls FX Rate Mirror for NGN/EUR/GBP, Preflight for backup FX, and
Truvian plus INTERLOCK for the known Base Sepolia transaction. It stores only
redacted call records and normalized settlement transaction hashes.
