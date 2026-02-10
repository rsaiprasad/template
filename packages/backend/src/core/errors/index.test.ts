import { describe, expect, it } from 'bun:test';
import {
  AppError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from './index';

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create an error with message, statusCode, and code', () => {
      const err = new AppError('something broke', 500, 'INTERNAL');
      expect(err.message).toBe('something broke');
      expect(err.statusCode).toBe(500);
      expect(err.code).toBe('INTERNAL');
      expect(err.name).toBe('AppError');
      expect(err).toBeInstanceOf(Error);
    });
  });

  describe('NotFoundError', () => {
    it('should format resource name in message', () => {
      const err = new NotFoundError('User');
      expect(err.message).toBe('User not found');
      expect(err.statusCode).toBe(404);
      expect(err.code).toBe('NOT_FOUND');
    });
  });

  describe('ForbiddenError', () => {
    it('should use default message', () => {
      const err = new ForbiddenError();
      expect(err.message).toBe('Access denied');
      expect(err.statusCode).toBe(403);
      expect(err.code).toBe('FORBIDDEN');
    });

    it('should allow custom message', () => {
      const err = new ForbiddenError('No access to this resource');
      expect(err.message).toBe('No access to this resource');
    });
  });

  describe('ValidationError', () => {
    it('should set 400 status', () => {
      const err = new ValidationError('Invalid email');
      expect(err.message).toBe('Invalid email');
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('ConflictError', () => {
    it('should set 409 status', () => {
      const err = new ConflictError('Already exists');
      expect(err.message).toBe('Already exists');
      expect(err.statusCode).toBe(409);
      expect(err.code).toBe('CONFLICT');
    });
  });

  describe('UnauthorizedError', () => {
    it('should use default message', () => {
      const err = new UnauthorizedError();
      expect(err.message).toBe('Authentication required');
      expect(err.statusCode).toBe(401);
      expect(err.code).toBe('UNAUTHORIZED');
    });

    it('should allow custom message', () => {
      const err = new UnauthorizedError('Token expired');
      expect(err.message).toBe('Token expired');
    });
  });
});
