import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scenarios } from '../src/scenarios.js';
import { guideFor } from '../src/teaching.js';
import { splitContent } from './import-course.mjs';

const modules = [
  ['Getting Started', 5], ['Technical Basics', 14],
  ['Transmitters and Receivers', 10], ['Feeders and Antennas', 14],
  ['Propagation', 4], ['Licence Conditions', 9], ['EMC', 7],
  ['Safety', 11], ['Operating Practices and Procedures', 12],
];

const titles = {
  Formula_Resistance: 'Ohm’s Law', Formula_Power: 'Electrical Power',
  Antenna_type_14_Wave_Ground_Plane: 'Quarter-Wave Ground-Plane Antenna',
  Antenna_type_58_Wave_Ground_Plane: 'Five-Eighths-Wave Ground-Plane Antenna',
  Station_Setup_and_Radio_Controls_Video: 'Station Setup and Radio Controls',
};

export function createPublicCourse() {
  const terms = new Map();
  const documents = Object.entries(scenarios).map(([stem, scenario]) => {
    const guide = guideFor({ kind: scenario.kind, topic: stem });
    if (!guide) throw new Error(`Missing authored guide for ${stem}.`);
    for (const [term, meaning] of guide.terms) if (!terms.has(term)) terms.set(term, meaning);
    const title = titles[stem] || stem.replaceAll('_', ' ');
    const body = [
      `# ${title}`, guide.intro,
      `## In everyday life\n\n${scenario.setting}\n\nFocus: ${scenario.focus}\n\nTry: ${scenario.action}\n\n${scenario.result}`,
      `## What the terms mean\n\n${guide.terms.map(([term, meaning]) => `- **${term}:** ${meaning}`).join('\n')}`,
      `## How it works\n\n${guide.steps.map((step, index) => `${index + 1}. ${step}`).join('\n')}`,
      `## Worked example\n\n${guide.example}`,
      `## A common misunderstanding\n\n${guide.mistake}`,
      `## Apply it elsewhere\n\n${scenario.transfer}`,
      `## Primary sources\n\n${guide.sources.map(source => `- [${source.title}](${source.url})`).join('\n')}`,
    ].join('\n\n') + '\n';
    return {
      id: `Topics/${stem}`, source: `Topics/${stem}.md`, stem, title,
      category: 'Topics', raw: body, body,
      hash: createHash('sha256').update(body).digest('hex'), chunks: splitContent(body),
    };
  });
  let offset = 0;
  const orderedModules = modules.map(([title, count], index) => {
    const number = index + 1;
    const topics = documents.slice(offset, offset + count).map(document => document.id);
    offset += count;
    return { id: `Modules/Module-${number}-${title.replaceAll(' ', '-')}`, number, title, topics };
  });
  if (offset !== documents.length) throw new Error('The authored topic inventory no longer matches the module order.');
  const glossary = '# Glossary\n\nOriginal Radio Lab explanations of terms used in the study guides.\n\n' + [...terms].map(([term, meaning]) => `## ${term}\n\n${meaning}`).join('\n\n') + '\n';
  documents.push({ id: 'Glossary', source: 'Glossary.md', stem: 'Glossary', title: 'Glossary', category: 'Reference', raw: glossary, body: glossary, hash: createHash('sha256').update(glossary).digest('hex'), chunks: splitContent(glossary) });
  return {
    version: 1, provenance: 'authored-public', importedAt: '2026-10-27T00:00:00.000Z',
    modules: orderedModules, documents,
    coverage: { modules: orderedModules.length, courseTopics: offset, documents: documents.length, sourceCharacters: documents.reduce((sum, document) => sum + document.raw.length, 0) },
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const directory = resolve(process.argv[2] || join(dirname(fileURLToPath(import.meta.url)), '../public'));
    const target = join(directory, 'course.json');
    try {
      const previous = JSON.parse(await readFile(target, 'utf8'));
      if (previous.provenance !== 'authored-public') throw new Error('Refusing to replace imported course data; choose a separate output directory.');
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    const course = createPublicCourse();
    await mkdir(directory, { recursive: true });
    await writeFile(`${target}.tmp`, JSON.stringify(course));
    await rename(`${target}.tmp`, target);
    console.log(`Wrote ${course.coverage.courseTopics} authored public topics and a glossary across ${course.modules.length} modules to ${target}.`);
  } catch (error) {
    console.error(`Public course generation failed: ${error.message}`);
    process.exitCode = 1;
  }
}
