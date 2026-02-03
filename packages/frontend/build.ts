import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { $ } from 'bun';

const outdir = './dist';

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
  define: {
    'process.env.NODE_ENV': '"production"',
    'process.env.PUBLIC_API_BASE_URL': '""',
    'process.env.PUBLIC_FIREBASE_API_KEY': '""',
    'process.env.PUBLIC_FIREBASE_AUTH_DOMAIN': '""',
    'process.env.PUBLIC_FIREBASE_PROJECT_ID': '""',
    'process.env.PUBLIC_FIREBASE_STORAGE_BUCKET': '""',
    'process.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID': '""',
    'process.env.PUBLIC_FIREBASE_APP_ID': '""',
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

// Copy index.html and update script references
const indexHtml = await Bun.file('./index.html').text();
const updatedHtml = indexHtml
  .replace('/src/main.tsx', '/main.js')
  .replace('</head>', '  <link rel="stylesheet" href="/styles.css">\n  </head>');

await Bun.write(join(outdir, 'index.html'), updatedHtml);

// Copy public assets if they exist
const publicDir = './public';
if (existsSync(publicDir)) {
  const files = await Array.fromAsync(new Bun.Glob('*').scan({ cwd: publicDir }));
  if (files.length > 0) {
    await $`cp -r ${publicDir}/* ${outdir}/`;
  }
}
for (const _output of result.outputs) {
}
