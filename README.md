# ccp_machine_test

Monorepo for standalone tools the agent harness can use, one npm workspace per tool under `packages/`.
Every tool is Node.js (22+) or Bun, plain ES modules, with no build step and no runtime dependencies.

The harness itself lives in `suredesigntshirts/ccp_machine`: `packages/harness` (the spec in
`packages/harness/spec/` is the source of truth for behaviour), `packages/ledger`, the `plugins/harness`
plugin and the `mods/harness-status` mod. They moved there on 2026-10-27 from commit `1244253` of this
repo. Nothing here is cloned or loaded by the harness at runtime.

## What is here

- No tools yet: `packages/` is empty, and `npm test` says so and passes.
- `canary/last.txt`: the file the harness's daily tier-0 canary item bumps through a PR, CI and merge.
- `plugins/harness/skills/orchestrator/`: the parked orchestrator skill. Its prose drifted from the
  machines, so it is not in the plugin; it comes back only once it is derived from them again.

## Commands

From the repo root: `npm ci`, then `npm test` (every workspace's `node:test` suite).
