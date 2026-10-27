import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const read = name => readFile(new URL(`../${name}`, import.meta.url), 'utf8');

test('the project uses the unchanged official PolyForm text and consistent package metadata', async () => {
  const [license, notice, pkg, lock] = await Promise.all([
    read('LICENSE.txt'), read('NOTICE.txt'), read('package.json').then(JSON.parse), read('package-lock.json').then(JSON.parse),
  ]);
  // Official https://polyformproject.org/licenses/noncommercial/1.0.0.txt
  assert.equal(createHash('sha256').update(license).digest('hex'), 'ffcca38841adb694b6f380647e15f17c446a4d1656fed51a1e2041d064c94cc8');
  assert.equal(pkg.license, 'PolyForm-Noncommercial-1.0.0');
  assert.equal(lock.packages[''].license, pkg.license);
  assert.ok(notice.includes('Required Notice: Original author: bodharma'));
  assert.ok(notice.includes('Required Notice: Original project and source: https://github.com/bodharma/radio-lab'));
  assert.ok(notice.includes('https://polyformproject.org/licenses/noncommercial/1.0.0'));
});

test('bundled dependency notices retain the installed upstream licence texts and versions', async () => {
  const notices = await read('THIRD_PARTY_NOTICES.txt');
  for (const [name, files] of [['dompurify', ['LICENSE', 'LICENSE-MPL']], ['marked', ['LICENSE']]]) {
    const pkg = JSON.parse(await read(`node_modules/${name}/package.json`));
    assert.ok(notices.includes(pkg.version), `${name}: update notices after a dependency upgrade`);
    for (const file of files) assert.ok(notices.includes((await read(`node_modules/${name}/${file}`)).trim()), `${name}/${file}: full notice must be retained`);
  }
  assert.ok(notices.includes('Regenerator runtime embedded by DOMPurify'));
});
