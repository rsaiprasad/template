import { $ } from 'bun';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const outdir = './dist';

// Clean output directory
if (existsSync(outdir)) {
  rmSync(outdir, { recursive: true });
}

// Build CSS with Tailwind
console.log('Building CSS with Tailwind...');
await $`bunx tailwindcss -i ./src/index.css -o ./dist/styles.css --minify`;

// Build the React app with Bun
console.log('Building React app...');
const result = await Bun.build({
  entrypoints: ['./src/main.tsx'],
  outdir,
  target: 'browser',
  format: 'esm',
  splitting: true,
  minify: true,
  sourcemap: 'external',
  define: {
    'process.env.NODE_ENV': '"production"',
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

// Copy index.html and update script references
const indexHtml = await Bun.file('./index.html').text();
const updatedHtml = indexHtml
  .replace('/src/main.tsx', '/main.js')
  .replace(
    '</head>',
    '  <link rel="stylesheet" href="/styles.css">\n  </head>'
  );

await Bun.write(join(outdir, 'index.html'), updatedHtml);

// Copy public assets if they exist
const publicDir = './public';
if (existsSync(publicDir)) {
  await $`cp -r ${publicDir}/* ${outdir}/`;
}

console.log('Build complete! Output in', outdir);
console.log('Files:');
for (const output of result.outputs) {
  console.log(' -', output.path);
}
