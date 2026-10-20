import { build } from 'esbuild'

// DSH shares these module identities with its web shell.
await build({
  entryPoints: ['src/client.tsx'],
  outfile: 'lib/client.js',
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  jsx: 'automatic',
  external: [
    'react', 'react/jsx-runtime', 'react-dom', 'react-dom/client', '@deepseek-ai/cordis',
    '@deepseek-ai/dsh-client-store', '@deepseek-ai/dsh-client-ui-slots',
    '@deepseek-ai/dsh-client-ui-primitives', '@deepseek-ai/dsh-client-ui-dockkit',
  ],
  sourcemap: true,
  banner: { js: 'window.__ModuleLoader__.load({id:"@caiqy/dsh-plugin-toolbox",factory:(require)=>{var module={exports:{}};var exports=module.exports;' },
  footer: { js: 'return module.exports;}});' },
})
