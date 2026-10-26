# ccp_machine_test

Monorepo for the tools the agent harness needs (design and spec: `suredesigntshirts/ccp_machine`,
`harness/spec/`). Every tool is Node.js (22+) or Bun, with no build step.

| Package | What it does |
|---|---|
| [`packages/ledger`](packages/ledger) | Turn-level audit ledger of Claude Code sessions: turns, requests, tools, subagents, cost, usage windows and budget, with an HTML report |
