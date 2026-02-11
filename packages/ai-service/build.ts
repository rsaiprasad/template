import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'esnext',
  format: 'esm',
  outfile: 'dist/index.js',
  sourcemap: true,
  external: ['firebase-admin', 'firebase-admin/*', 'ws'],
});

console.log('Build complete: dist/index.js');
