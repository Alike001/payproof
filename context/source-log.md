# Source Log

## Snapshot

- Observed: **2026-08-31**
- Account: [`https://github.com/telegraphprotocol`](https://github.com/telegraphprotocol)
- GitHub API account type: `User`
- Public repositories: 20
- API-marked archived repositories: 0
- API-marked forks: 0
- Repositories with GitHub-detected licenses: 3
- Primary languages: TypeScript 13, JavaScript 3, Python 2, Rust 1, HTML 1
- Repositories pushed since 2026-08-01: 8
- Aggregate public snapshot counters: 18 stars, 13 forks, 7 in GitHub's `open_issues_count` field (which includes pull requests)

Counters are point-in-time GitHub values and will drift.

## Primary URLs

- Account API: [`https://api.github.com/users/telegraphprotocol`](https://api.github.com/users/telegraphprotocol)
- Repository API: [`https://api.github.com/users/telegraphprotocol/repos?per_page=100&type=owner&sort=updated`](https://api.github.com/users/telegraphprotocol/repos?per_page=100&type=owner&sort=updated)
- Account page: [`https://github.com/telegraphprotocol`](https://github.com/telegraphprotocol)
- Public docs source: [`telegraphprotocol/telegraph-docs`](https://github.com/telegraphprotocol/telegraph-docs)
- API reference source: [`telegraphprotocol/telegraph-api-docs`](https://github.com/telegraphprotocol/telegraph-api-docs)
- Whitepaper: [`telegraphprotocol.com/Whitepapers - Telegraph Protocol.pdf`](https://telegraphprotocol.com/Whitepapers%20-%20Telegraph%20Protocol.pdf)
- Hackathon homepage: [`hackathon.telegraphprotocol.com`](https://hackathon.telegraphprotocol.com/)
- Hackathon rules: [`hackathon.telegraphprotocol.com/rules`](https://hackathon.telegraphprotocol.com/rules)
- Hackathon Intent catalog: [`hackathon.telegraphprotocol.com/supported-intents`](https://hackathon.telegraphprotocol.com/supported-intents)
- Use-case collection: [`telegraphprotocol/telegraph-usecases`](https://github.com/telegraphprotocol/telegraph-usecases)
- Live Miner catalog: [`devnode.telegraphprotocol.com/api/miners`](https://devnode.telegraphprotocol.com/api/miners)
- Live Intent registry: [`devnode.telegraphprotocol.com/engine/v1/intents`](https://devnode.telegraphprotocol.com/engine/v1/intents)
- Live Miner leaderboard: [`devnode.telegraphprotocol.com/leaderboard/miners`](https://devnode.telegraphprotocol.com/leaderboard/miners?limit=1000)
- ETHGlobal RainGuard winner page: [`ethglobal.com/showcase/rainguard-vgfqo`](https://ethglobal.com/showcase/rainguard-vgfqo)
- ETHGlobal Aegis402 finalist page: [`ethglobal.com/showcase/aegis402-o8x6z`](https://ethglobal.com/showcase/aegis402-o8x6z)
- ETHGlobal x402 Guardrails page: [`ethglobal.com/showcase/x402-guardrails-7bvma`](https://ethglobal.com/showcase/x402-guardrails-7bvma)
- ETHGlobal PayBot finalist page: [`ethglobal.com/showcase/paybot-q7grd`](https://ethglobal.com/showcase/paybot-q7grd)
- Forta detection-bot examples: [`forta-network/forta-bot-examples`](https://github.com/forta-network/forta-bot-examples)

## Reproducible Discovery Commands

These commands use public GitHub data; authentication only increases rate limits.

```bash
gh api users/telegraphprotocol

gh api --paginate \
  'users/telegraphprotocol/repos?per_page=100&type=owner&sort=updated'
```

The initial request to `orgs/telegraphprotocol/repos` returned HTTP 404. Querying `users/telegraphprotocol` succeeded and returned `"type": "User"`.

Repository contents were inspected using GraphQL `Repository.object(expression: "HEAD:<path>")`, REST content endpoints, Git tree endpoints, and two local `--depth 1` clones. The catalog records default-branch commit hashes so the inspected state can be recovered even after branch heads move.

The later Track 3 reverse-engineering phase added shallow, commit-pinned clones
under [`research/reference-repos`](../research/reference-repos). Its index lists
each exact revision and license boundary. Those clones are research evidence,
not application dependencies.

## Evidence Priority

For future work, use this order:

1. On-chain state and verified contract source, when available.
2. Exact deployed private-node release or commit, when access is provided.
3. Commit-pinned source in the relevant public repository.
4. Current `telegraph-docs` and `telegraph-api-docs`, checked together.
5. Examples, product frontends, guides, and use-case repositories.
6. Marketing copy.

The order is an evidence-handling convention for this context folder, not an official Telegraph policy.
