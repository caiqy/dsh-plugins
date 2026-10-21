import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';

export const targets = {
  'web-search': { name: '@caiqy/dsh-plugin-web-search', repo: 'caiqy/dsh-plugins', workflow: 'publish-web-search.yml', ref: 'main' },
  'browser-skill': { name: '@caiqy/browser-skill-dsh-plugin', repo: 'caiqy/BrowserSkill', workflow: 'release-dsh-plugin.yml', ref: 'dsh/plugin-parity-0.3.3' },
  toolbox: { name: '@caiqy/dsh-plugin-toolbox', repo: 'caiqy/dsh-plugins', workflow: 'publish-toolbox.yml', ref: 'main' },
};

export function releaseCommand(argv) {
  const { values, positionals } = parseArgs({ args: argv, allowPositionals: true, options: { ref: { type: 'string' }, check: { type: 'boolean' } } });
  const [plugin, version] = positionals;
  assert.equal(positionals.length, 2, 'Usage: pnpm release <web-search|browser-skill|toolbox> <version> [--ref <ref>] [--check]');
  assert(Object.hasOwn(targets, plugin), 'Unknown plugin; select web-search, browser-skill or toolbox');
  assert.match(version, /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/, 'Expected a package version');
  const target = targets[plugin];
  assert(values.ref === undefined || values.ref.trim(), '--ref must not be empty');
  return ['workflow', 'run', target.workflow, '--repo', target.repo, '--ref', values.ref ?? target.ref,
    '--field', `version=${version}`, '--field', `dry_run=${Boolean(values.check)}`];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const args = releaseCommand(process.argv.slice(2));
    console.log(`Dispatching: gh ${args.join(' ')}`);
    const result = spawnSync('gh', args, { stdio: 'inherit', shell: false });
    if (result.error) throw result.error;
    process.exitCode = result.status ?? 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
