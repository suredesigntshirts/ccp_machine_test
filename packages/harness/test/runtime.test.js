import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openStore, init, apply, ack, status, renderPage } from '../src/index.js';

const fresh = (input) => {
  const store = openStore(mkdtempSync(join(tmpdir(), 'harness-')));
  init(store, input, '2026-10-26T18:00:00Z');
  return store;
};
const names = (r) => r.effects.map((e) => e.name);
const sure = { choice: 'approve', confidence: 0.95, threshold: 0.9, autonomy: 'act' };

test('each wake restores, applies one event, persists, and queues its effects', () => {
  const store = fresh({ wipLimit: 2 });
  assert.deepEqual(names(apply(store, { type: 'REQUEST_RECEIVED', request: { id: 'a', tier: 0 } })), ['dispatchRun']);
  assert.equal(store.read().version, 2);
  apply(store, { type: 'RUN_SUCCEEDED' }, { to: 'item:a' });
  apply(store, { type: 'RUN_SUCCEEDED' }, { to: 'item:a' });
  assert.deepEqual(names(apply(store, { type: 'CHECKS_PASSED' }, { to: 'item:a' })), ['mergePullRequest']);
  apply(store, { type: 'MERGED' }, { to: 'item:a' });
  const st = status(store);
  assert.deepEqual(st.items.map((i) => [i.id, i.state, i.done]), [['a', 'done', true]]);
  assert.deepEqual(st.context.inFlight, []);
  assert.equal(store.events().length, 5);
});

test('an event id is applied once, however often it is delivered', () => {
  const store = fresh();
  apply(store, { type: 'REQUEST_RECEIVED', request: { id: 'a', tier: 0 } }, { id: 'req-a' });
  const again = apply(store, { type: 'REQUEST_RECEIVED', request: { id: 'a', tier: 0 } }, { id: 'req-a' });
  assert.equal(again.duplicate, true);
  assert.equal(status(store).items.length, 1);
});

test('a stale writer is refused by compare-and-set, and a held lock stops a second writer', () => {
  const store = fresh();
  const state = store.read();
  store.write({ ...state, version: 2 }, 1);
  assert.throws(() => store.write({ ...state, version: 2 }, 1), /expected version 1, found 2/);
  assert.throws(() => store.withLock(() => store.withLock(() => {})), /another writer/);
});

test('an escalated decision is addressable by path, shows on the page, and leaves when decided', () => {
  const store = fresh();
  apply(store, { type: 'REQUEST_RECEIVED', request: { id: 'p', tier: 2, title: 'Ship the ledger' } });
  assert.deepEqual(names(apply(store, { type: 'RUN_SUCCEEDED' }, { to: 'item:p' })), ['askStandIn']);
  const [d] = status(store).items[0].decisions;
  assert.equal(d.address, 'item:p/decision:p:plan:1');
  assert.deepEqual(names(apply(store, { type: 'STAND_IN_ANSWERED', answer: sure }, { to: d.address })), ['postDecisionCard']);
  let st = status(store);
  assert.ok(st.needsPerson);
  const card = store.pending().find((e) => e.name === 'postDecisionCard');
  assert.equal(card.detail.standIn.choice, 'approve', 'the host gets what it needs to post the card');
  const html = renderPage(st, { events: store.events(), pending: store.pending() });
  assert.match(html, /Ship the ledger/);
  assert.match(html, /Stand-in leans <b>approve<\/b>/);

  apply(store, { type: 'PERSON_DECIDED', choice: 'approve' }, { to: d.address });
  st = status(store);
  assert.ok(!st.needsPerson);
  assert.equal(st.items[0].state, 'active.building');
});

test('effects stay pending until acknowledged; unknown ids are refused', () => {
  const store = fresh();
  const { effects } = apply(store, { type: 'REQUEST_RECEIVED', request: { id: 'a', tier: 0 } });
  assert.equal(store.pending().length, 1);
  ack(store, effects.map((e) => e.id));
  assert.equal(store.pending().length, 0);
  assert.throws(() => ack(store, ['nope']), /unknown effects: nope/);
});

test('the page escapes what it shows', () => {
  const store = fresh();
  apply(store, { type: 'REQUEST_RECEIVED', request: { id: '<x>', tier: 0, title: '<script>alert(1)</script>' } });
  const html = renderPage(status(store), { events: store.events(), pending: store.pending() });
  assert.ok(!html.includes('<script>alert'));
});
