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
  assert.match(r.stderr, /usage: jsonl-lint <file>/);
});
