import { app } from './app';

const port = Number(process.env.PORT) || 3000;

const server = Bun.serve({
  port,
  fetch: app.fetch,
});

console.log(`Server running at http://localhost:${server.port}`);

// Export the app for testing and local development
export { app };

// Re-export types for consumers
export type { AppContext, AppEnv, AuthUser, AppVariables } from './core/types/context';
