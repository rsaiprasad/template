import type { Context, Next } from 'hono';
import { config } from '../../config';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now >= entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 1000); // Clean up every minute

/**
 * Get rate limit key based on user identity (preferred) or IP, plus path.
 * Extracts user ID from the JWT payload without full verification for speed.
 * Falls back to IP-based keying for unauthenticated requests.
 */
function getRateLimitKey(c: Context): string {
  const path = c.req.path;

  // Try to extract user ID from JWT for per-user rate limiting
  const authHeader = c.req.header('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const parts = authHeader.slice(7).split('.');
      const payload = JSON.parse(atob(parts[1] || ''));
      const uid = payload.sub || payload.user_id;
      if (uid) return `user:${uid}:${path}`;
    } catch {
      // Malformed token — fall through to IP-based key
    }
  }

  const ip =
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
    c.req.header('x-real-ip') ||
    'unknown';
  return `ip:${ip}:${path}`;
}

/**
 * Check if the request path is an auth endpoint
 */
function isAuthEndpoint(path: string): boolean {
  return path.includes('/auth/login') || path.includes('/auth/logout');
}

/**
 * Rate limiting middleware
 * Uses in-memory store to track requests by IP + path
 * Returns 429 Too Many Requests when limit is exceeded
 */
export function rateLimitMiddleware() {
  return async (c: Context, next: Next) => {
    const key = getRateLimitKey(c);
    const now = Date.now();
    const path = c.req.path;

    // Use stricter limits for auth endpoints
    const maxRequests = isAuthEndpoint(path) ? config.rateLimit.authMax : config.rateLimit.max;
    const windowMs = config.rateLimit.windowMs;

    let entry = rateLimitStore.get(key);

    // If no entry or window has expired, create new entry
    if (!entry || now >= entry.resetTime) {
      entry = {
        count: 1,
        resetTime: now + windowMs,
      };
      rateLimitStore.set(key, entry);
    } else {
      entry.count++;
    }

    // Calculate remaining requests and reset time
    const remaining = Math.max(0, maxRequests - entry.count);
    const resetSeconds = Math.ceil((entry.resetTime - now) / 1000);

    // Set rate limit headers
    c.header('X-RateLimit-Limit', String(maxRequests));
    c.header('X-RateLimit-Remaining', String(remaining));
    c.header('X-RateLimit-Reset', String(resetSeconds));

    // Check if limit exceeded
    if (entry.count > maxRequests) {
      c.header('Retry-After', String(resetSeconds));
      return c.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again later.',
          },
        },
        429
      );
    }

    await next();
  };
}
