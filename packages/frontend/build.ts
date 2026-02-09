import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { $ } from 'bun';

const outdir = './dist';

// Helper: read a PUBLIC_ env var, falling back to empty string
const env = (key: string) => JSON.stringify(process.env[key] || '');

// Clean output directory
if (existsSync(outdir)) {
  rmSync(outdir, { recursive: true });
}
await $`bunx tailwindcss -i ./src/index.css -o ./dist/styles.css --minify`;
const result = await Bun.build({
  entrypoints: ['./src/main.tsx'],
  outdir,
  target: 'browser',
  format: 'esm',
  splitting: true,
  minify: true,
  sourcemap: 'external',
  naming: '[dir]/[name]-[hash].[ext]',
  define: {
    'process.env.NODE_ENV': '"production"',
    'process.env.PUBLIC_API_BASE_URL': env('PUBLIC_API_BASE_URL'),
    'process.env.PUBLIC_FIREBASE_API_KEY': env('PUBLIC_FIREBASE_API_KEY'),
    'process.env.PUBLIC_FIREBASE_AUTH_DOMAIN': env('PUBLIC_FIREBASE_AUTH_DOMAIN'),
    'process.env.PUBLIC_FIREBASE_PROJECT_ID': env('PUBLIC_FIREBASE_PROJECT_ID'),
    'process.env.PUBLIC_FIREBASE_STORAGE_BUCKET': env('PUBLIC_FIREBASE_STORAGE_BUCKET'),
    'process.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID': env('PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
    'process.env.PUBLIC_FIREBASE_APP_ID': env('PUBLIC_FIREBASE_APP_ID'),
    'process.env': '{}',
    'process': '{"env":{}}',
  },
  loader: {
    '.tsx': 'tsx',
    '.ts': 'ts',
    '.jsx': 'jsx',
    '.js': 'js',
    '.css': 'css',
    '.json': 'json',
    '.svg': 'file',
    '.png': 'file',
    '.jpg': 'file',
    '.jpeg': 'file',
    '.gif': 'file',
    '.webp': 'file',
    '.ico': 'file',
  },
});

if (!result.success) {
  console.error('Build failed:');
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

// Find the hashed entry point filename from build outputs
const mainEntry = result.outputs.find(o => o.kind === 'entry-point');
const mainCss = result.outputs.find(o => o.path.endsWith('.css'));
const mainJsName = mainEntry ? mainEntry.path.split('/').pop()! : 'main.js';
const mainCssName = mainCss ? mainCss.path.split('/').pop()! : 'main.css';

// Copy index.html and update script/style references to hashed filenames
const indexHtml = await Bun.file('./index.html').text();
const updatedHtml = indexHtml
  .replace('/src/main.tsx', `/${mainJsName}`)
  .replace('</head>', `  <link rel="stylesheet" href="/styles.css">\n  <link rel="stylesheet" href="/${mainCssName}">\n  </head>`);

await Bun.write(join(outdir, 'index.html'), updatedHtml);

// Copy public assets if they exist
const publicDir = './public';
if (existsSync(publicDir)) {
  const files = await Array.fromAsync(new Bun.Glob('*').scan({ cwd: publicDir }));
  if (files.length > 0) {
    await $`cp -r ${publicDir}/* ${outdir}/`;
  }
}
