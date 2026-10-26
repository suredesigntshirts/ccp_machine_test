# ccp_machine_test

Monorepo of harness tools. One folder per tool under `packages/`, each an npm workspace.

## Rules
- Tools are Node.js (22+) or Bun only. Prefer zero runtime dependencies and plain ES modules; no build step.
- Tests use `node:test` (`npm test` at the root runs every workspace's tests).
- The harness spec in `suredesigntshirts/ccp_machine` (`harness/spec/*.machine.json`) is the source of
  truth for behaviour; tools follow it.

## Branch naming
`<type>/<issue>-<slug>` (no issue: `<type>/<slug>`), extra agents on one feature `<type>/<slug>--<agent>`.
Types: feat, fix, refactor, docs, test, chore, spike. Lowercase `a-z 0-9 -`, under 60 characters, never a
`claude/` prefix. PRs go to `main`.
