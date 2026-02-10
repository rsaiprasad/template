import { describe, expect, it } from 'bun:test';
import { AppError, ForbiddenError, NotFoundError } from './index';

describe('Error Classes', () => {
  it('AppError sets message, statusCode, code, and extends Error', () => {
    const err = new AppError('something broke', 500, 'INTERNAL');
    expect(err.message).toBe('something broke');
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe('INTERNAL');
    expect(err).toBeInstanceOf(Error);
  });

  it('NotFoundError formats resource name in message', () => {
    const err = new NotFoundError('User');
    expect(err.message).toBe('User not found');
    expect(err.statusCode).toBe(404);
  });

  it('ForbiddenError uses default message when none provided', () => {
    expect(new ForbiddenError().message).toBe('Access denied');
    expect(new ForbiddenError('Custom').message).toBe('Custom');
  });
});
