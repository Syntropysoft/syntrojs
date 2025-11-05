/**
 * Comprehensive tests for MiddlewareRegistry.ts to increase coverage
 *
 * Principles Applied:
 * - SOLID: Single Responsibility, Open/Closed, Dependency Inversion
 * - DDD: Domain Services, Value Objects, Aggregates
 * - Functional: Pure functions, Immutability, Composition
 * - Guard Clauses: Early validation, Fail Fast
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { MiddlewareRegistry } from '../../../src/application/MiddlewareRegistry';
import type { MiddlewareConfig, RequestContext } from '../../../src/domain/types';

describe('MiddlewareRegistry - Comprehensive Coverage Tests', () => {
  let registry: MiddlewareRegistry;

  beforeEach(() => {
    registry = new MiddlewareRegistry();
  });

  describe('Guard Clauses', () => {
    it('should validate middleware parameter', () => {
      // Test null middleware
      expect(() => registry.add(null as any)).toThrow('Middleware must be a valid function');

      // Test undefined middleware
      expect(() => registry.add(undefined as any)).toThrow('Middleware must be a valid function');

      // Test non-function middleware
      expect(() => registry.add('invalid' as any)).toThrow('Middleware must be a valid function');
      expect(() => registry.add(123 as any)).toThrow('Middleware must be a valid function');
      expect(() => registry.add({} as any)).toThrow('Middleware must be a valid function');
    });

    it('should validate path parameter', () => {
      const middleware = (_context: RequestContext) => {};

      // Test null path
      expect(() => registry.add(middleware, { path: null as any })).toThrow(
        'Path must be a valid string',
      );

      // Test undefined path
      expect(() => registry.add(middleware, { path: undefined as any })).toThrow(
        'Path must be a valid string',
      );

      // Test empty path
      expect(() => registry.add(middleware, { path: '' })).toThrow('Path must be a valid string');

      // Test non-string path
      expect(() => registry.add(middleware, { path: 123 as any })).toThrow(
        'Path must be a valid string',
      );
    });

    it('should validate method parameter', () => {
      const middleware = (_context: RequestContext) => {};

      // Test invalid method
      expect(() => registry.add(middleware, { method: 'INVALID' as any })).toThrow(
        'Method must be a valid HTTP method',
      );

      // Test non-string method
      expect(() => registry.add(middleware, { method: 123 as any })).toThrow(
        'Method must be a valid HTTP method',
      );
    });

    it('should validate priority parameter', () => {
      const middleware = (_context: RequestContext) => {};

      // Test negative priority
      expect(() => registry.add(middleware, { priority: -1 })).toThrow(
        'Priority must be a non-negative integer',
      );

      // Test non-integer priority
      expect(() => registry.add(middleware, { priority: 1.5 })).toThrow(
        'Priority must be a non-negative integer',
      );

      // Test non-number priority
      expect(() => registry.add(middleware, { priority: 'invalid' as any })).toThrow(
        'Priority must be a non-negative integer',
      );
    });

    it('should validate context parameter in executeMiddlewares', () => {
      const middleware = (_context: RequestContext) => {};
      const registryWithMiddleware = registry.add(middleware);

      // Test null context
      expect(() => registryWithMiddleware.executeMiddlewares([], null as any)).toThrow(
        'RequestContext is required',
      );

      // Test undefined context
      expect(() => registryWithMiddleware.executeMiddlewares([], undefined as any)).toThrow(
        'RequestContext is required',
      );
    });
  });

  describe('Middleware Addition (Functional Programming)', () => {
    it('should add middleware and return new instance', () => {
      const middleware = (_context: RequestContext) => {};

      const newRegistry = registry.add(middleware);

      expect(newRegistry).toBeInstanceOf(MiddlewareRegistry);
      expect(newRegistry).not.toBe(registry);
      expect(newRegistry.getCount()).toBe(1);
      expect(registry.getCount()).toBe(0);
    });

    it('should add middleware with configuration', () => {
      const middleware = (_context: RequestContext) => {};
      const config: MiddlewareConfig = {
        path: '/api',
        method: 'GET',
        priority: 10,
      };

      const newRegistry = registry.add(middleware, config);

      expect(newRegistry).toBeInstanceOf(MiddlewareRegistry);
      expect(newRegistry.getCount()).toBe(1);
    });

    it('should add multiple middlewares', () => {
      const middleware1 = (_context: RequestContext) => {};
      const middleware2 = (_context: RequestContext) => {};

      const registry1 = registry.add(middleware1);
      const registry2 = registry1.add(middleware2);

      expect(registry2.getCount()).toBe(2);
      expect(registry1.getCount()).toBe(1);
      expect(registry.getCount()).toBe(0);
    });

    it('should handle middleware with default configuration', () => {
      const middleware = (_context: RequestContext) => {};

      const newRegistry = registry.add(middleware, {});

      expect(newRegistry.getCount()).toBe(1);
    });
  });

  describe('Middleware Removal (Functional Programming)', () => {
    it('should remove middleware and return new instance', () => {
      const middleware = (_context: RequestContext) => {};
      const registryWithMiddleware = registry.add(middleware);

      const newRegistry = registryWithMiddleware.remove(middleware);

      expect(newRegistry).toBeInstanceOf(MiddlewareRegistry);
      expect(newRegistry).not.toBe(registryWithMiddleware);
      expect(newRegistry.getCount()).toBe(0);
    });

    it('should handle removal of non-existent middleware', () => {
      const middleware = (_context: RequestContext) => {};

      const newRegistry = registry.remove(middleware);

      expect(newRegistry).toBeInstanceOf(MiddlewareRegistry);
      expect(newRegistry).not.toBe(registry);
      expect(newRegistry.getCount()).toBe(0);
    });

    it('should remove specific middleware from multiple', () => {
      const middleware1 = (_context: RequestContext) => {};
      const middleware2 = (_context: RequestContext) => {};

      const registryWithBoth = registry.add(middleware1).add(middleware2);

      const registryWithOne = registryWithBoth.remove(middleware1);

      expect(registryWithOne.getCount()).toBe(1);
    });
  });

  describe('Middleware Clearing (Functional Programming)', () => {
    it('should clear all middlewares and return new instance', () => {
      const middleware1 = (_context: RequestContext) => {};
      const middleware2 = (_context: RequestContext) => {};

      const registryWithMiddlewares = registry.add(middleware1).add(middleware2);

      const clearedRegistry = registryWithMiddlewares.clear();

      expect(clearedRegistry).toBeInstanceOf(MiddlewareRegistry);
      expect(clearedRegistry).not.toBe(registryWithMiddlewares);
      expect(clearedRegistry.getCount()).toBe(0);
    });

    it('should handle clearing empty registry', () => {
      const clearedRegistry = registry.clear();

      expect(clearedRegistry).toBeInstanceOf(MiddlewareRegistry);
      expect(clearedRegistry).not.toBe(registry);
      expect(clearedRegistry.getCount()).toBe(0);
    });
  });

  describe('Middleware Retrieval (DDD)', () => {
    it('should get middlewares by path and method', () => {
      const middleware1 = (_context: RequestContext) => {};
      const middleware2 = (_context: RequestContext) => {};

      const registryWithMiddlewares = registry
        .add(middleware1, { path: '/api', method: 'GET' })
        .add(middleware2, { path: '/api', method: 'POST' });

      const getMiddlewares = registryWithMiddlewares.getMiddlewares('/api', 'GET');
      const postMiddlewares = registryWithMiddlewares.getMiddlewares('/api', 'POST');

      expect(getMiddlewares).toHaveLength(1);
      expect(postMiddlewares).toHaveLength(1);
      expect(getMiddlewares[0]).toBe(middleware1);
      expect(postMiddlewares[0]).toBe(middleware2);
    });

    it('should get middlewares with wildcard path', () => {
      const middleware1 = (_context: RequestContext) => {};
      const middleware2 = (_context: RequestContext) => {};

      const registryWithMiddlewares = registry
        .add(middleware1, { path: '*' })
        .add(middleware2, { path: '/api' });

      const allMiddlewares = registryWithMiddlewares.getMiddlewares('/api', 'GET');

      expect(allMiddlewares).toHaveLength(2);
    });

    it('should get middlewares with wildcard method', () => {
      const middleware1 = (_context: RequestContext) => {};
      const middleware2 = (_context: RequestContext) => {};

      const registryWithMiddlewares = registry
        .add(middleware1, { method: '*' })
        .add(middleware2, { method: 'GET' });

      const allMiddlewares = registryWithMiddlewares.getMiddlewares('/api', 'GET');

      expect(allMiddlewares).toHaveLength(2);
    });

    it('should return empty array for non-matching path and method', () => {
      const middleware = (_context: RequestContext) => {};
      const registryWithMiddleware = registry.add(middleware, { path: '/api', method: 'GET' });

      const middlewares = registryWithMiddleware.getMiddlewares('/users', 'POST');

      expect(middlewares).toHaveLength(0);
    });
  });

  describe('Middleware Execution (Functional Programming)', () => {
    it('should execute middlewares in priority order', async () => {
      const executionOrder: number[] = [];

      const middleware1 = (_context: RequestContext) => {
        executionOrder.push(1);
      };
      const middleware2 = (_context: RequestContext) => {
        executionOrder.push(2);
      };
      const middleware3 = (_context: RequestContext) => {
        executionOrder.push(3);
      };

      const registryWithMiddlewares = registry
        .add(middleware1, { priority: 10 })
        .add(middleware2, { priority: 5 })
        .add(middleware3, { priority: 15 });

      const middlewares = registryWithMiddlewares.getMiddlewares('*', '*');
      const context = {
        method: 'GET',
        path: '/test',
        params: {},
        query: {},
        body: {},
        headers: {},
        cookies: {},
        correlationId: 'test',
        timestamp: new Date(),
        dependencies: {},
        background: { addTask: async () => {} },
      } as RequestContext;

      await registryWithMiddlewares.executeMiddlewares(middlewares, context);

      // Should execute in priority order: 5, 10, 15
      expect(executionOrder).toEqual([2, 1, 3]);
    });

    it('should handle middleware execution errors gracefully', async () => {
      const middleware1 = (_context: RequestContext) => {
        throw new Error('Middleware error');
      };
      const middleware2 = (_context: RequestContext) => {};

      const registryWithMiddlewares = registry.add(middleware1).add(middleware2);

      const middlewares = registryWithMiddlewares.getMiddlewares('*', '*');
      const context = {
        method: 'GET',
        path: '/test',
        params: {},
        query: {},
        body: {},
        headers: {},
        cookies: {},
        correlationId: 'test',
        timestamp: new Date(),
        dependencies: {},
        background: { addTask: async () => {} },
      } as RequestContext;

      // Should not throw, but handle error gracefully
      await expect(
        registryWithMiddlewares.executeMiddlewares(middlewares, context),
      ).resolves.not.toThrow();
    });

    it('should execute empty middleware list', async () => {
      const context = {
        method: 'GET',
        path: '/test',
        params: {},
        query: {},
        body: {},
        headers: {},
        cookies: {},
        correlationId: 'test',
        timestamp: new Date(),
        dependencies: {},
        background: { addTask: async () => {} },
      } as RequestContext;

      await expect(registry.executeMiddlewares([], context)).resolves.not.toThrow();
    });
  });

  describe('Registry State (DDD)', () => {
    it('should track middleware count correctly', () => {
      expect(registry.getCount()).toBe(0);
      expect(registry.isEmpty()).toBe(true);

      const middleware = (_context: RequestContext) => {};
      const registryWithMiddleware = registry.add(middleware);

      expect(registryWithMiddleware.getCount()).toBe(1);
      expect(registryWithMiddleware.isEmpty()).toBe(false);

      const registryWithTwo = registryWithMiddleware.add(middleware);

      expect(registryWithTwo.getCount()).toBe(2);
      expect(registryWithTwo.isEmpty()).toBe(false);
    });

    it('should maintain immutability', () => {
      const middleware1 = (_context: RequestContext) => {};
      const middleware2 = (_context: RequestContext) => {};

      const registry1 = registry.add(middleware1);
      const registry2 = registry1.add(middleware2);
      const registry3 = registry2.remove(middleware1);

      // Each operation should create a new instance
      expect(registry).not.toBe(registry1);
      expect(registry1).not.toBe(registry2);
      expect(registry2).not.toBe(registry3);

      // Original registry should remain unchanged
      expect(registry.getCount()).toBe(0);
      expect(registry1.getCount()).toBe(1);
      expect(registry2.getCount()).toBe(2);
      expect(registry3.getCount()).toBe(1);
    });
  });

  describe('Path Matching (Functional Programming)', () => {
    it('should match exact paths', () => {
      const middleware = (_context: RequestContext) => {};
      const registryWithMiddleware = registry.add(middleware, { path: '/api/users' });

      const middlewares = registryWithMiddleware.getMiddlewares('/api/users', 'GET');

      expect(middlewares).toHaveLength(1);
    });

    it('should match wildcard paths', () => {
      const middleware = (_context: RequestContext) => {};
      const registryWithMiddleware = registry.add(middleware, { path: '*' });

      const middlewares = registryWithMiddleware.getMiddlewares('/any/path', 'GET');

      expect(middlewares).toHaveLength(1);
    });

    it('should match partial paths', () => {
      const middleware = (_context: RequestContext) => {};
      const registryWithMiddleware = registry.add(middleware, { path: '/api' });

      const middlewares = registryWithMiddleware.getMiddlewares('/api/users', 'GET');

      expect(middlewares).toHaveLength(1);
    });
  });

  describe('Method Matching (Functional Programming)', () => {
    it('should match exact methods', () => {
      const middleware = (_context: RequestContext) => {};
      const registryWithMiddleware = registry.add(middleware, { method: 'GET' });

      const middlewares = registryWithMiddleware.getMiddlewares('/api', 'GET');

      expect(middlewares).toHaveLength(1);
    });

    it('should match wildcard methods', () => {
      const middleware = (_context: RequestContext) => {};
      const registryWithMiddleware = registry.add(middleware, { method: '*' });

      const middlewares = registryWithMiddleware.getMiddlewares('/api', 'POST');

      expect(middlewares).toHaveLength(1);
    });

    it('should not match different methods', () => {
      const middleware = (_context: RequestContext) => {};
      const registryWithMiddleware = registry.add(middleware, { method: 'GET' });

      const middlewares = registryWithMiddleware.getMiddlewares('/api', 'POST');

      expect(middlewares).toHaveLength(0);
    });
  });

  describe('Complex Scenarios (Functional Composition)', () => {
    it('should handle complex middleware configurations', () => {
      const middleware1 = (_context: RequestContext) => {};
      const middleware2 = (_context: RequestContext) => {};
      const middleware3 = (_context: RequestContext) => {};

      const complexRegistry = registry
        .add(middleware1, { path: '/api', method: 'GET', priority: 10 })
        .add(middleware2, { path: '/api', method: 'POST', priority: 5 })
        .add(middleware3, { path: '*', method: '*', priority: 1 });

      expect(complexRegistry.getCount()).toBe(3);

      const getMiddlewares = complexRegistry.getMiddlewares('/api', 'GET');
      const postMiddlewares = complexRegistry.getMiddlewares('/api', 'POST');
      const allMiddlewares = complexRegistry.getMiddlewares('/api', 'GET');

      expect(getMiddlewares).toHaveLength(2); // middleware1 + middleware3
      expect(postMiddlewares).toHaveLength(2); // middleware2 + middleware3
      expect(allMiddlewares).toHaveLength(2);
    });

    it('should handle chaining operations', () => {
      const middleware1 = (_context: RequestContext) => {};
      const middleware2 = (_context: RequestContext) => {};
      const middleware3 = (_context: RequestContext) => {};

      const chainedRegistry = registry
        .add(middleware1)
        .add(middleware2)
        .remove(middleware1)
        .add(middleware3)
        .clear()
        .add(middleware1);

      expect(chainedRegistry.getCount()).toBe(1);
    });
  });
});
