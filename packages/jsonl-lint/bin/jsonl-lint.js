#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { lint } from '../src/index.js';

const files = process.argv.slice(2);
if (files.length === 0) {
  process.stderr.write('usage: jsonl-lint <file> [<file> ...]\n');
  process.exit(2);
}
if (files.filter((f) => f === '-').length > 1) {
  process.stderr.write('jsonl-lint: stdin (-) may be given at most once\n');
  process.stderr.write('usage: jsonl-lint <file> [<file> ...]\n');
  process.exit(2);
}

let unreadable = false;
let bad = false;
for (const file of files) {
  let text;
  try {
    text = file === '-' ? readFileSync(0, 'utf8') : readFileSync(file, 'utf8');
  } catch (err) {
    process.stderr.write(`jsonl-lint: cannot read ${file}: ${err.message}\n`);
    unreadable = true;
    continue;
  }
  for (const { line, error } of lint(text)) {
    bad = true;
    process.stdout.write(`${file}:${line}: ${error.replace(/\r?\n/g, ' ')}\n`);
  }
}
process.exit(unreadable ? 2 : bad ? 1 : 0);
