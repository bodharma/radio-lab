import { readdir, readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { marked } from 'marked';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const excluded = new Set(['CLAUDE.md', 'AGENTS.md', 'RTK.md']);

export function splitContent(body) {
  const chunks = [];
  let chunk = '';
  const tokens = marked.lexer(body).flatMap(token => token.type === 'list' && token.items.map(item => item.raw).join('') === token.raw ? token.items.map(item => ({ type: 'list-item', raw: item.raw })) : [token]);
  for (const token of tokens) {
    if (chunk && ((token.type === 'heading' && chunk.length > 180) || chunk.length + token.raw.length > 650)) {
      chunks.push(chunk);
      chunk = '';
    }
    chunk += token.raw;
  }
  if (chunk) chunks.push(chunk);
  if (chunks.join('') !== body) throw new Error('Markdown splitting would omit source content.');
  return chunks.length ? chunks : [body];
}

async function markdownFiles(directory) {
  const files = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    if (item.name.startsWith('.')) continue;
    const path = join(directory, item.name);
    if (item.isDirectory()) files.push(...await markdownFiles(path));
    else if (item.isFile() && item.name.endsWith('.md') && !excluded.has(item.name)) files.push(path);
  }
  return files.sort();
}

export async function importCourse(root) {
  const documents = [];
  for (const path of await markdownFiles(root)) {
    const raw = await readFile(path, 'utf8');
    const body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '').replace(/\r\n?/g, '\n');
    const source = relative(root, path).split('\\').join('/');
    documents.push({
      id: source.replace(/\.md$/, ''), source, raw, body,
      stem: basename(path, '.md'),
      title: body.match(/^#\s+(.+)$/m)?.[1]?.trim() || basename(path, '.md').replaceAll('_', ' '),
      category: source.includes('/') ? source.split('/')[0] : 'Reference',
      hash: createHash('sha256').update(raw).digest('hex'),
      chunks: splitContent(body),
    });
  }
  const byStem = new Map(documents.map(document => [document.stem, document]));
  if (byStem.size !== documents.length) throw new Error('Duplicate note filenames need resolving before import.');
  const modules = documents.filter(document => document.category === 'Modules').map(document => {
    const number = Number(document.stem.match(/^Module-(\d+)-/)?.[1]);
    const links = [...new Set([...document.body.matchAll(/\[\[([^\]|#]+)(?:[^\]]*)\]\]/g)].map(match => match[1].replace(/\\$/, '')))];
    const topics = links.map(link => {
      const topic = byStem.get(link);
      if (!topic || topic.category !== 'Topics') throw new Error(`Missing course topic ${link} in ${document.source}`);
      return topic.id;
    });
    if (!number || !topics.length) throw new Error(`Invalid course module: ${document.source}`);
    return { id: document.id, number, title: document.title.replace(/^Module\s*\d+\s*[-–]\s*/, ''), topics };
  }).sort((a, b) => a.number - b.number);
  if (modules.length !== 9 || modules.some((module, i) => module.number !== i + 1)) throw new Error('Expected all nine course modules in order.');
  const ordered = modules.flatMap(module => module.topics);
  if (new Set(ordered).size !== ordered.length) throw new Error('A course topic appears more than once.');
  return {
    version: 1, importedAt: new Date().toISOString(), modules, documents,
    coverage: { modules: modules.length, courseTopics: ordered.length, documents: documents.length, sourceCharacters: documents.reduce((sum, d) => sum + d.raw.length, 0) },
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const source = process.argv[2] || process.env.RADIO_LAB_MATERIALS;
    if (!source) throw new Error('Usage: npm run import:course -- /absolute/path/to/Ham-Radio');
    const course = await importCourse(resolve(source));
    await mkdir(join(project, 'public'), { recursive: true });
    const target = join(project, 'public/course.json');
    await writeFile(`${target}.tmp`, JSON.stringify(course));
    await rename(`${target}.tmp`, target);
    const report = { importedAt: course.importedAt, ...course.coverage, files: course.documents.map(({ source, hash, chunks }) => ({ source, hash, sections: chunks.length })) };
    await mkdir(join(project, 'data'), { recursive: true });
    await writeFile(join(project, 'data/coverage.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(`Imported ${course.coverage.courseTopics} ordered topics across ${course.coverage.modules} modules; preserved ${course.coverage.documents} complete notes.`);
  } catch (error) {
    console.error(`Course import failed: ${error.message}`);
    process.exitCode = 1;
  }
}
