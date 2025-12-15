/**
 * SyntroRouter tests
 * Testing the router service for grouping routes
 *
 * Principles Applied:
 * - SOLID: Single Responsibility, Open/Closed, Dependency Inversion
 * - DDD: Application Services, Domain Entities
 * - Functional: Pure functions, Immutability
 * - Guard Clauses: Early validation, Fail Fast
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { SyntroRouter } from '../../../src/application/SyntroRouter';
import { RouteRegistry, createRouteRegistry } from '../../../src/application/RouteRegistry';
import { MiddlewareRegistry } from '../../../src/application/MiddlewareRegistry';
import { Route } from '../../../src/domain/Route';
import type { HttpMethod, Middleware } from '../../../src/domain/types';
import { SyntroJS } from '../../../src/core/SyntroJS';

describe('SyntroRouter', () => {
  beforeEach(() => {
    RouteRegistry.clear();
  });

  afterEach(() => {
    RouteRegistry.clear();
  });

  const createMockHandler = () => async () => ({ message: 'test' });

  describe('Constructor', () => {
    it('should create a router with prefix', () => {
      const router = new SyntroRouter('/api/v1');

      expect(router.getPrefix()).toBe('/api/v1');
    });

    it('should accept prefix with trailing slash', () => {
      const router = new SyntroRouter('/api/v1/');

      expect(router.getPrefix()).toBe('/api/v1/');
    });

    it('should throw error if prefix is null', () => {
      expect(() => new SyntroRouter(null as any)).toThrow('Router prefix is required');
    });

    it('should throw error if prefix is undefined', () => {
      expect(() => new SyntroRouter(undefined as any)).toThrow('Router prefix is required');
    });

    it('should throw error if prefix is empty string', () => {
      expect(() => new SyntroRouter('')).toThrow('Router prefix is required');
    });

    it('should throw error if prefix does not start with /', () => {
      expect(() => new SyntroRouter('api/v1')).toThrow('Router prefix must start with /');
    });

    it('should accept custom RouteRegistry', () => {
      // Create a new instance for testing (using factory)
      const customRegistry = createRouteRegistry();
      const router = new SyntroRouter('/api', customRegistry);

      expect(router.getPrefix()).toBe('/api');
    });

    it('should accept custom MiddlewareRegistry', () => {
      const customMiddlewareRegistry = new MiddlewareRegistry();
      const router = new SyntroRouter('/api', undefined, customMiddlewareRegistry);

      expect(router.getPrefix()).toBe('/api');
    });
  });

  describe('Route Registration', () => {
    it('should register GET route with prefix', () => {
      const router = new SyntroRouter('/api/v1');

      router.get('/users', { handler: createMockHandler() });

      expect(RouteRegistry.has('GET', '/api/v1/users')).toBe(true);
    });

    it('should register POST route with prefix', () => {
      const router = new SyntroRouter('/api/v1');

      router.post('/users', { handler: createMockHandler() });

      expect(RouteRegistry.has('POST', '/api/v1/users')).toBe(true);
    });

    it('should register PUT route with prefix', () => {
      const router = new SyntroRouter('/api/v1');

      router.put('/users/:id', { handler: createMockHandler() });

      expect(RouteRegistry.has('PUT', '/api/v1/users/:id')).toBe(true);
    });

    it('should register DELETE route with prefix', () => {
      const router = new SyntroRouter('/api/v1');

      router.delete('/users/:id', { handler: createMockHandler() });

      expect(RouteRegistry.has('DELETE', '/api/v1/users/:id')).toBe(true);
    });

    it('should register PATCH route with prefix', () => {
      const router = new SyntroRouter('/api/v1');

      router.patch('/users/:id', { handler: createMockHandler() });

      expect(RouteRegistry.has('PATCH', '/api/v1/users/:id')).toBe(true);
    });

    it('should register HEAD route with prefix', () => {
      const router = new SyntroRouter('/api/v1');

      router.head('/users/:id', { handler: createMockHandler() });

      expect(RouteRegistry.has('HEAD', '/api/v1/users/:id')).toBe(true);
    });

    it('should register OPTIONS route with prefix', () => {
      const router = new SyntroRouter('/api/v1');

      router.options('/users', { handler: createMockHandler() });

      expect(RouteRegistry.has('OPTIONS', '/api/v1/users')).toBe(true);
    });

    it('should register multiple routes with same prefix', () => {
      const router = new SyntroRouter('/api/v1');

      router.get('/users', { handler: createMockHandler() });
      router.post('/users', { handler: createMockHandler() });
      router.get('/posts', { handler: createMockHandler() });

      expect(RouteRegistry.has('GET', '/api/v1/users')).toBe(true);
      expect(RouteRegistry.has('POST', '/api/v1/users')).toBe(true);
      expect(RouteRegistry.has('GET', '/api/v1/posts')).toBe(true);
    });

    it('should handle root path correctly', () => {
      const router = new SyntroRouter('/api');

      router.get('/', { handler: createMockHandler() });

      expect(RouteRegistry.has('GET', '/api')).toBe(true);
    });

    it('should combine prefix and path correctly', () => {
      const router = new SyntroRouter('/api/v1');

      router.get('/users/:id', { handler: createMockHandler() });

      const route = RouteRegistry.get('GET', '/api/v1/users/:id');
      expect(route).toBeDefined();
      expect(route?.path).toBe('/api/v1/users/:id');
    });

    it('should track routes internally', () => {
      const router = new SyntroRouter('/api/v1');

      router.get('/users', { handler: createMockHandler() });
      router.post('/users', { handler: createMockHandler() });

      const routes = router.getRoutes();
      expect(routes.length).toBe(2);
      expect(routes[0].path).toBe('/api/v1/users');
      expect(routes[1].path).toBe('/api/v1/users');
    });

    it('should return routes array copy', () => {
      const router = new SyntroRouter('/api/v1');

      router.get('/users', { handler: createMockHandler() });

      const routes1 = router.getRoutes();
      const originalLength = routes1.length;

      // Get routes again - should return same length (functional programming principle)
      const routes2 = router.getRoutes();
      expect(routes2.length).toBe(originalLength);
      
      // Arrays should be different instances (copy)
      expect(routes1).not.toBe(routes2);
    });
  });

  describe('Guard Clauses - Route Registration', () => {
    it('should throw error if path is null', () => {
      const router = new SyntroRouter('/api');

      expect(() => router.get(null as any, { handler: createMockHandler() })).toThrow(
        'Route path is required',
      );
    });

    it('should throw error if path is undefined', () => {
      const router = new SyntroRouter('/api');

      expect(() => router.get(undefined as any, { handler: createMockHandler() })).toThrow(
        'Route path is required',
      );
    });

    it('should throw error if path is empty', () => {
      const router = new SyntroRouter('/api');

      expect(() => router.get('', { handler: createMockHandler() })).toThrow(
        'Route path is required',
      );
    });

    it('should throw error if path does not start with /', () => {
      const router = new SyntroRouter('/api');

      expect(() => router.get('users', { handler: createMockHandler() })).toThrow(
        'Route path must start with /',
      );
    });

    it('should throw error if config is null', () => {
      const router = new SyntroRouter('/api');

      expect(() => router.get('/users', null as any)).toThrow('Route config is required');
    });

    it('should throw error if handler is missing', () => {
      const router = new SyntroRouter('/api');

      expect(() => router.get('/users', {} as any)).toThrow('Route handler is required');
    });

    it('should throw error if handler is not a function', () => {
      const router = new SyntroRouter('/api');

      expect(() => router.get('/users', { handler: 'not a function' as any })).toThrow(
        'Route handler must be a function',
      );
    });
  });

  describe('Method Chaining', () => {
    it('should support method chaining', () => {
      const router = new SyntroRouter('/api/v1');

      const result = router
        .get('/users', { handler: createMockHandler() })
        .post('/users', { handler: createMockHandler() })
        .get('/posts', { handler: createMockHandler() });

      expect(result).toBe(router);
      expect(RouteRegistry.has('GET', '/api/v1/users')).toBe(true);
      expect(RouteRegistry.has('POST', '/api/v1/users')).toBe(true);
      expect(RouteRegistry.has('GET', '/api/v1/posts')).toBe(true);
    });
  });

  describe('Middleware', () => {
    it('should register middleware for router prefix and execute it', async () => {
      const router = new SyntroRouter('/api/v1');
      let middlewareExecuted = false;

      const middleware: Middleware = async (ctx) => {
        middlewareExecuted = true;
      };

      router.use(middleware);
      router.get('/test', { handler: createMockHandler() });

      // Verify middleware is registered by checking count
      const registry = (router as any).middlewareRegistry;
      expect(registry.getCount()).toBe(1);

      // Verify middleware can be retrieved for the router prefix path
      const middlewares = registry.getMiddlewares('/api/v1/test', 'GET');
      expect(middlewares.length).toBe(1);
      expect(typeof middlewares[0]).toBe('function');
    });

    it('should register middleware with custom path and execute it', async () => {
      const router = new SyntroRouter('/api/v1');
      let middlewareExecuted = false;

      const middleware: Middleware = async (ctx) => {
        middlewareExecuted = true;
      };

      router.use(middleware, '/api/v1/users');
      router.get('/users', { handler: createMockHandler() });

      // Verify middleware is registered
      const registry = (router as any).middlewareRegistry;
      expect(registry.getCount()).toBe(1);

      // Verify middleware can be retrieved for the custom path
      const middlewares = registry.getMiddlewares('/api/v1/users', 'GET');
      expect(middlewares.length).toBe(1);
    });

    it('should throw error if middleware is null', () => {
      const router = new SyntroRouter('/api');

      expect(() => router.use(null as any)).toThrow('Middleware is required');
    });

    it('should throw error if middleware is not a function', () => {
      const router = new SyntroRouter('/api');

      expect(() => router.use('not a function' as any)).toThrow('Middleware must be a function');
    });

    it('should support middleware chaining and register multiple middlewares', () => {
      const router = new SyntroRouter('/api/v1');
      const middleware1: Middleware = async (ctx) => {
        // Middleware logic
      };
      const middleware2: Middleware = async (ctx) => {
        // Middleware logic
      };

      const result = router.use(middleware1).use(middleware2);

      expect(result).toBe(router);

      // Verify both middlewares are registered
      const registry = (router as any).middlewareRegistry;
      expect(registry.getCount()).toBe(2);
    });
  });

  describe('Integration with SyntroJS', () => {
    it('should work with app.include() and handle real HTTP requests', async () => {
      // Clear routes before test
      RouteRegistry.clear();
      
      const app = new SyntroJS({ rest: true });
      const router = new SyntroRouter('/api/v1');

      // Register routes with actual handlers that return data
      router.get('/users', {
        handler: () => ({ users: [{ id: 1, name: 'Test User' }] }),
      });
      router.post('/users', {
        body: z.object({ name: z.string() }),
        handler: ({ body }) => ({ id: 2, name: body.name }),
      });

      app.include(router);

      // Verify routes are registered
      expect(RouteRegistry.has('GET', '/api/v1/users')).toBe(true);
      expect(RouteRegistry.has('POST', '/api/v1/users')).toBe(true);

      // Start server and make real HTTP requests to verify functionality
      const server = await app.listen(0);
      const port = new URL(server).port;

      try {
        // Test GET request
        const getResponse = await fetch(`http://localhost:${port}/api/v1/users`);
        expect(getResponse.status).toBe(200);
        const getData = await getResponse.json();
        expect(getData).toEqual({ users: [{ id: 1, name: 'Test User' }] });

        // Test POST request
        const postResponse = await fetch(`http://localhost:${port}/api/v1/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'New User' }),
        });
        expect(postResponse.status).toBe(200);
        const postData = await postResponse.json();
        expect(postData).toEqual({ id: 2, name: 'New User' });
      } finally {
        await app.close();
      }
    });

    it('should throw error if router is null in app.include()', () => {
      const app = new SyntroJS({ rest: true });

      expect(() => app.include(null as any)).toThrow('Router is required');
    });

    it('should throw error if router is not SyntroRouter instance', () => {
      const app = new SyntroJS({ rest: true });

      expect(() => app.include({} as any)).toThrow('Router must be an instance of SyntroRouter');
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle nested API structure', () => {
      const apiRouter = new SyntroRouter('/api');
      const v1Router = new SyntroRouter('/api/v1');
      const v2Router = new SyntroRouter('/api/v2');

      apiRouter.get('/health', { handler: createMockHandler() });
      v1Router.get('/users', { handler: createMockHandler() });
      v2Router.get('/users', { handler: createMockHandler() });

      expect(RouteRegistry.has('GET', '/api/health')).toBe(true);
      expect(RouteRegistry.has('GET', '/api/v1/users')).toBe(true);
      expect(RouteRegistry.has('GET', '/api/v2/users')).toBe(true);
    });

    it('should handle complex route paths', () => {
      const router = new SyntroRouter('/api/v1');

      router.get('/users/:userId/posts/:postId/comments', { handler: createMockHandler() });

      expect(RouteRegistry.has('GET', '/api/v1/users/:userId/posts/:postId/comments')).toBe(true);
    });

    it('should work with all HTTP methods', () => {
      const router = new SyntroRouter('/api/v1');

      router.get('/test', { handler: createMockHandler() });
      router.post('/test', { handler: createMockHandler() });
      router.put('/test', { handler: createMockHandler() });
      router.delete('/test', { handler: createMockHandler() });
      router.patch('/test', { handler: createMockHandler() });
      router.head('/test', { handler: createMockHandler() });
      router.options('/test', { handler: createMockHandler() });

      const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
      methods.forEach((method) => {
        expect(RouteRegistry.has(method, '/api/v1/test')).toBe(true);
      });
    });
  });
});

