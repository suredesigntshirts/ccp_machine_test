# jsonl-lint

Report every row of a JSONL file that is not valid JSON. Node.js 22+, plain ES modules, no dependencies.

## Usage

```
node packages/jsonl-lint/bin/jsonl-lint.js <file> [<file> ...]
```

(or `jsonl-lint <file> [<file> ...]` once the workspace is linked by `npm install`).

Files are checked in the order given. A file named `-` is read from stdin and reported as `-`; it may
appear at most once.

## Output format

One line on stdout per bad row, using each file argument exactly as given (`-` for stdin):

```
<file>:<line>: <error>
```

`<line>` is 1-based; `<error>` is the `JSON.parse` error message. Blank or whitespace-only lines are
skipped but still counted, `\r\n` line endings are accepted, and a last line with no trailing newline is
checked, so a torn (truncated) last row is reported.

## Exit codes

- `0`: every row of every file is valid (nothing printed)
- `1`: at least one bad row in any file
- `2`: no file named, `-` given more than once (nothing is checked), or any file is missing or
  unreadable (`jsonl-lint: cannot read <file>: ...` on stderr; the other files are still checked and
  reported). 2 takes precedence over 1.

## Stdin

`cat rows.jsonl | jsonl-lint -` lints standard input; bad rows are reported as `-:<line>: <error>`.
Naming `-` twice is a usage error (exit 2).

## API

```js
import { lint } from 'jsonl-lint';

lint('{"a":1}\n{oops}\n'); // [{ line: 2, error: '...' }]
```

`lint(text)` returns `[{ line, error }]` for every invalid row, or `[]` for clean input.

## Tests

`npm test` in this folder (or at the repo root).
