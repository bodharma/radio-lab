import test from 'node:test';
import assert from 'node:assert/strict';
import { splitContent } from '../scripts/import-course.mjs';

test('chunking preserves all Markdown, including tables, fenced examples and headings', () => {
  const source = '# Topic\n\n' + 'A useful concept. '.repeat(100) + '\n\n## Next\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n```text\n# example, not a heading\n```\n';
  const chunks = splitContent(source);
  assert.ok(chunks.length > 1);
  assert.equal(chunks.join(''), source);
});
