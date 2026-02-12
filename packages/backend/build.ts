import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'esnext',
  format: 'esm',
  outfile: 'dist/index.js',
  sourcemap: true,
  external: [
    // Don't bundle firebase-admin - it's a native dependency
    'firebase-admin',
    'firebase-admin/*',
  ],
});

console.log('Build complete: dist/index.js');
