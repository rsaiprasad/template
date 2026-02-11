import { onRequest } from 'firebase-functions/v2/https';
import { app } from './app';

/**
 * Firebase Cloud Function HTTP handler
 * Exports the Hono app as a Firebase Cloud Function
 */
export const api = onRequest(
  {
    // Function configuration
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60,
    minInstances: 0,
    maxInstances: 100,
    // CORS is handled by Hono middleware
    cors: false,
  },
  async (req, res) => {
    // Convert Node.js request to Web Fetch API Request
    const url = `https://${req.hostname}${req.url}`;
    const headers = new Headers();

    for (const [key, value] of Object.entries(req.headers)) {
      if (value) {
        if (Array.isArray(value)) {
          value.forEach((v) => headers.append(key, v));
        } else {
          headers.set(key, value);
        }
      }
    }

    // Firebase Functions v2 already parses JSON bodies, so pass req.body directly
    // (JSON.stringify would double-encode the body, breaking all write operations)
    const body = ['GET', 'HEAD'].includes(req.method)
      ? undefined
      : typeof req.body === 'string'
        ? req.body
        : JSON.stringify(req.body);

    const request = new Request(url, {
      method: req.method,
      headers,
      body,
    });

    // Get response from Hono app
    const response = await app.fetch(request);

    // Set response headers
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    // Set status and send body
    res.status(response.status);
    const responseBody = await response.text();
    res.send(responseBody);
  }
);

// Export the app for testing and local development
export { app };

// Re-export types for consumers
export type { AppContext, AppEnv, AuthUser, AppVariables } from './core/types/context';
