# PayProof Base Sepolia Miner Compatibility

Probe time: **2026-09-01 05:48–05:54 UTC / 06:48–06:54 WAT**.

## Outcome

PayProof's Base Sepolia flow is technically possible with live Telegraph
Miners. At least two transaction Miners decoded an actual Base Sepolia USDC
transfer, and at least two registered gas Miners returned chain-correct fee
data.

The present **automatic routing path is not safe for PayProof**, because the
Engine API specification says `/v1/ask` selects the top two ranked Miners, while
the current top two `ONCHAIN_TX_LOOKUP` Miners failed the Base Sepolia test. The
official `/v1/ask/{miner_id}` direct route can target compatible Miners and is
x402-gated on Base Sepolia. Organizers subsequently confirmed that a Track 3
application may use this route and the application remains judgeable, but the
direct calls do not count toward Miner request-volume requirements.

No x402 payment was made during these probes.

## Evidence Boundaries

- Direct Miner endpoint calls test input/output compatibility only.
- They do not prove paid Engine routing, validator consensus, or final Track 3
  accounting.
- Ranking is a snapshot from epoch 298 and can change.
- A result that labels an answer `base-sepolia` but uses another chain's block
  height is treated as a failure.

## Test Inputs

### Base Sepolia network

- Chain ID: `84532`
- Public RPC used for independent ground truth: `https://sepolia.base.org`

### Confirmed native transfer

`0x661c2d87607b6d8ad88cd6fb2b3d3f13686cc0c875b410da88d9081f61b40721`

Independent RPC ground truth:

- block `46236673`;
- successful native ETH transfer;
- 21,000 gas used.

### Confirmed test USDC transaction

`0xe48e753799e30db9d85d1c4ec627bfff0f4117cd7a8c2beb2f8f8b9a13dac7d2`

