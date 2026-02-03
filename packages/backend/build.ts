import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outfile: 'dist/index.js',
  sourcemap: true,
  external: [
    // Don't bundle these - they're provided by Firebase/Node runtime
    'firebase-admin',
    'firebase-admin/*',
    'firebase-functions',
    'firebase-functions/*',
  ],
  banner: {
    // Required for ESM compatibility with some packages
    js: `import { createRequire } from 'module';const require = createRequire(import.meta.url);`,
  },
});

console.log('Build complete: dist/index.js');
