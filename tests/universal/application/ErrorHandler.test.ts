/**
 * ErrorHandler tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance, SpyInstance } from 'vitest';
import { createErrorHandler } from '../../../src/application/ErrorHandler';
import {
  BadRequestException,
  HTTPException,
  NotFoundException,
  ValidationException,
} from '../../../src/domain/HTTPException';
import type { RequestContext } from '../../../src/domain/types';

describe('ErrorHandler', () => {
  let handler: ReturnType<typeof createErrorHandler>;
  let consoleErrorSpy: MockInstance<unknown[], void> | SpyInstance;
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    handler = createErrorHandler();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Save original NODE_ENV and set default for tests
    originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore(); // Restore console.error
    // Restore original NODE_ENV
    if (originalNodeEnv !== undefined) {
      process.env.NODE_ENV = originalNodeEnv;
    } else {
      process.env.NODE_ENV = undefined;
    }
  });

  const createMockContext = (): RequestContext => ({
    method: 'GET',
    path: '/test',
    params: {},
    query: {},
    body: {},
    headers: {},
    cookies: {},
    correlationId: 'test-123',
    timestamp: new Date(),
    dependencies: {}, // Added for RequestContext compatibility
    background: {}, // Added for RequestContext compatibility
  });

  describe('Default handlers', () => {
    it('should handle HTTPException with status and detail', async () => {
      const error = new HTTPException(404, 'Resource not found');
      const context = createMockContext();

      const response = await handler.handle(error, context);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        detail: 'Resource not found',
        path: '/test',
      });
    });

    it('should handle HTTPException with custom headers', async () => {
      const error = new HTTPException(401, 'Unauthorized', {
        'WWW-Authenticate': 'Bearer',
      });
      const context = createMockContext();

      const response = await handler.handle(error, context);

      expect(response.status).toBe(401);
      expect(response.headers).toEqual({
        'WWW-Authenticate': 'Bearer',
      });
    });

    it('should handle ValidationException with errors array', async () => {
      const validationErrors = [
        { field: 'email', message: 'Invalid email' },
        { field: 'age', message: 'Must be at least 18' },
      ];
      const error = new ValidationException(validationErrors);
      const context = createMockContext();

      const response = await handler.handle(error, context);

      expect(response.status).toBe(422);
      expect(response.body).toEqual({
        detail: 'Validation Error',
        errors: validationErrors,
        path: '/test',
      });
    });

    it('should handle generic Error with 500 status', async () => {
      const error = new Error('Something went wrong');
      const context = createMockContext();

      // NODE_ENV is set to development in beforeEach
      const response = await handler.handle(error, context);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        detail: 'Something went wrong',
        path: '/test',
      });
    });

    it('should hide error details in production', async () => {
      const error = new Error('Internal database error');
      const context = createMockContext();

      // Override NODE_ENV for this specific test
      process.env.NODE_ENV = 'production';

      const response = await handler.handle(error, context);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        detail: 'Internal Server Error',
        path: '/test',
      });
    });
  });

  describe('Custom exception handlers', () => {
    it('should register and use custom handler', async () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'CustomError';
        }
      }

      handler.register(CustomError, (context, error) => ({
        status: 418,
        body: {
          detail: `Custom: ${error.message}`,
          path: context.path,
        },
      }));

      const error = new CustomError('Test error');
      const context = createMockContext();

      const response = await handler.handle(error, context);

      expect(response.status).toBe(418);
      expect(response.body.detail).toBe('Custom: Test error');
    });

    it('should override default handler when registered', async () => {
      handler.register(HTTPException, () => ({
        status: 999,
        body: { custom: 'override' },
      }));

      const error = new HTTPException(404, 'Not found');
      const context = createMockContext();

      const response = await handler.handle(error, context);

      expect(response.status).toBe(999);
      expect(response.body).toEqual({ custom: 'override' });
    });

    it('should handle inheritance correctly', async () => {
      const error = new NotFoundException('User not found');
      const context = createMockContext();

      const response = await handler.handle(error, context);

      // NotFoundException extends HTTPException, should use HTTPException handler
      expect(response.status).toBe(404);
      expect(response.body.detail).toBe('User not found');
    });

    it('should throw error if error class is null', () => {
      expect(() => handler.register(null as any, () => ({}) as any)).toThrow(
        'Error class is required',
      );
    });

    it('should throw error if handler function is null', () => {
      expect(() => handler.register(Error, null as any)).toThrow('Handler function is required');
    });
  });

  describe('handle', () => {
    it('should throw error if error is null', async () => {
      const context = createMockContext();
      await expect(handler.handle(null as any, context)).rejects.toThrow('Error is required');
    });

    it('should throw error if context is null', async () => {
      const error = new Error('test');
      await expect(handler.handle(error, null as any)).rejects.toThrow('Context is required');
    });

    it('should include correlation ID in context', async () => {
      const error = new HTTPException(400, 'Bad request');
      const context = createMockContext();
      context.correlationId = 'custom-correlation-id';

      const response = await handler.handle(error, context);

      expect(response.body.path).toBe('/test');
    });
  });

  describe('hasHandler', () => {
    it('should return true for registered handlers', () => {
      class CustomError extends Error {}

      handler.register(CustomError, () => ({}) as any);

      expect(handler.hasHandler(CustomError)).toBe(true);
    });

    it('should return false for exceptions without registered handlers', () => {
      // No default handlers registered - uses structural typing with statusCode instead
      expect(handler.hasHandler(HTTPException)).toBe(false);
      expect(handler.hasHandler(ValidationException)).toBe(false);
      expect(handler.hasHandler(Error)).toBe(false);
    });

    it('should return false for unregistered handlers', () => {
      class UnregisteredError extends Error {}

      expect(handler.hasHandler(UnregisteredError)).toBe(false);
    });

    it('should throw error if error class is null', () => {
      expect(() => handler.hasHandler(null as any)).toThrow('Error class is required');
    });
  });

  describe('getRegisteredErrorClasses', () => {
    it('should return empty array when no handlers registered', () => {
      const classes = handler.getRegisteredErrorClasses();

      // No default handlers - uses structural typing instead
      expect(classes).toEqual([]);
    });

    it('should include custom registered classes', () => {
      class CustomError extends Error {}

      handler.register(CustomError, () => ({}) as any);

      const classes = handler.getRegisteredErrorClasses();

      expect(classes).toContain(CustomError);
    });

    it('should return immutable array', () => {
      const classes = handler.getRegisteredErrorClasses();

      // Try to modify
      (classes as any).push(null);

      // Should not affect internal state
      const newClasses = handler.getRegisteredErrorClasses();
      expect(newClasses).not.toContain(null);
    });
  });

  describe('clearCustomHandlers', () => {
    it('should clear custom handlers', () => {
      class CustomError extends Error {}

      handler.register(CustomError, () => ({}) as any);

      expect(handler.hasHandler(CustomError)).toBe(true);

      handler.clearCustomHandlers();

      expect(handler.hasHandler(CustomError)).toBe(false);
      // No default handlers - uses structural typing with statusCode
      expect(handler.hasHandler(HTTPException)).toBe(false);
      expect(handler.hasHandler(Error)).toBe(false);
    });
  });

  describe('Error hierarchy handling', () => {
    it('should use most specific handler when multiple match', async () => {
      class ParentError extends Error {}
      class ChildError extends ParentError {}

      handler.register(ParentError, () => ({
        status: 400,
        body: { type: 'parent' },
      }));

      handler.register(ChildError, () => ({
        status: 401,
        body: { type: 'child' },
      }));

      const error = new ChildError('test');
      const context = createMockContext();

      const response = await handler.handle(error, context);

      // Should use ChildError handler (more specific)
      expect(response.status).toBe(401);
      expect(response.body.type).toBe('child');
    });

    it('should fall back to parent handler if child not registered', async () => {
      // Create fresh handler to avoid default Error handler interference
      const freshHandler = createErrorHandler();

      class ParentError extends Error {}
      class ChildError extends ParentError {}

      freshHandler.register(ParentError, () => ({
        status: 400,
        body: { type: 'parent' },
      }));

      const error = new ChildError('test');
      const context = createMockContext();

      const response = await freshHandler.handle(error, context);

      // Should use ParentError handler (via instanceof check)
      expect(response.status).toBe(400);
      expect(response.body.type).toBe('parent');
    });
  });

  describe('Boundary conditions', () => {
    it('should handle errors with very long messages', async () => {
      const longMessage = 'a'.repeat(10000);
      const error = new HTTPException(400, longMessage);
      const context = createMockContext();

      const response = await handler.handle(error, context);

      expect(response.body.detail).toBe(longMessage);
      expect(response.body.detail.length).toBe(10000);
    });

    it('should handle nested errors', async () => {
      const originalError = new Error('Original');
      const wrappedError = new Error('Wrapped');
      (wrappedError as any).cause = originalError;

      const context = createMockContext();

      const response = await handler.handle(wrappedError, context);

      expect(response.status).toBe(500);
    });

    it('should handle all common HTTP exception types', async () => {
      const exceptions = [
        new BadRequestException('Bad request'),
        new NotFoundException('Not found'),
        new HTTPException(503, 'Service unavailable'),
      ];

      const context = createMockContext();

      for (const error of exceptions) {
        const response = await handler.handle(error, context);
        expect(response.status).toBeGreaterThanOrEqual(400);
        expect(response.body.detail).toBeDefined();
      }
    });
  });

  describe('Async handlers', () => {
    it('should support async exception handlers', async () => {
      class AsyncError extends Error {}

      handler.register(AsyncError, async (context) => {
        // Simulate async operation
        await new Promise((resolve) => setTimeout(resolve, 10));

        return {
          status: 429,
          body: { detail: 'Rate limited', path: context.path },
        };
      });

      const error = new AsyncError('test');
      const context = createMockContext();

      const response = await handler.handle(error, context);

      expect(response.status).toBe(429);
      expect(response.body.detail).toBe('Rate limited');
    });
  });
});