Circle's official Base Sepolia USDC contract is
[`0x036CbD53842c5426634e7929541eC2318f3dCF7e`](https://developers.circle.com/stablecoins/usdc-contract-addresses).
The tested receipt contains two transfers from this contract:

- `500000` base units = `0.5` test USDC;
- `2500` base units = `0.0025` test USDC.

Circle states that testnet USDC has no financial value.

## `ONCHAIN_TX_LOOKUP` Results

| Epoch-298 rank | Miner | Result | PayProof suitability |
|---:|---|---|---|
| 1 | TxLens (`9002`) | Returned `not_found` for both confirmed Sepolia transactions | Fail |
| 2 | DegenLens (`10002`) | Returned an internal validation error for Sepolia aliases | Fail |
| 3 | ChainSight (`302`) | Silently queried Base mainnet and returned not found | Fail |
| 4 | Veyctum (`9005`) | Rejected the Sepolia input; expects Base | Fail |
| 5 | Truvian (`8453`) | Correct chain/block/status and decoded both USDC transfers | **Pass** |
| 7 | Preflight (`20260828`) | Correct chain/block/status and fee, but did not expose ERC-20 transfers | Partial pass |
| 9 | Sigil (`9010`) | Explicitly reported Base Sepolia unsupported | Fail, but honest |
| 10 | INTERLOCK (`9007`) | Correct chain/block/status and decoded both USDC transfers | **Pass** |

Other registered endpoints returned a transport error, 404, or exposed a
different analysis shape during the probe.

### Payment-verification rule

PayProof must not mark an invoice paid merely because the transaction status is
successful. It must find a transfer event where all of these match:

```text
chain_id == 84532
token == official Base Sepolia USDC contract
recipient == invoice recipient
amount >= invoice USDC amount in six-decimal base units
transaction status == success
```

Truvian and INTERLOCK returned enough structured evidence for that rule on the
tested transaction. Preflight alone did not.

## `GAS_PRICE` Results

Independent Base Sepolia RPC ground truth during the test was approximately
`0.006 gwei` at block `46236711`.

| Epoch-298 rank | Miner | Result | PayProof suitability |
|---:|---|---|---|
| 1 | Kriterion (`152`) | Ignored Base Sepolia and returned Ethereum gas | Fail |
| 2 | GasWire (`7301`) | Transport failure during probe | Unproven |
| 3 | OnChain Intel (`900`) | Documented direct endpoint returned 404 | Fail in tested form |
| 4 | Truvian (`8453`) | Correct chain ID, block, gas, base fee, and priority fee | **Pass** |
| 5 | GasPulse (`147115`) | Correct chain ID, block, gas, base fee, and priority fee | **Pass** |
| 7 | TxLens (`9002`) | Labeled result Sepolia but returned a conflicting block height | Fail closed |
| 8 | ChainSight (`302`) | Silently returned Base mainnet data | Fail |

Preflight also returned correct Base Sepolia gas data through its public
endpoint, but its current registration does not declare `GAS_PRICE`, so it is
not counted as a registered gas candidate here.

Gas cost is useful context, not the core proof of payment. If necessary it can
be removed from the first PayProof scope without harming invoice verification.

## `CURRENCY_EXCHANGE` Recheck

The NGN/USD tests used `250000 NGN` as the example amount.

| Epoch-298 rank | Miner | Result | PayProof suitability |
|---:|---|---|---|
| 1 | Kriterion (`152`) | No validated evidence admitted for NGN | Fail |
| 2 | ChainSight (`302`) | Structured rate `0.000748` was usable, but prose rounded it to `0.0 USD` | Pass only with structured fields |
| 3 | FX Rate Mirror (`20260827`) | Rate `0.000748`, live and corroborated | **Pass** |
| 4 | Preflight (`20260828`) | Converted `250000 NGN` to about `186.88 USD` with inverse rate and timestamp | **Pass** |

The application must format the structured decimal itself and never display the
ChainSight prose for small unit rates.

## Routing Finding

The official
[`engine.yaml`](https://github.com/telegraphprotocol/telegraph-api-docs/blob/main/openapi/engine.yaml)
says auto-routed `POST /v1/ask` chooses the top two ranked Miners, trying the
primary and then the fallback. With the epoch-298 snapshot:

- the top two transaction Miners both failed Base Sepolia;
- the top gas Miner returned Ethereum and the second was unreachable;
- the top FX Miner failed, while the second had usable structured data.

The official
[`POST /v1/ask/{miner_id}`](https://github.com/telegraphprotocol/telegraph-api-docs/blob/main/openapi/engine.yaml)
route skips LLM routing and forwards a caller-provided method, endpoint, and
payload to a selected Miner. A no-payment request to the live node for Truvian
returned the expected HTTP 402 challenge:

- price: `$0.01` test USDC;
- payment network: Base Sepolia / `eip155:84532`;
- requested Miner: Truvian `8453`;
- no payment was submitted.

## Organizer Clarification Received

Organizers clarified that direct calls, including Telegraph x402-gated direct
calls, do not count toward Miner judging requirements because direct selection
could be abused to inflate Miner traffic. A Track 3 agent or application may
still use direct x402 requests, and the application project will be judged.

## Current Decision

PayProof remains viable.

Use:

- FX Rate Mirror or Preflight for the conversion;
- Truvian or GasPulse for gas if gas remains in scope;
- Truvian or INTERLOCK for exact USDC payment verification.

Use automatic routing where it produces chain-correct intelligence, but never
use it merely to manufacture volume. Use the official direct x402 route for
the Base Sepolia verification Miner that fits the application. Report direct
and auto-routed calls separately, and treat genuine users and completed invoice
workflows as PayProof's primary adoption evidence.

## Documentation Lookup Note

The required Context7 lookup had no matching entry for this Telegraph Protocol;
its results referred to unrelated Telegraph publishing and Telegram packages.
The API conclusions therefore use Telegraph's official OpenAPI repository and
official MCP documentation as the primary references.
