const superAdminEmail = process.env.SUPER_ADMIN_EMAIL?.toLowerCase() || '';
if (!superAdminEmail) {
  console.warn('WARNING: SUPER_ADMIN_EMAIL is not set. No user will have super admin privileges.');
}

export const config = {
  cors: {
    origins: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:4173')
      .split(',')
      .map((origin) => origin.trim()),
    credentials: true,
  },
  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    max: 100, // requests per window
    authMax: 10, // auth endpoints
  },
  superAdminEmail,
};
