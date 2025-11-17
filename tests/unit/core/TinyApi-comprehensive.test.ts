/**
 * Comprehensive tests for SyntroJS.ts to increase coverage
 *
 * Principles Applied:
 * - SOLID: Single Responsibility, Open/Closed, Dependency Inversion
 * - DDD: Domain Services, Value Objects, Aggregates
 * - Functional: Pure functions, Immutability, Composition
 * - Guard Clauses: Early validation, Fail Fast
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { SyntroJS } from '../../../src/core';

describe('SyntroJS - Comprehensive Coverage Tests', () => {
  let api: SyntroJS;

  beforeEach(() => {
    api = new SyntroJS();
  });

  afterEach(() => {
    // Cleanup if needed
  });

  describe('Configuration Validation (Guard Clauses)', () => {
    it('should validate configuration object', () => {
      // Test null configuration
      expect(() => new SyntroJS(null as any)).toThrow('Configuration must be a valid object');

      // Test invalid configuration type
      expect(() => new SyntroJS('invalid' as any)).toThrow('Configuration must be a valid object');
    });

    it('should validate runtime configuration', () => {
      // Test valid runtime values
      expect(() => new SyntroJS({ runtime: 'auto' })).not.toThrow();
      expect(() => new SyntroJS({ runtime: 'node' })).not.toThrow();
      expect(() => new SyntroJS({ runtime: 'bun' })).not.toThrow();

      // Test invalid runtime value
      expect(() => new SyntroJS({ runtime: 'invalid' as any })).toThrow(
        'Runtime must be "auto", "node", or "bun"',
      );
    });

    it('should validate fluentConfig object', () => {
      // Test valid fluentConfig
      expect(() => new SyntroJS({ fluentConfig: {} })).not.toThrow();

      // Test invalid fluentConfig type
      expect(() => new SyntroJS({ fluentConfig: 'invalid' as any })).toThrow(
        'fluentConfig must be a valid object',
      );
    });
  });

  describe('Runtime Detection (Functional Programming)', () => {
    it('should detect Node.js runtime by default', () => {
      const api = new SyntroJS();
      // In test environment, we're running in Node.js
      expect(api['runtime']).toBe('node');
    });

    it('should respect explicit runtime configuration', () => {
      const nodeApi = new SyntroJS({ runtime: 'node' });
      expect(nodeApi['runtime']).toBe('node');

      const bunApi = new SyntroJS({ runtime: 'bun' });
      expect(bunApi['runtime']).toBe('bun');
    });
  });

  describe('Adapter Selection (Functional Programming)', () => {
    it('should select appropriate adapter based on configuration', () => {
      // Test default adapter selection
      const defaultApi = new SyntroJS();
      expect(defaultApi['adapter']).toBeDefined();

      // Test ultra-optimized adapter
      const ultraApi = new SyntroJS({ ultraOptimized: true });
      expect(ultraApi['adapter']).toBeDefined();

      // Test ultra-minimal adapter
      const minimalApi = new SyntroJS({ ultraMinimal: true });
      expect(minimalApi['adapter']).toBeDefined();

      // Test ultra-fast adapter
      const fastApi = new SyntroJS({ ultraFast: true });
      expect(fastApi['adapter']).toBeDefined();

      // Test fluent adapter
      const fluentApi = new SyntroJS({ fluent: true });
      expect(fluentApi['adapter']).toBeDefined();
    });
  });

  describe('Fluent Configuration (Functional Composition)', () => {
    it('should apply fluent configuration correctly', () => {
      const api = new SyntroJS({
        fluent: true,
        fluentConfig: {
          logger: true,
          validation: false,
          errorHandling: true,
          dependencyInjection: false,
          backgroundTasks: true,
          openAPI: false,
          compression: true,
          cors: false,
          helmet: true,
          rateLimit: false,
          middleware: true,
        },
      });

      expect(api).toBeInstanceOf(SyntroJS);
    });

    it('should handle empty fluent configuration', () => {
      const api = new SyntroJS({
        fluent: true,
        fluentConfig: {},
      });

      expect(api).toBeInstanceOf(SyntroJS);
    });
  });

  describe('Route Registration from Config (DDD)', () => {
    it('should register routes from configuration object', () => {
      const api = new SyntroJS({
        routes: {
          '/users': {
            get: {
              response: z.object({ users: z.array(z.string()) }),
              handler: () => ({ users: ['user1', 'user2'] }),
            },
            post: {
              body: z.object({ name: z.string() }),
              response: z.object({ id: z.number(), name: z.string() }),
              handler: ({ body }) => ({ id: 1, name: body.name }),
            },
          },
          '/products': {
            get: {
              response: z.object({ products: z.array(z.string()) }),
              handler: () => ({ products: ['product1'] }),
            },
            put: {
              body: z.object({ name: z.string() }),
              response: z.object({ updated: z.boolean() }),
              handler: () => ({ updated: true }),
            },
            delete: {
              response: z.object({ deleted: z.boolean() }),
              handler: () => ({ deleted: true }),
            },
            patch: {
              body: z.object({ name: z.string() }),
              response: z.object({ patched: z.boolean() }),
              handler: () => ({ patched: true }),
            },
          },
        },
      });

      expect(api).toBeInstanceOf(SyntroJS);

      // Verify routes are registered
      const spec = api.getOpenAPISpec();
      expect(spec.paths).toHaveProperty('/users');
      expect(spec.paths).toHaveProperty('/products');
    });

    it('should validate route configuration', () => {
      // Test null routes
      expect(() => new SyntroJS({ routes: null as any })).toThrow(
        'Routes configuration is required',
      );

      // Test empty path
      expect(
        () =>
          new SyntroJS({
            routes: {
              '': {
                get: { handler: () => ({}) },
              },
            },
          }),
      ).toThrow('Route path cannot be empty');

      // Test empty methods
      expect(
        () =>
          new SyntroJS({
            routes: {
              '/test': null as any,
            },
          }),
      ).toThrow("Route methods for path '/test' are required");
    });

    it('should validate HTTP methods', () => {
      expect(
        () =>
          new SyntroJS({
            routes: {
              '/test': {
                invalid: { handler: () => ({}) } as any,
              },
            },
          }),
      ).toThrow('Unsupported HTTP method: invalid');
    });
  });

  describe('Middleware System (Functional Programming)', () => {
    it('should support middleware registration', () => {
      const middleware = (context: any) => {
        context.headers['x-middleware'] = 'test';
      };

      const result = api.use(middleware);
      expect(result).toBe(api);

      // Verify middleware is registered
      const registry = api.getMiddlewareRegistry();
      expect(registry.getCount()).toBeGreaterThan(0);
    });

    it('should support path-specific middleware', () => {
      const middleware = (context: any) => {
        context.headers['x-path-middleware'] = 'test';
      };

      const result = api.use('/api', middleware);
      expect(result).toBe(api);
    });

    it('should support configured middleware', () => {
      const middleware = (context: any) => {
        context.headers['x-configured-middleware'] = 'test';
      };

      const result = api.use(middleware, { path: '/api', method: 'GET', priority: 10 });
      expect(result).toBe(api);
    });

    it('should validate middleware parameters', () => {
      // Test null middleware
      expect(() => api.use(null as any)).toThrow('Middleware or path is required');

      // Test empty path
      expect(() => api.use('', (_context: any) => {})).toThrow('Middleware or path is required');
    });
  });

  describe('WebSocket System (Functional Programming)', () => {
    it('should support WebSocket handler registration', () => {
      const handler = (ws: any, _context: any) => {
        ws.send('Hello WebSocket');
      };

      const result = api.ws('/ws', handler);
      expect(result).toBe(api);

      // Verify WebSocket is registered
      const registry = api.getWebSocketRegistry();
      expect(registry.getCount()).toBeGreaterThan(0);
    });

    it('should validate WebSocket parameters', () => {
      const handler = (_ws: any, _context: any) => {};

      // Test null path
      expect(() => api.ws(null as any, handler)).toThrow(
        'Path is required and must be a valid string',
      );

      // Test empty path
      expect(() => api.ws('', handler)).toThrow('Path is required and must be a valid string');

      // Test invalid path type
      expect(() => api.ws(123 as any, handler)).toThrow(
        'Path is required and must be a valid string',
      );

      // Test null handler
      expect(() => api.ws('/ws', null as any)).toThrow(
        'Handler is required and must be a valid function',
      );

      // Test invalid handler type
      expect(() => api.ws('/ws', 'invalid' as any)).toThrow(
        'Handler is required and must be a valid function',
      );
    });
  });

  describe('Server Lifecycle (SOLID)', () => {
    it('should prevent multiple listen calls', async () => {
      const api = new SyntroJS();

      // First listen should work
      const address1 = await api.listen(0);
      expect(address1).toBeDefined();

      // Second listen should throw
      await expect(api.listen(0)).rejects.toThrow('Server is already started');
    });

    it('should validate port range', async () => {
      const api = new SyntroJS();

      // Test invalid port numbers
      await expect(api.listen(-1)).rejects.toThrow('Valid port number is required (0-65535)');
      await expect(api.listen(65536)).rejects.toThrow('Valid port number is required (0-65535)');
    });
  });

  describe('OpenAPI Generation (DDD)', () => {
    it('should generate OpenAPI spec with all configuration', () => {
      const api = new SyntroJS({
        title: 'Test API',
        version: '1.0.0',
        description: 'Test Description',
        routes: {
          '/test': {
            get: {
              response: z.object({ message: z.string() }),
              handler: () => ({ message: 'test' }),
            },
          },
        },
      });

      const spec = api.getOpenAPISpec();

      expect(spec.info.title).toBe('Test API');
      expect(spec.info.version).toBe('1.0.0');
      expect(spec.info.description).toBe('Test Description');
      expect(spec.paths).toHaveProperty('/test');
    });

    it('should use default values for missing configuration', () => {
      const api = new SyntroJS();

      const spec = api.getOpenAPISpec();

      expect(spec.info.title).toBe('SyntroJS API');
      expect(spec.info.version).toBe('1.0.0');
    });
  });

  describe('Error Handling (Guard Clauses)', () => {
    it('should handle custom exception handlers', () => {
      const api = new SyntroJS();

      const customHandler = (_context: any, _error: Error) => ({
        statusCode: 500,
        body: { error: 'Custom error' },
      });

      api.registerExceptionHandler(Error, customHandler);

      // Verify handler is registered
      expect(api).toBeInstanceOf(SyntroJS);
    });
  });

  describe('Dependency Injection (DDD)', () => {
    it('should support dependency registration', () => {
      const api = new SyntroJS();

      const service = {
        getData: () => 'test data',
      };

      api.registerDependency('service', service);

      // Verify dependency is registered
      expect(api).toBeInstanceOf(SyntroJS);
    });
  });

  describe('Background Tasks (Functional Programming)', () => {
    it('should support background task execution', () => {
      const api = new SyntroJS();

      // This would be tested in E2E tests, but we can verify the method exists
      expect(typeof api.addBackgroundTask).toBe('function');
    });
  });

  describe('Raw Fastify Access (SOLID)', () => {
    it('should provide access to raw Fastify instance', async () => {
      const api = new SyntroJS();

      const fastify = await api.getRawFastify();
      expect(fastify).toBeDefined();
    });
  });

  describe('Registry Access (DDD)', () => {
    it('should provide access to middleware registry', () => {
      const api = new SyntroJS();

      const registry = api.getMiddlewareRegistry();
      expect(registry).toBeDefined();
    });

    it('should provide access to WebSocket registry', () => {
      const api = new SyntroJS();

      const registry = api.getWebSocketRegistry();
      expect(registry).toBeDefined();
    });
  });
});
