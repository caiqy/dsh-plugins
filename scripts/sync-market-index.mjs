import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, rename, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { targets } from './release.mjs';

const registry = 'https://registry.npmjs.org/';

export async function syncMarketIndex(original, selection = 'all', request = fetch) {
  assert(selection === 'all' || Object.hasOwn(targets, selection), 'Unknown plugin selection');
  assert.equal(original.format, 1, 'Expected a DSH format:1 index');
  const index = structuredClone(original);
  for (const [key, target] of Object.entries(targets)) {
    if (selection !== 'all' && selection !== key) continue;
    // Release targets may be prepared before their first public package is indexed.
    if (selection === 'all' && !original.plugins.some(entry => entry.name === target.name)) continue;
    const response = await request(`${registry}${encodeURIComponent(target.name)}`, {
      redirect: 'error', headers: { 'cache-control': 'no-cache' }, signal: AbortSignal.timeout(15000),
    });
    assert.equal(response.status, 200, `Cannot read public npm metadata for ${target.name}`);
    const metadata = await response.json();
    const version = metadata['dist-tags']?.dsh;
    assert.equal(typeof version, 'string', `${target.name} must have a dsh dist-tag`);
    const published = metadata.versions?.[version];
    assert.equal(published?.name, target.name, 'Package name mismatch');
    assert.equal(published.version, version, 'Package version mismatch');
    assert(published.dsh?.bundle?.patch, 'Published package must declare a DSH bundle');
    const publishTimestamp = Math.floor(Date.parse(metadata.time?.[version]) / 1000);
    assert(Number.isSafeInteger(publishTimestamp) && publishTimestamp > 0, 'Invalid npm publication time');
    const archive = new URL(published.dist.tarball);
    assert.equal(archive.origin, registry.slice(0, -1), 'Tarballs must come from the official npm registry');
    const download = await request(archive.href, { redirect: 'error', signal: AbortSignal.timeout(60000) });
    assert.equal(download.status, 200, 'Published tarball is not publicly downloadable');
    const integrity = 'sha512-' + createHash('sha512').update(Buffer.from(await download.arrayBuffer())).digest('base64');
    assert.equal(integrity, published.dist.integrity, 'Published tarball integrity mismatch');
    const plugin = index.plugins.find(entry => entry.name === target.name);
    assert(plugin, `${target.name} is missing from index.json`);
    const entry = { version, publishTimestamp, source: { type: 'npm', registry }, engines: published.engines?.dsh ? { dsh: published.engines.dsh } : {} };
    plugin.versions = [entry, ...plugin.versions.filter(previous => previous.version !== version)];
  }
  return index;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const file = new URL('../index.json', import.meta.url);
  const original = await readFile(file, 'utf8');
  const updated = JSON.stringify(await syncMarketIndex(JSON.parse(original), process.argv[2] ?? 'all'), null, 2) + '\n';
  if (original !== updated) {
    const temporary = new URL('../index.json.tmp', import.meta.url);
    await writeFile(temporary, updated);
    await rename(temporary, file);
    console.log('Updated index.json from verified public npm releases');
  } else console.log('index.json already matches verified public npm releases');
}
