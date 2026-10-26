# ccp_machine_test

Monorepo for the tools the agent harness needs. The design and the source of truth for behaviour are in
`suredesigntshirts/ccp_machine` (`harness/spec/`); the spec the tools run is in `packages/harness/spec/`.
Every tool is Node.js (22+) or Bun, plain ES modules, with no build step and no runtime dependencies.

## What is here

**`packages/harness` (`@ccp/harness`).** The harness itself: XState v5 JSON machines for the harness, each
work item and the budget, and a restore-apply-persist runtime over a file store. Each event carries an id,
so sending it twice changes nothing; each effect the machines ask for goes to an outbox until the host acks
it. The `harness` CLI applies events, lists and acks effects, renders mission control and the item pages,
runs the stand-in ladder, the daily canary and audit, the weekly retro, request intake, expectation checks,
PR-event intake and a busy-day simulation. See [its README](packages/harness/README.md).

**`packages/ledger` (`@ccp/ledger`).** A turn-level audit ledger of Claude Code sessions: turns, requests,
tools, subagents, cost and usage windows, with a budget and an HTML report. The `ledger` CLI files
transcripts, merges the filed sessions and renders the report. See [its README](packages/ledger/README.md).

**`plugins/harness`.** The Claude Code plugin an environment installs: a Stop hook that files each turn's
ledger into the Library, and the `orchestrator` skill, the loop an orchestrator thread runs on every wake.
See [its README](plugins/harness/README.md).

**`mods/harness-status`.** A Claude Code mod that keeps the harness in view: a status line (items in
flight, items that need you, budget mode) and a `/harness` pane with the waiting decisions, each item's
stage and the 7-day reading. It only reads the store. See [its README](mods/harness-status/README.md).

## Commands

From the repo root, after `npm ci`:

| Command | What it does |
|---|---|
| `npm test` | every workspace's `node:test` suite |
| `npm run scenarios` | replay the harness scenarios in `packages/harness/scenarios/` |
| `npm run sim` | drive 12 synthetic items through a scratch store at WIP 3 and 12 |
| `npm run pages:check` | render the harness pages and check them in Chromium at phone and desktop widths |
| `npm run build:plugin` | build `dist/harness/` and `dist/harness-plugin.zip` |

The CLIs (set `HARNESS_DIR` to the store first):

```sh
export HARNESS_DIR=/mnt/project-files/harness/state/main
H="node packages/harness/bin/harness.js"
$H --help                 # every command
$H doctor                 # check the store and replay its log
$H status                 # items, scheduler and budget
$H effects                # what the harness asked for and is not yet acked
$H send '<event json>' --to item:<id> --id <id>
$H ack <effect id> --note "<what was done>"
$H page --request-box --html mc/mission-control.html

L="node packages/ledger/bin/ledger.js"
$L file                   # file this session's transcripts in the Library
$L refresh --html report.html   # merge filed sessions and render the report
```

## Where the data lives in the Library

| Path under `/mnt/project-files/harness/` | What |
|---|---|
| `state/main/` | the live store: `events.jsonl`, `outbox.jsonl`, `acks.jsonl`, `state.json`, `decisions.jsonl`, and `plans/`, `checks/`, `audits/`, `digests/` |
| `state/sim/` | the busy-day simulation's page (`busy-day.html`) |
| `ledger/sessions/` | one ledger per session, written by the plugin's Stop hook |
| `reviews/` | the weekly retros (`<day>.md` and `.json`) |
| `plugin/` | the built plugin archive |
