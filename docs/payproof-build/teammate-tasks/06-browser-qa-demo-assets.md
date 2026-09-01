# Teammate Task 06 — Browser QA, tester guide, and demo evidence

## Goal

Harden the finished journey, prepare external testers, and produce honest visual
evidence for checklist items 10–12.

## Dependency

Start after Task 05 is merged and Abu confirms the deployed workflow and test
accounts/funds are ready. Never test with mainnet funds or private keys supplied
through chat, issues, screenshots, or committed files.

## Branch and PR

- Branch: `test/end-to-end-journey`
- PR title: `test: cover PayProof journey and tester handoff`
- Start from the latest `main` after Task 05.

## Work to do

- Expand Playwright coverage for creator sign-in, create/review/publish, public
  view, quote, wallet rejection, submitted payment, unavailable verification,
  mismatch, and verified receipt paths using approved test fixtures/harnesses.
- Add keyboard/accessibility and 320px/390px/desktop responsive assertions.
- Write a one-page tester guide covering Base Sepolia, test ETH/test USDC,
  expected steps, safe failure reporting, and no-real-value warning.
- Capture current production screenshots for the 30-second story and failure
  recovery. Redact private keys, raw payment authorizations, and unnecessary
  personal information.
- Record tester observations in the approved consent-safe format; distinguish
  internal tests from genuine external use.
- Draft a concise demo checklist and issue reproduction template.

## Boundaries

Do not generate artificial adoption, automate usage inflation, change analytics
counts, claim direct Miner calls as Miner leaderboard volume, or modify decision
logic merely to make a test pass. Report product defects in separate issues.

## Acceptance checklist

- [ ] Browser suite covers the happy path and defined failure/retry paths.
- [ ] Clean mobile browser journey is documented and repeatable.
- [ ] Tester guide contains no mainnet or secret-handling instruction.
- [ ] Screenshots and notes contain no credential or unnecessary personal data.
- [ ] Internal versus external activity is labelled honestly.
- [ ] `npm ci`, browser suite, and `npm run check` pass.
- [ ] PR links each artifact to the corresponding hackathon judging criterion.

Abu reviews and merges; the teammate must not merge their own PR.
