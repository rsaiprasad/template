export const config = {
  cors: {
    origins: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:4173').split(','),
    credentials: true,
  },
  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    max: 100, // requests per window
    authMax: 10, // auth endpoints
  },
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
  },
};
