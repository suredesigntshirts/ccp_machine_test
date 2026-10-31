/**
 * Check every row of JSONL text.
 * Lines are 1-based and split on \n (a trailing \r is tolerated). Blank or
 * whitespace-only lines are skipped but still counted. A last line without a
 * trailing newline is checked like any other.
 * @param {string} text
 * @returns {{ line: number, error: string }[]}
 */
export function lint(text) {
  const problems = [];
  const lines = String(text).split('\n');
  for (let i = 0; i < lines.length; i++) {
    const row = lines[i].endsWith('\r') ? lines[i].slice(0, -1) : lines[i];
    if (row.trim() === '') continue;
    try {
      JSON.parse(row);
    } catch (err) {
      problems.push({ line: i + 1, error: err.message });
    }
  }
  return problems;
}
