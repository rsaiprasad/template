import { watch } from 'node:fs';
import { join, extname } from 'node:path';
import { $ } from 'bun';

const PORT = Number(process.env.PORT) || 5173;
const API_URL = process.env.VITE_API_URL || 'http://localhost:5001';

// MIME types for serving files
const mimeTypes: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.jsx': 'text/javascript',
  '.ts': 'text/javascript',
  '.tsx': 'text/javascript',
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

// Build CSS initially
console.log('Building CSS...');
await $`bunx tailwindcss -i ./src/index.css -o ./src/generated.css`.quiet();

// Watch for CSS changes and rebuild
const srcDir = join(import.meta.dir, '.');
let cssRebuildTimeout: ReturnType<typeof setTimeout> | null = null;

watch(srcDir, { recursive: true }, (event, filename) => {
  if (filename && (filename.endsWith('.css') || filename.endsWith('.tsx') || filename.endsWith('.ts'))) {
    if (cssRebuildTimeout) clearTimeout(cssRebuildTimeout);
    cssRebuildTimeout = setTimeout(async () => {
      await $`bunx tailwindcss -i ./src/index.css -o ./src/generated.css`.quiet();
    }, 100);
  }
});

// Environment variables to inject
const envVars = Object.entries(process.env)
  .filter(([key]) => key.startsWith('VITE_'))
  .reduce(
    (acc, [key, value]) => {
      acc[`import.meta.env.${key}`] = JSON.stringify(value);
      return acc;
    },
    {} as Record<string, string>
  );

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    let pathname = url.pathname;

    // Proxy API requests
    if (pathname.startsWith('/api/')) {
      const targetUrl = `${API_URL}${pathname}${url.search}`;
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
      } catch (error) {
        return new Response(JSON.stringify({ error: 'API proxy error' }), {
          status: 502,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Serve generated CSS
    if (pathname === '/src/generated.css') {
      const file = Bun.file('./src/generated.css');
      if (await file.exists()) {
        return new Response(file, {
          headers: { 'Content-Type': 'text/css' },
        });
      }
    }

    // Handle source files with Bun transpiler
    if (pathname.startsWith('/src/') && (pathname.endsWith('.tsx') || pathname.endsWith('.ts') || pathname.endsWith('.jsx') || pathname.endsWith('.js'))) {
      const filePath = `.${pathname}`;
      const file = Bun.file(filePath);

      if (await file.exists()) {
        const transpiler = new Bun.Transpiler({
          loader: pathname.endsWith('.tsx') ? 'tsx' : pathname.endsWith('.ts') ? 'ts' : pathname.endsWith('.jsx') ? 'jsx' : 'js',
          define: {
            'process.env.NODE_ENV': '"development"',
            ...envVars,
          },
        });

        try {
          const source = await file.text();
          const result = transpiler.transformSync(source);

          return new Response(result, {
            headers: { 'Content-Type': 'text/javascript' },
          });
        } catch (error) {
          console.error('Transpile error:', error);
          return new Response(`console.error(${JSON.stringify(String(error))})`, {
            headers: { 'Content-Type': 'text/javascript' },
            status: 500,
          });
        }
      }
    }

    // Handle node_modules (for dependencies)
    if (pathname.startsWith('/node_modules/') || pathname.startsWith('/@admin-dashboard/')) {
      let modulePath = pathname;
      if (pathname.startsWith('/@admin-dashboard/')) {
        // Handle workspace packages
        const packageName = pathname.split('/')[1];
        const rest = pathname.split('/').slice(2).join('/');
        modulePath = `../shared/src/${rest || 'index.ts'}`;
      } else {
        modulePath = `.${pathname}`;
      }

      const file = Bun.file(modulePath);
      if (await file.exists()) {
        const ext = extname(modulePath);
        return new Response(file, {
          headers: { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' },
        });
      }
    }

    // Serve static files from public
    if (pathname !== '/' && !pathname.startsWith('/src/')) {
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

    // Inject hot reload script and CSS link
    const injectedHtml = indexHtml.replace(
      '</head>',
      `  <link rel="stylesheet" href="/src/generated.css">
    <script>
      // Simple hot reload via polling
      let lastCheck = Date.now();
      setInterval(async () => {
        try {
          const res = await fetch('/__dev_ping');
          if (res.ok) {
            const data = await res.json();
            if (data.restart && data.restart > lastCheck) {
              location.reload();
            }
          }
        } catch {}
      }, 1000);
    </script>
  </head>`
    );

    return new Response(injectedHtml, {
      headers: { 'Content-Type': 'text/html' },
    });
  },
});

console.log(`
  Dev server running at http://localhost:${PORT}

  API proxy: ${API_URL}

  Press Ctrl+C to stop
`);
