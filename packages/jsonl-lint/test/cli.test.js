import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lint } from '../src/index.js';

const bin = join(dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'jsonl-lint.js');
let dir;
before(() => { dir = mkdtempSync(join(tmpdir(), 'jsonl-lint-')); });
after(() => { rmSync(dir, { recursive: true, force: true }); });

const run = (...args) =>
  spawnSync(process.execPath, [bin, ...args], { encoding: 'utf8' });
const runIn = (input, ...args) =>
  spawnSync(process.execPath, [bin, ...args], { encoding: 'utf8', input });

test('exit 0 and no output for a clean file', () => {
  const f = join(dir, 'clean.jsonl');
  writeFileSync(f, '{"a":1}\n\n{"b":2}\n');
  const r = run(f);
  assert.equal(r.status, 0);
  assert.equal(r.stdout, '');
  assert.equal(r.stderr, '');
});

test('exit 1 and <file>:<line>: <error> per bad row', () => {
  const f = join(dir, 'bad.jsonl');
  const text = '{"a":1}\n\n{bad}\n{"b":2}\n{"torn":';
  writeFileSync(f, text);
  const r = run(f);
  assert.equal(r.status, 1);
  const expected = lint(text).map((p) => `${f}:${p.line}: ${p.error}\n`).join('');
  assert.equal(r.stdout, expected);
  assert.match(r.stdout, new RegExp(`^${f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:3: .+\\n`));
  assert.equal(r.stdout.trimEnd().split('\n').length, 2);
  assert.ok(r.stdout.includes(`${f}:5: `));
});

test('file argument is used exactly as given in the prefix', () => {
  const f = join(dir, 'rel.jsonl');
  writeFileSync(f, 'nope\n');
  const r = spawnSync(process.execPath, [bin, './rel.jsonl'], { encoding: 'utf8', cwd: dir });
  assert.equal(r.status, 1);
  assert.ok(r.stdout.startsWith('./rel.jsonl:1: '));
});

test('exit 2 and stderr for a missing file', () => {
  const f = join(dir, 'missing.jsonl');
  const r = run(f);
  assert.equal(r.status, 2);
  assert.equal(r.stdout, '');
  assert.ok(r.stderr.includes(f));
});

test('exit 2 and usage on stderr with no argument', () => {
  const r = run();
  assert.equal(r.status, 2);
  assert.equal(r.stdout, '');
  assert.match(r.stderr, /usage: jsonl-lint <file> \[<file> \.\.\.\]/);
});

const mk = (name, text) => { const f = join(dir, name); writeFileSync(f, text); return f; };

test('two clean files: exit 0, no output', () => {
  const a = mk('c1.jsonl', '{"a":1}\n');
  const b = mk('c2.jsonl', '{"b":2}\n');
  const r = run(a, b);
  assert.equal(r.status, 0);
  assert.equal(r.stdout, '');
  assert.equal(r.stderr, '');
});

test('one bad file among several: exit 1, only its lines, order preserved', () => {
  const a = mk('m1.jsonl', '{"a":1}\n');
  const b = mk('m2.jsonl', '{"a":1}\n{bad}\n');
  const c = mk('m3.jsonl', '{"c":3}\n');
  const r = run(a, b, c);
  assert.equal(r.status, 1);
  assert.equal(r.stdout, lint('{"a":1}\n{bad}\n').map((p) => `${b}:${p.line}: ${p.error}\n`).join(''));
  const r2 = run(b, a, b);
  assert.equal(r2.status, 1);
  const lines = r2.stdout.trimEnd().split('\n');
  assert.equal(lines.length, 2);
  assert.ok(lines.every((l) => l.startsWith(`${b}:2: `)));
});

test('stdin - clean: exit 0', () => {
  const r = runIn('{"a":1}\n', '-');
  assert.equal(r.status, 0);
  assert.equal(r.stdout, '');
});

test('stdin - bad: exit 1 with prefix -:N: ', () => {
  const r = runIn('{"a":1}\nnope\n', '-');
  assert.equal(r.status, 1);
  assert.ok(r.stdout.startsWith('-:2: '));
  assert.equal(r.stdout.trimEnd().split('\n').length, 1);
});

test('stdin - mixed with files keeps argument order', () => {
  const a = mk('s1.jsonl', 'x\n');
  const r = runIn('y\n', a, '-');
  assert.equal(r.status, 1);
  const lines = r.stdout.trimEnd().split('\n');
  assert.ok(lines[0].startsWith(`${a}:1: `));
  assert.ok(lines[1].startsWith('-:1: '));
});

test('missing file among others: exit 2, stderr names it, others still reported', () => {
  const good = mk('g.jsonl', '{"a":1}\n');
  const bad = mk('b.jsonl', 'oops\n');
  const missing = join(dir, 'nope.jsonl');
  const r = run(good, missing, bad);
  assert.equal(r.status, 2);
  assert.match(r.stderr, new RegExp(`jsonl-lint: cannot read ${missing.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}: `));
  assert.ok(r.stdout.startsWith(`${bad}:1: `));
  assert.equal(r.stdout.trimEnd().split('\n').length, 1);
});

test('two - arguments: exit 2, stderr, nothing checked', () => {
  const bad = mk('b2.jsonl', 'oops\n');
  const r = runIn('{"a":1}\n', bad, '-', '-');
  assert.equal(r.status, 2);
  assert.equal(r.stdout, '');
  assert.match(r.stderr, /-/);
  assert.ok(r.stderr.length > 0);
});
