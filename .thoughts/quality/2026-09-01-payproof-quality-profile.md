# Project Quality Profile: PayProof

## Detected Stack

- Next.js 16 App Router with React 19 and TypeScript 5 in strict mode
- Tailwind CSS 4 plus locally scoped CSS modules and design tokens
- Vitest 4 with jsdom for unit and component tests
- Planned Supabase Postgres/Auth, Wagmi/Viem/RainbowKit, Telegraph x402, and
  Playwright additions from the accepted specification
- npm lockfile, GitHub Actions, Vercel deployment target

## Existing Commands

- `npm run dev` — local Next.js development server
- `npm run lint` — ESLint with zero warnings allowed
- `npm run typecheck` — TypeScript without emitting files
- `npm run test:run` — non-watch unit test suite
- `npm run test:coverage` — unit tests with V8 coverage
- `npm run build` — production Next.js build
- `npm run check` — required local checks in CI order

## Required Local Checks

Every checklist item must pass lint, type-check, relevant unit/integration tests,
and production build before its commit. User-visible work also requires desktop
and mobile browser inspection. Live Telegraph and Base Sepolia probes are opt-in
and must never spend from an unapproved wallet.

## Required CI Gates

Pull requests and `main` pushes run a locked install, lint, type-check, unit
tests, and production build on Node.js 24. Playwright and database checks become
required once those layers are introduced.

## Suggested Hooks

No local Git hook is required during the seven-day build. The repository keeps
the authoritative checks in `npm run check` and CI so both teammates run the same
commands without hook-manager setup risk.

## File Size Policy

- Target: 200 lines for TypeScript/TSX modules
- Warning: more than 250 lines for application logic
- Hard cap: 350 lines for application logic unless the accepted spec documents
  a reason
- Exclusions: generated database types, SQL migrations, lockfiles, research,
  specifications, test fixtures, and declarative stylesheets
- Justified exceptions: the initial landing stylesheet is a single declarative
  visual surface; split it when shared product components emerge

## Commit Policy

Use one focused commit per completed checklist item. Commit titles use an
imperative conventional prefix such as `feat:`, `test:`, `docs:`, or `chore:`.
Do not mix unrelated research or another teammate's unfinished work into a
commit. Never bypass CI to merge.

## AGENTS.md Notes

Repository instructions must remain a short operational index. Accepted product
truth lives in `docs/payproof-build/`; Telegraph findings live in `context/`.
Framework and SDK behavior must be checked against current official docs before
implementation.

## Open Questions

- GitHub repository URL and Vercel project URL will be recorded when the owner
  connects those external services.
- CI will add Supabase and browser stages once their local test harnesses exist.
