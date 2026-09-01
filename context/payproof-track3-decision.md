# PayProof Track 3 Decision

Decision date: **2026-09-01**.

## Selected Direction

PayProof is the selected Telegraph Track 3 application:

> Create an invoice in a familiar currency, show the matching USDC amount and
> Base fee, verify the payment through Telegraph, and issue a shareable receipt.

Core intended Intents:

- `CURRENCY_EXCHANGE`
- `GAS_PRICE`
- `ONCHAIN_TX_LOOKUP`

## Real-Usage Interpretation

The published Track 3 criteria give **45%** of the score to real users and
actual Telegraph-call volume. The published rules do not state a minimum number
of Track 3 users as an eligibility condition. Therefore:

- having no outside users is not documented as an automatic disqualification;
- having no outside users would make the submission much less competitive;
- builder tests are evidence of technical operation, not strong evidence of
  adoption;
- scripted traffic, fake accounts, circular self-use, or repeated calls made
  only to inflate metrics are prohibited artificial inflation;
- honest failed attempts and user feedback should be retained rather than
  hidden.

## What Counts As Meaningful PayProof Usage

A useful adoption event is a real person completing one or more genuine steps:

1. creating an invoice for a real or realistic transaction;
2. sharing the public invoice link with a payer;
3. opening the invoice and receiving a live Telegraph FX quote;
4. reviewing the Base fee and recipient;
5. making a small payment where appropriate;
6. receiving a Telegraph-verified transaction receipt;
7. returning to create or inspect another invoice.

There is no internally invented numeric threshold. The initial operating target
is to recruit a small number of genuine freelancers/clients early enough to
observe the entire journey and report honest conversion and Telegraph-call
counts.

## Remaining Gates

- Confirm whether paid direct-Miner Engine calls count for Track 3, then run
  paid Engine tests for NGN/USD conversion, Base Sepolia gas, and exact test
  USDC transfer verification through the permitted route.
- Define analytics that separate unique users, invoices, payments, receipts,
  Telegraph calls, failures, and retries without collecting unnecessary
  personal data.
- Build a usable slice early enough for outside testing; do not wait until the
  submission day to seek users.

## Organizer Clarification — 2026-09-01

The hackathon admin clarified that real usage means the application, dApp, or
agent genuinely uses Telegraph to make decisions, regardless of platform. The
application does not need mainnet and should use testnet.

PayProof will therefore target **Base Sepolia** for its payment demonstration.
The testnet choice does not permit mocked Telegraph responses: the application
must still make real Telegraph requests and use those answers in its workflow.
For PayProof, those decisions are the invoice conversion, fee presentation, and
whether an observed payment can be marked verified.

### Compatibility result

Direct public-endpoint probes completed on 2026-09-01 found multiple live
Miners that correctly support Base Sepolia, including exact USDC transfer
decoding. However, the current top-two auto-routed `ONCHAIN_TX_LOOKUP` Miners do
not support the tested Base Sepolia path correctly. Telegraph's official paid
direct-Miner endpoint is available, but organizer confirmation is needed on
whether direct-Miner Engine calls count toward Track 3 usage and volume. See
[`payproof-base-sepolia-miner-compatibility.md`](./payproof-base-sepolia-miner-compatibility.md).

### Direct-call counting clarification

A second organizer clarification established that direct Miner requests,
whether ungated or Telegraph x402-gated, do not count toward the Miners'
request-volume judging requirements. This prevents a builder from selecting a
Miner and farming requests to improve that Miner's metrics.

The organizer also confirmed that a Track 3 agent/application may use direct
x402-gated Miner requests and that the agent project itself remains valid for
judging. PayProof can therefore use a compatible direct Miner for Base Sepolia
verification. Its adoption evidence must come from genuine application users
and completed workflows, not inflated Miner-call volume.

Primary rule source:
[Telegraph Hackathon Rules](https://hackathon.telegraphprotocol.com/rules).
