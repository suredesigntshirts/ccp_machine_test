#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { lint } from '../src/index.js';

const file = process.argv[2];
if (file === undefined) {
  process.stderr.write('usage: jsonl-lint <file>\n');
  process.exit(2);
}

let text;
try {
  text = readFileSync(file, 'utf8');
} catch (err) {
  process.stderr.write(`jsonl-lint: cannot read ${file}: ${err.message}\n`);
  process.exit(2);
}

const problems = lint(text);
for (const { line, error } of problems) {
  process.stdout.write(`${file}:${line}: ${error.replace(/\r?\n/g, ' ')}\n`);
}
process.exit(problems.length > 0 ? 1 : 0);
