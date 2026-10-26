// The orchestrator skill is the theory the host acts on; the spec is the machine. This test fails when
// the skill's event or effect table drifts from the spec.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const root = new URL('../../../', import.meta.url);
const specDir = new URL('packages/harness/spec/', root);
const machinesSrc = readFileSync(new URL('packages/harness/src/machines.js', root), 'utf8');
const skill = readFileSync(new URL('plugins/harness/skills/orchestrator/SKILL.md', root), 'utf8');

// Every event some machine accepts.
const accepted = new Set();
const walk = (n) => {
  if (!n || typeof n !== 'object') return;
  if (n.on) for (const k of Object.keys(n.on)) accepted.add(k);
  Object.values(n).forEach(walk);
};
for (const f of readdirSync(specDir).filter((f) => f.endsWith('.machine.json'))) walk(JSON.parse(readFileSync(new URL(f, specDir), 'utf8')));
// Events the machines send each other are not the host's to send.
const internal = new Set([...machinesSrc.matchAll(/type: '([A-Z_]+)'/g)].map((m) => m[1]));
const hostEvents = [...accepted].filter((e) => !internal.has(e)).sort();
const effects = [...machinesSrc.matchAll(/external\(sink, ([^)]*)\)/g)].flatMap((m) => [...m[1].matchAll(/'(\w+)'/g)].map((x) => x[1])).sort();

// The rows of the first Markdown table whose header starts with `header`, as arrays of cells.
function table(header) {
  const lines = skill.split('\n').map((l) => l.trim());
  const start = lines.findIndex((l) => l.startsWith(`| ${header}`));
  assert.ok(start >= 0, `SKILL.md has a table headed "${header}"`);
  const rows = [];
  for (let i = start + 2; i < lines.length && lines[i].startsWith('|'); i++) rows.push(lines[i].split('|').slice(1, -1));
  return rows;
}
const ticked = (cell, re) => [...cell.matchAll(/`([^`]+)`/g)].map((m) => m[1]).filter((t) => re.test(t));

test('the skill\'s event table names every event the host may send, and nothing else', () => {
  assert.ok(hostEvents.includes('REQUEST_RECEIVED') && !hostEvents.includes('START'), 'host events are told apart from internal ones');
  const named = new Set(table('What happened').flatMap((r) => ticked(r[1], /^[A-Z][A-Z_]+$/)));
  assert.deepEqual(hostEvents.filter((e) => !named.has(e)), [], 'events missing from the skill');
  assert.deepEqual([...named].filter((e) => !hostEvents.includes(e)), [], 'events the spec does not accept from the host');
});

test('the skill\'s effect table names every external effect, and nothing else', () => {
  assert.ok(effects.length >= 8);
  const named = new Set(table('Effect').flatMap((r) => ticked(r[0], /^[a-z][A-Za-z]+$/)));
  assert.deepEqual(effects.filter((e) => !named.has(e)), [], 'effects missing from the skill');
  assert.deepEqual([...named].filter((e) => !effects.includes(e)), [], 'effects the spec does not emit');
});
