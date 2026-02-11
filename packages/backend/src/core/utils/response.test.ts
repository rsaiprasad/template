import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import {
  ErrorCodes,
  errorResponse,
  generateRequestId,
  getClientIp,
  paginatedResponse,
  successResponse,
} from './response';

/**
 * Helper to call a response function inside a real Hono context
 * and return the parsed JSON + status code.
 */
async function callInContext(
  fn: (c: Parameters<typeof successResponse>[0]) => Response
): Promise<{ status: number; body: unknown }> {
  const app = new Hono();
  app.get('/test', (c) => fn(c));
  const res = await app.request('/test');
  return { status: res.status, body: await res.json() };
}

describe('Response Helpers', () => {
  describe('successResponse', () => {
    it('should return 200 with success:true and data', async () => {
      const { status, body } = await callInContext((c) =>
        successResponse(c, { id: '1', name: 'Test' })
      );
      expect(status).toBe(200);
      expect(body).toEqual({
        success: true,
        data: { id: '1', name: 'Test' },
      });
    });

    it('should support 201 status', async () => {
      const { status, body } = await callInContext((c) =>
        successResponse(c, { created: true }, 201)
      );
      expect(status).toBe(201);
      expect((body as Record<string, unknown>).success).toBe(true);
    });

    it('should include meta if provided', async () => {
      const meta = { page: 1, limit: 10, total: 100, hasMore: true };
      const { body } = await callInContext((c) => successResponse(c, [1, 2, 3], 200, meta));
      expect((body as Record<string, unknown>).meta).toEqual(meta);
    });
  });

  describe('paginatedResponse', () => {
    it('should set hasMore based on page * limit < total', async () => {
      const { body } = await callInContext((c) =>
        paginatedResponse(c, [1, 2], { page: 1, limit: 2, total: 5 })
      );
      const b = body as Record<string, unknown>;
      expect(b.success).toBe(true);
      const meta = b.meta as Record<string, unknown>;
      expect(meta.hasMore).toBe(true);
      expect(meta.total).toBe(5);
    });

    it('should set hasMore false on last page', async () => {
      const { body } = await callInContext((c) =>
        paginatedResponse(c, [5], { page: 3, limit: 2, total: 5 })
      );
      const meta = (body as Record<string, unknown>).meta as Record<string, unknown>;
      expect(meta.hasMore).toBe(false);
    });

    it('should include nextCursor if provided', async () => {
      const { body } = await callInContext((c) =>
        paginatedResponse(c, [1], {
          page: 1,
          limit: 1,
          total: 5,
          nextCursor: 'abc123',
        })
      );
      const meta = (body as Record<string, unknown>).meta as Record<string, unknown>;
      expect(meta.nextCursor).toBe('abc123');
    });
  });

  describe('errorResponse', () => {
    it('should return error structure with status code', async () => {
      const { status, body } = await callInContext((c) =>
        errorResponse(c, ErrorCodes.NOT_FOUND, 'Not found', 404)
      );
      expect(status).toBe(404);
      expect(body).toEqual({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Not found' },
      });
    });

    it('should include details when provided', async () => {
      const { body } = await callInContext((c) =>
        errorResponse(c, ErrorCodes.VALIDATION_ERROR, 'Bad', 400, {
          field: 'email',
        })
      );
      const b = body as { error: { details: unknown } };
      expect(b.error.details).toEqual({ field: 'email' });
    });
  });

  describe('generateRequestId', () => {
    it('should return a string starting with req_', () => {
      const id = generateRequestId();
      expect(id).toMatch(/^req_\d+_[a-z0-9]+$/);
    });

    it('should return unique IDs', () => {
      const ids = new Set(Array.from({ length: 50 }, () => generateRequestId()));
      expect(ids.size).toBe(50);
    });
  });

  describe('getClientIp', () => {
    it('should extract ip from x-forwarded-for', async () => {
      const app = new Hono();
      let ip = '';
      app.get('/test', (c) => {
        ip = getClientIp(c);
        return c.text('ok');
      });
      await app.request('/test', {
        headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
      });
      expect(ip).toBe('1.2.3.4');
    });

    it('should fall back to x-real-ip', async () => {
      const app = new Hono();
      let ip = '';
      app.get('/test', (c) => {
        ip = getClientIp(c);
        return c.text('ok');
      });
      await app.request('/test', {
        headers: { 'x-real-ip': '9.8.7.6' },
      });
      expect(ip).toBe('9.8.7.6');
    });

    it('should return unknown when no ip headers', async () => {
      const app = new Hono();
      let ip = '';
      app.get('/test', (c) => {
        ip = getClientIp(c);
        return c.text('ok');
      });
      await app.request('/test');
      expect(ip).toBe('unknown');
    });
  });
});
