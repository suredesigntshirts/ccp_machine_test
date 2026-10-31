import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lint } from '../src/index.js';

test('clean input returns []', () => {
  assert.deepEqual(lint('{"a":1}\n[1,2]\n"x"\n'), []);
  assert.deepEqual(lint(''), []);
});

test('bad middle row is reported with its line number', () => {
  const r = lint('{"a":1}\n{nope}\n{"b":2}\n');
  assert.equal(r.length, 1);
  assert.equal(r[0].line, 2);
  assert.equal(typeof r[0].error, 'string');
  assert.ok(r[0].error.length > 0);
});

test('torn last row without trailing newline is reported', () => {
  const r = lint('{"a":1}\n{"b":');
  assert.deepEqual(r.map((p) => p.line), [2]);
});

test('truncated last row with trailing newline is reported', () => {
  const r = lint('{"a":1}\n{"b":2\n');
  assert.deepEqual(r.map((p) => p.line), [2]);
});

test('blank lines are skipped but counted', () => {
  const r = lint('{"a":1}\n\n   \n\t\n{bad}\n\n{"c":3}\n');
  assert.deepEqual(r.map((p) => p.line), [5]);
});

test('CRLF line endings are tolerated', () => {
  assert.deepEqual(lint('{"a":1}\r\n\r\n{"b":2}\r\n'), []);
  assert.deepEqual(lint('{"a":1}\r\nbad\r\n').map((p) => p.line), [2]);
});

test('error is the JSON.parse message', () => {
  let expected;
  try { JSON.parse('{bad}'); } catch (e) { expected = e.message; }
  assert.equal(lint('{bad}')[0].error, expected);
});
