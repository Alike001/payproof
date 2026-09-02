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

### 2026-09-01 paid Engine compatibility spike

PayProof configured and funded a disposable service wallet, then exercised one
capped NGN call through the official direct Engine route for FX Rate Mirror
`20260827`. The request envelope was:

```json
{
  "method": "GET",
  "endpoint": "/rate",
  "payload": { "from": "NGN", "to": "USD" }
}
```

The unpaid response supplied the expected x402 v2 `exact` challenge for
`eip155:84532`, official Circle Base Sepolia USDC, and `10000` base units. The
paid retry used an EIP-3009 `TransferWithAuthorization` signature, the domain
name/version from the challenge, a 30-second backward clock allowance, a
five-minute validity window, and Telegraph's documented compatibility envelope
with top-level `scheme` and `network` fields. The private key, signature,
authorization, and raw payment header were never logged or persisted.

Two controlled attempts failed closed:

- the first reached PayProof's original 10-second response timeout;
- the second, with a documented 30-second devnet timeout, returned HTTP 402
  after about 19.7 seconds with no response body or settlement proof.

Both attempts were recorded as `paid_error`. The service-wallet balance stayed
at exactly 20 test USDC and no settlement transaction was stored. No further
paid retries should be made until the Telegraph team reviews the sanitized
request shape and server-side payment-verification logs. This is a current
Engine/x402 integration blocker, not proof that the Miner adapter itself is
invalid; the Miner's read-only public endpoint still returns structured data
that passes PayProof's strict adapter.

### Post-spike official integration-guide correction

After the paid spike, Telegraph published/promoted its official **Integrate
Out** page and the updated **Paying with x402** guide. Context7 has no matching
entry for Telegraph Protocol, so the official site, official docs repository,
and Telegraph-owned example repository were checked directly.

#### Verified facts

- Auto-routing remains `POST /engine/v1/ask` with a natural-language query.
- A specific Miner remains `POST /engine/v1/ask/:subnet_id` with
  `{ method, endpoint, payload }`; this confirms PayProof's corrected request
  envelopes.
- The x402 guide says to use the official `@x402/*` client rather than manually
  construct the EIP-712 payload. It warns that malformed payloads receive a bare
  HTTP 402 that is indistinguishable from an unpaid request.
- The guide's standard flow retries the exact same request with the library's
  base64 `PAYMENT-SIGNATURE` and reads `PAYMENT-RESPONSE` as settlement proof.
- Telegraph's official example applications use `x402Client`, register an exact
  chain scheme, and wrap or encode fetch through the standard x402 packages.
- The integration page currently mentions `GET /engine/v1/miners`, while the
  more detailed x402 guide identifies `GET /api/miners` as the live discovery
  source. PayProof should keep using the endpoint proven against the live node
  and treat this documentation difference as an open question.

#### Implementation inference

PayProof's first standard-library paid retry reached Miner endpoint validation
and returned the precise undeclared-endpoint error. That is evidence the node
accepted its payment payload before rejecting the old request shape. The later
bare 402 responses appeared only after a custom compatibility envelope was
introduced. PayProof therefore removes the hand-built envelope and restores the
standard x402 payload generator/encoder while retaining its separate pre-sign
origin, network, asset, amount, atomic-budget, and idempotency gates.

#### Remaining unknown

The organizer reported that the server-side issue was resolved. A controlled
NGN retry then obtained the unpaid challenge but stopped before payment signing
because PayProof could not reserve the spend without its Supabase admin
configuration and atomic spend-ledger migration. No paid retry was submitted.
Live compatibility remains unproven until the database-backed reservation path
is configured and the controlled retry completes without bypassing that guard.

### 2026-09-01 unpaid x402 recheck

An unpaid `POST https://devnode.telegraphprotocol.com/engine/v1/ask/8453`
returned HTTP 402 with x402 v2, `eip155:84532`, Circle Base Sepolia USDC,
`10000` base units, and the documented Telegraph receiver. The challenge's
resource URL was `http://devnode.telegraphprotocol.com/v1/ask/8453`: the same
official host, but with the node's internal HTTP scheme and its `/engine` proxy
prefix removed. PayProof therefore permits only this narrowly matched same-host
rewrite while requiring the actual outbound request and configured node origin
to use HTTPS. A different host, Miner path, query, fragment, network, or asset
still fails before signing. No payment signature was created or submitted.

### 2026-09-01 paid recheck after organizer resolution

The standard `@x402/*` flow subsequently passed paid, strictly parsed calls for:

- FX Rate Mirror `20260827`: NGN/USD and GBP/USD;
- PREFLIGHT `20260828`: NGN/USD backup evidence;
- Truvian `8453`: the known Base Sepolia transaction; and
- INTERLOCK `9007`: the same known Base Sepolia transaction.

Each successful call charged 10,000 test-USDC base units and persisted a Base
Sepolia settlement transaction plus Telegraph signal hash. Both transaction
Miners reported chain 84532, successful mined status, and official-USDC transfer
evidence that passed the independent adapter checks.

The EUR/USD call to FX Rate Mirror reached the paid retry but returned a bare
HTTP 402 after roughly 20.5 seconds. PayProof persisted it as `paid_error` with
no settlement transaction and stopped further paid retries. This is now a
narrow EUR recurrence rather than the previous all-call integration failure;
live EUR acceptance remained outstanding at the end of the 2026-09-01 run.

### 2026-09-02 controlled EUR resolution

After the Telegraph administrator reconfirmed the x402 route, PayProof retried
only the EUR FX Rate Mirror case. The strict EUR/USD adapter and x402 settlement
checks passed in 7.37 seconds. The sanitized ledger record is `paid_success` on
`eip155:84532`, charged `10000` test-USDC base units, and stores settlement
transaction
`0x5bfa22d2ef2858967b0671b5cec716597d124eb63602d20215095b25c79fb225`.

All six required paid smoke paths have now passed: NGN, EUR, and GBP through FX
Rate Mirror; NGN through the Preflight backup; and the known Base Sepolia test
USDC transaction through Truvian and INTERLOCK. Their persisted paid total is
`60000` test-USDC base units (`0.06` test USDC). The earlier failed EUR attempt
has no settlement transaction and is not counted as a successful paid call.

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

### 2026-09-01 epoch-299 adapter recheck

The live Miner catalog still lists all four PayProof adapters as active. In the
epoch-299 snapshot, FX Rate Mirror ranked 5 for `CURRENCY_EXCHANGE`, Preflight
ranked 4, Truvian ranked 8 for `ONCHAIN_TX_LOOKUP`, and INTERLOCK ranked 6.
Rank alone remains insufficient: PayProof keeps these Miners because their
current structured response contracts fit the product's exact decision rules.

Read-only calls to each Miner's published base URL reconfirmed the adapter
shapes before any Telegraph payment:

- FX Rate Mirror returned fresh structured NGN/USD `0.000748`, EUR/USD `1.16`,
  and GBP/USD `1.35` values with timestamps and all four source checks passing.
- Preflight returned NGN/USD `0.000747537` in its structured decimal field,
  plus a current check timestamp and a separate upstream `as_of` timestamp.
- Truvian and INTERLOCK independently returned chain `84532`, the known hash,
  successful block `46236673`, and official-USDC transfers of `500000` and
  `2500` base units.

Sanitized captures of only the fields trusted by PayProof live under
`tests/fixtures/telegraph/`. These calls prove current parsing compatibility,
not validator consensus by themselves. The separate paid opt-in smoke suite
has now passed all six required paths and supplies the x402 settlement evidence
for review gate 2.

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
