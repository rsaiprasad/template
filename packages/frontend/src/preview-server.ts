import { extname } from 'node:path';

const PORT = Number(process.env.PORT) || 4173;
const distDir = './dist';

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

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const pathname = url.pathname;

    // Try to serve the file directly
    if (pathname !== '/') {
      const file = Bun.file(`${distDir}${pathname}`);
      if (await file.exists()) {
        const ext = extname(pathname);
        return new Response(file, {
          headers: { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' },
        });
      }
    }

    // Serve index.html for SPA routing
    const indexFile = Bun.file(`${distDir}/index.html`);
    if (await indexFile.exists()) {
      return new Response(indexFile, {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    return new Response('Not Found', { status: 404 });
  },
});

console.log(`Preview server running at ${server.url}`);
