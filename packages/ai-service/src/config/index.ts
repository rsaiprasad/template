function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value;
}

export const config = {
  gemini: {
    apiKey: requireEnv('GEMINI_API_KEY'),
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
    liveModel: process.env.GEMINI_LIVE_MODEL || 'gemini-2.0-flash-live-001',
  },
  backendUrl: requireEnv('BACKEND_URL'),
  cors: {
    origins: (process.env.CORS_ORIGINS || 'http://localhost:5173')
      .split(',')
      .map((origin) => origin.trim()),
  },
  systemPrompt: process.env.AI_SYSTEM_PROMPT || '',
  port: Number.parseInt(process.env.PORT || '3001', 10),
};
