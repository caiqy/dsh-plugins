import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { releaseCommand, targets } from './release.mjs';
import { syncMarketIndex } from './sync-market-index.mjs';

const archive = Buffer.from('test release archive');
const integrity = 'sha512-' + createHash('sha512').update(archive).digest('base64');
const registry = 'https://registry.npmjs.org/';
const initial = { format: 1, title: 'Test', plugins: Object.values(targets).map(target => ({
  name: target.name, title: target.name, versions: [{ version: '0.0.1', publishTimestamp: 1, source: { type: 'npm', registry }, engines: {} }],
})) };
function metadata(name) {
  return { 'dist-tags': { dsh: '1.2.3-dsh.1' }, time: { '1.2.3-dsh.1': '2026-10-20T08:00:00.000Z' }, versions: {
    '1.2.3-dsh.1': { name, version: '1.2.3-dsh.1', dsh: { bundle: { patch: './cordis.patch.yml' } },
      dist: { tarball: `${registry}${name}/-/package.tgz`, integrity } },
  } };
}
function mockRegistry(change = () => {}, calls = []) {
  return async url => {
    calls.push(url);
    if (url.endsWith('.tgz')) return new Response(archive);
    const data = metadata(decodeURIComponent(url.slice(registry.length)));
    change(data);
    return Response.json(data);
  };
}

test('release selects exactly one repository and supports verification without publishing', () => {
  assert.deepEqual(releaseCommand(['web-search', '0.1.1']), ['workflow', 'run', 'publish-web-search.yml', '--repo', 'caiqy/dsh-plugins', '--ref', 'main', '--field', 'version=0.1.1', '--field', 'dry_run=false']);
  assert.deepEqual(releaseCommand(['browser-skill', '0.3.3-dsh.3', '--check', '--ref', 'candidate']), ['workflow', 'run', 'release-dsh-plugin.yml', '--repo', 'caiqy/BrowserSkill', '--ref', 'candidate', '--field', 'version=0.3.3-dsh.3', '--field', 'dry_run=true']);
  for (const argv of [['all', '1.0.0'], ['__proto__', '1.0.0'], ['web-search'], ['web-search', '1.0.0;echo bad'], ['web-search', '1.0.0', 'extra'], ['web-search', '1.0.0', '--ref', '']]) {
    assert.throws(() => releaseCommand(argv));
  }
});

test('selected index sync preserves the other plugin, keeps old versions and is idempotent', async () => {
  const calls = [];
  const result = await syncMarketIndex(initial, 'web-search', mockRegistry(undefined, calls));
  assert.deepEqual(result.plugins[1], initial.plugins[1]);
  assert.equal(result.plugins[0].versions[0].version, '1.2.3-dsh.1');
  assert.equal(result.plugins[0].versions[0].publishTimestamp, 1792483200);
  assert.deepEqual(result.plugins[0].versions[1], initial.plugins[0].versions[0]);
  assert.equal(initial.plugins[0].versions.length, 1);
  assert.equal(calls.length, 2);
  assert.deepEqual(await syncMarketIndex(result, 'web-search', mockRegistry()), result);
});

test('all sync requires valid metadata, public tarballs and matching integrity before accepting changes', async () => {
  const result = await syncMarketIndex(initial, 'all', mockRegistry());
  assert(result.plugins.every(plugin => plugin.versions[0].version === '1.2.3-dsh.1'));
  for (const change of [
    data => { delete data['dist-tags'].dsh; },
    data => { data.time['1.2.3-dsh.1'] = 'invalid'; },
    data => { data.versions['1.2.3-dsh.1'].dist.integrity = 'sha512-wrong'; },
    data => { data.versions['1.2.3-dsh.1'].dist.tarball = 'https://example.com/package.tgz'; },
    data => { delete data.versions['1.2.3-dsh.1'].dsh; },
  ]) await assert.rejects(syncMarketIndex(initial, 'all', mockRegistry(change)));
  await assert.rejects(syncMarketIndex(initial, 'web-search', async () => new Response('', { status: 404 })));
  await assert.rejects(syncMarketIndex(initial, 'typo', mockRegistry()));
  assert(initial.plugins.every(plugin => plugin.versions.length === 1));
});
