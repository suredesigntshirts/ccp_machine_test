# jsonl-lint

Report every row of a JSONL file that is not valid JSON. Node.js 22+, plain ES modules, no dependencies.

## Usage

```
node packages/jsonl-lint/bin/jsonl-lint.js <file>
```

(or `jsonl-lint <file>` once the workspace is linked by `npm install`).

## Output format

One line on stdout per bad row, using the file argument exactly as given:

```
<file>:<line>: <error>
```

`<line>` is 1-based; `<error>` is the `JSON.parse` error message. Blank or whitespace-only lines are
skipped but still counted, `\r\n` line endings are accepted, and a last line with no trailing newline is
checked, so a torn (truncated) last row is reported.

## Exit codes

- `0`: every row is valid (nothing printed)
- `1`: at least one bad row
- `2`: no argument, or the file is missing or unreadable (message on stderr)

## API

```js
import { lint } from 'jsonl-lint';

lint('{"a":1}\n{oops}\n'); // [{ line: 2, error: '...' }]
```

`lint(text)` returns `[{ line, error }]` for every invalid row, or `[]` for clean input.

## Tests

`npm test` in this folder (or at the repo root).
