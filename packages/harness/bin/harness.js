#!/usr/bin/env node
// harness: drive a stored harness one event at a time. Every command reads and writes the store
// folder (--dir, default .harness), so each session wake runs a command and exits.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { parseArgs } from 'node:util';
import { openStore, init, apply, ack, status, renderPage, budgetEvents } from '../src/index.js';

const HELP = `harness <command> [options]

  init [--wip N]                 create a harness in --dir
  send <event-json> [--to ADDR] [--id ID]
                                 apply one event; ADDR is harness (default), a system id such as
                                 item:a or budget, or a child path such as item:a/decision:a:plan:1.
                                 --id makes the send idempotent. Prints the effects it queued.
  usage [--samples FILE]         feed saved usage samples (ledger usage, default .ledger/usage.json)
                                 to the budget actor; a stop or soft limit reaches the scheduler
  status                         print the summary as JSON
  effects                        print effects the host has not acknowledged
  ack <effect-id>... [--outcome done|failed] [--note TEXT]
  page [--html FILE] [--title T] [--standalone]
                                 render mission control (default .harness/mission-control.html)

  --dir DIR                      store folder (default $HARNESS_DIR, else .harness); an orchestrator
                                 thread keeps it in the Library so the next thread can pick it up`;

const { values: o, positionals: [cmd, ...args] } = parseArgs({
  allowPositionals: true,
  options: {
    dir: { type: 'string', default: process.env.HARNESS_DIR ?? '.harness' },
    wip: { type: 'string' },
    to: { type: 'string' },
    id: { type: 'string' },
    outcome: { type: 'string', default: 'done' },
    note: { type: 'string' },
    samples: { type: 'string', default: '.ledger/usage.json' },
    html: { type: 'string' },
    title: { type: 'string', default: 'Mission control' },
    standalone: { type: 'boolean', default: false }
  }
});
const store = openStore(o.dir);
const print = (x) => console.log(JSON.stringify(x, null, 2));

try {
  switch (cmd) {
    case 'init':
      print(init(store, o.wip ? { wipLimit: Number(o.wip) } : {}));
      break;
    case 'send':
      if (!args[0]) throw new Error('send needs an event, such as \'{"type":"REQUEST_RECEIVED","request":{"id":"a"}}\'');
      print(apply(store, JSON.parse(args[0]), { to: o.to, id: o.id }));
      break;
    case 'usage': {
      const samples = JSON.parse(readFileSync(o.samples, 'utf8'));
      for (const e of budgetEvents(samples)) apply(store, e.event, { to: e.to, id: e.id });
      const st = status(store);
      print({ budget: st.budget, scheduler: st.state.scheduler });
      break;
    }
    case 'status':
      print(status(store));
      break;
    case 'effects':
      print(store.pending());
      break;
    case 'ack':
      print(ack(store, args, { outcome: o.outcome, note: o.note }));
      break;
    case 'page': {
      const st = status(store);
      if (!st) throw new Error(`no harness in ${o.dir}`);
      const file = o.html ?? `${o.dir}/mission-control.html`;
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, renderPage(st, { events: store.events(), pending: store.pending(), title: o.title, standalone: o.standalone }));
      console.log(`wrote ${file}`);
      break;
    }
    default:
      console.log(HELP);
      if (cmd && cmd !== 'help') process.exitCode = 1;
  }
} catch (e) {
  console.error(`harness: ${e.message}`);
  process.exitCode = 1;
}
