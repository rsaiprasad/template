import { readFileSync, watch } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { $ } from 'bun';

const PORT = Number(process.env.PORT) || 5173;
const API_URL = process.env.PUBLIC_API_URL || 'http://localhost:5001';
const FIREBASE_REGION = process.env.PUBLIC_FIREBASE_REGION || 'us-central1';

function getFirebaseProjectId(): string {
  try {
    const firebaserc = JSON.parse(
      readFileSync(resolve(import.meta.dir, '../../../firebase/.firebaserc'), 'utf-8')
    );
    return firebaserc.projects?.default || 'demo-project';
  } catch {
    return 'demo-project';
  }
}

const isEmulator = API_URL.includes('localhost:5001');
const FIREBASE_PROJECT_ID = getFirebaseProjectId();
const API_PREFIX = isEmulator ? `/${FIREBASE_PROJECT_ID}/${FIREBASE_REGION}/api` : '';

const mimeTypes: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

// Environment variables to inject
const envVars = Object.entries(process.env)
  .filter(([key]) => key.startsWith('PUBLIC_'))
  .reduce(
    (acc, [key, value]) => {
      acc[`process.env.${key}`] = JSON.stringify(value);
      return acc;
    },
    {} as Record<string, string>
  );

// Build output directory
const buildDir = './.dev-build';

// Bundle the app
async function bundle() {
  await $`bunx tailwindcss -i ./src/index.css -o ${buildDir}/styles.css`.quiet();

  const result = await Bun.build({
    entrypoints: ['./src/main.tsx'],
    outdir: buildDir,
    target: 'browser',
    format: 'esm',
    splitting: false,
    minify: false,
    sourcemap: 'inline',
    define: {
      'process.env.NODE_ENV': '"development"',
      ...envVars,
    },
  });

  if (!result.success) {
    console.error('Build failed:');
    for (const log of result.logs) {
      console.error(log);
    }
    return false;
  }
  return true;
}

// Initial build
console.log('Building...');
await bundle();

// Watch for changes
const srcDir = join(import.meta.dir, '.');
let rebuildTimeout: ReturnType<typeof setTimeout> | null = null;

watch(srcDir, { recursive: true }, (_event, filename) => {
  if (filename && !filename.includes('.dev-build') && !filename.includes('generated.css')) {
    if (rebuildTimeout) clearTimeout(rebuildTimeout);
    rebuildTimeout = setTimeout(async () => {
      console.log('Rebuilding...');
      await bundle();
    }, 100);
  }
});

// Server
const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const pathname = url.pathname;

    // Proxy API requests
    if (pathname.startsWith('/api/')) {
      // Use the decoded pathname directly - Hono on the backend will match it correctly
      const targetUrl = `${API_URL}${API_PREFIX}${pathname}${url.search}`;
      const headers = new Headers(req.headers);
      headers.delete('host');

      try {
        const response = await fetch(targetUrl, {
          method: req.method,
          headers,
          body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined,
        });

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
      } catch (_error) {
        return new Response(JSON.stringify({ error: 'API proxy error' }), {
          status: 502,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Serve built JS
    if (pathname === '/main.js') {
      const file = Bun.file(`${buildDir}/main.js`);
      if (await file.exists()) {
        return new Response(file, {
          headers: { 'Content-Type': 'text/javascript' },
        });
      }
    }

    // Serve built CSS
    if (pathname === '/styles.css') {
      const file = Bun.file(`${buildDir}/styles.css`);
      if (await file.exists()) {
        return new Response(file, {
          headers: { 'Content-Type': 'text/css' },
        });
      }
    }

    // Serve static files from public
    if (pathname !== '/') {
      const publicFile = Bun.file(`./public${pathname}`);
      if (await publicFile.exists()) {
        const ext = extname(pathname);
        return new Response(publicFile, {
          headers: { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' },
        });
      }
    }

    // Serve index.html for SPA routing
    const indexHtml = await Bun.file('./index.html').text();

    // Update script references for dev build
    const devHtml = indexHtml
      .replace('/src/main.tsx', '/main.js')
      .replace(
        '</head>',
        `  <link rel="stylesheet" href="/styles.css">
    <script>
      // Simple hot reload via polling
      setInterval(() => fetch('/__ping').catch(() => location.reload()), 2000);
    </script>
  </head>`
      );

    return new Response(devHtml, {
      headers: { 'Content-Type': 'text/html' },
    });
  },
});

console.log(`
  Dev server running at ${server.url}

  API proxy: ${API_URL}

  Press Ctrl+C to stop
`);
