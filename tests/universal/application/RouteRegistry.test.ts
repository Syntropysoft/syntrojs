/**
 * RouteRegistry tests
 * Testing the route registration service
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { createRouteRegistry } from '../../../src/application/RouteRegistry';
import { Route } from '../../../src/domain/Route';
import type { HttpMethod } from '../../../src/domain/types';

describe('RouteRegistry', () => {
  // Usar factory para cada test (aislamiento)
  let registry: ReturnType<typeof createRouteRegistry>;

  beforeEach(() => {
    registry = createRouteRegistry();
  });

  const createMockRoute = (method: HttpMethod = 'GET', path = '/test') => {
    return new Route(method, path, {
      handler: async () => ({ message: 'test' }),
    });
  };

  describe('register', () => {
    it('should register a new route', () => {
      const route = createMockRoute();

      registry.register(route);

      expect(registry.has('GET', '/test')).toBe(true);
      expect(registry.count()).toBe(1);
    });

    it('should register multiple routes with different paths', () => {
      const route1 = createMockRoute('GET', '/users');
      const route2 = createMockRoute('GET', '/posts');

      registry.register(route1);
      registry.register(route2);

      expect(registry.count()).toBe(2);
      expect(registry.has('GET', '/users')).toBe(true);
      expect(registry.has('GET', '/posts')).toBe(true);
    });

    it('should register multiple routes with different methods on same path', () => {
      const getRoute = createMockRoute('GET', '/users');
      const postRoute = createMockRoute('POST', '/users');

      registry.register(getRoute);
      registry.register(postRoute);

      expect(registry.count()).toBe(2);
      expect(registry.has('GET', '/users')).toBe(true);
      expect(registry.has('POST', '/users')).toBe(true);
    });

    it('should throw error if route is null', () => {
      expect(() => registry.register(null as any)).toThrow('Route is required');
    });

    it('should throw error if route is undefined', () => {
      expect(() => registry.register(undefined as any)).toThrow('Route is required');
    });

    it('should throw error if route already exists', () => {
      const route = createMockRoute();

      registry.register(route);

      expect(() => registry.register(route)).toThrow('Route GET:/test is already registered');
    });
  });

  describe('get', () => {
    it('should retrieve a registered route', () => {
      const route = createMockRoute('GET', '/users');
      registry.register(route);

      const retrieved = registry.get('GET', '/users');

      expect(retrieved).toBe(route);
    });

    it('should return undefined for non-existent route', () => {
      const retrieved = registry.get('GET', '/nonexistent');

      expect(retrieved).toBeUndefined();
    });

    it('should throw error if method is empty', () => {
      expect(() => registry.get('' as HttpMethod, '/test')).toThrow('Method is required');
    });

    it('should throw error if path is empty', () => {
      expect(() => registry.get('GET', '')).toThrow('Path is required');
    });

    it('should distinguish between different methods on same path', () => {
      const getRoute = createMockRoute('GET', '/users');
      const postRoute = createMockRoute('POST', '/users');

      registry.register(getRoute);
      registry.register(postRoute);

      expect(registry.get('GET', '/users')).toBe(getRoute);
      expect(registry.get('POST', '/users')).toBe(postRoute);
    });
  });

  describe('has', () => {
    it('should return true for existing route', () => {
      const route = createMockRoute();
      registry.register(route);

      expect(registry.has('GET', '/test')).toBe(true);
    });

    it('should return false for non-existing route', () => {
      expect(registry.has('GET', '/nonexistent')).toBe(false);
    });

    it('should throw error if method is empty', () => {
      expect(() => registry.has('' as HttpMethod, '/test')).toThrow('Method is required');
    });

    it('should throw error if path is empty', () => {
      expect(() => registry.has('GET', '')).toThrow('Path is required');
    });
  });

  describe('getAll', () => {
    it('should return empty array when no routes registered', () => {
      const routes = registry.getAll();

      expect(routes).toEqual([]);
    });

    it('should return all registered routes', () => {
      const route1 = createMockRoute('GET', '/users');
      const route2 = createMockRoute('POST', '/posts');
      const route3 = createMockRoute('PUT', '/comments');

      registry.register(route1);
      registry.register(route2);
      registry.register(route3);

      const routes = registry.getAll();

      expect(routes).toHaveLength(3);
      expect(routes).toContain(route1);
      expect(routes).toContain(route2);
      expect(routes).toContain(route3);
    });

    it('should return immutable array (modifications should not affect registry)', () => {
      const route = createMockRoute();
      registry.register(route);

      const routes = registry.getAll();

      // Try to modify returned array
      (routes as any).push(createMockRoute('POST', '/fake'));

      // Registry should not change
      expect(registry.count()).toBe(1);
    });
  });

  describe('getByMethod', () => {
    it('should return routes matching specific method', () => {
      const getRoute1 = createMockRoute('GET', '/users');
      const getRoute2 = createMockRoute('GET', '/posts');
      const postRoute = createMockRoute('POST', '/comments');

      registry.register(getRoute1);
      registry.register(getRoute2);
      registry.register(postRoute);

      const getRoutes = registry.getByMethod('GET');

      expect(getRoutes).toHaveLength(2);
      expect(getRoutes).toContain(getRoute1);
      expect(getRoutes).toContain(getRoute2);
      expect(getRoutes).not.toContain(postRoute);
    });

    it('should return empty array if no routes match method', () => {
      const route = createMockRoute('GET', '/test');
      registry.register(route);

      const routes = registry.getByMethod('POST');

      expect(routes).toEqual([]);
    });

    it('should throw error if method is empty', () => {
      expect(() => registry.getByMethod('' as HttpMethod)).toThrow('Method is required');
    });
  });

  describe('getByTag', () => {
    it('should return routes with specific tag', () => {
      const route1 = new Route('GET', '/users', {
        tags: ['users', 'public'],
        handler: async () => ({}),
      });
      const route2 = new Route('GET', '/posts', {
        tags: ['posts', 'public'],
        handler: async () => ({}),
      });
      const route3 = new Route('GET', '/admin', {
        tags: ['admin'],
        handler: async () => ({}),
      });

      registry.register(route1);
      registry.register(route2);
      registry.register(route3);

      const publicRoutes = registry.getByTag('public');

      expect(publicRoutes).toHaveLength(2);
      expect(publicRoutes).toContain(route1);
      expect(publicRoutes).toContain(route2);
      expect(publicRoutes).not.toContain(route3);
    });

    it('should return empty array if no routes have the tag', () => {
      const route = createMockRoute();
      registry.register(route);

      const routes = registry.getByTag('nonexistent');

      expect(routes).toEqual([]);
    });

    it('should throw error if tag is empty', () => {
      expect(() => registry.getByTag('')).toThrow('Tag is required');
    });
  });

  describe('count', () => {
    it('should return 0 for empty registry', () => {
      expect(registry.count()).toBe(0);
    });

    it('should return correct count after registering routes', () => {
      registry.register(createMockRoute('GET', '/1'));
      expect(registry.count()).toBe(1);

      registry.register(createMockRoute('POST', '/2'));
      expect(registry.count()).toBe(2);

      registry.register(createMockRoute('PUT', '/3'));
      expect(registry.count()).toBe(3);
    });

    it('should not increment count when registering duplicate fails', () => {
      const route = createMockRoute();
      registry.register(route);

      expect(registry.count()).toBe(1);

      try {
        registry.register(route);
      } catch {
        // Expected to fail
      }

      expect(registry.count()).toBe(1);
    });
  });

  describe('clear', () => {
    it('should remove all routes', () => {
      registry.register(createMockRoute('GET', '/1'));
      registry.register(createMockRoute('POST', '/2'));
      registry.register(createMockRoute('PUT', '/3'));

      expect(registry.count()).toBe(3);

      registry.clear();

      expect(registry.count()).toBe(0);
      expect(registry.getAll()).toEqual([]);
    });

    it('should allow registering routes after clear', () => {
      registry.register(createMockRoute());
      registry.clear();

      const newRoute = createMockRoute('POST', '/new');
      registry.register(newRoute);

      expect(registry.count()).toBe(1);
      expect(registry.has('POST', '/new')).toBe(true);
    });
  });

  describe('delete', () => {
    it('should delete existing route', () => {
      const route = createMockRoute();
      registry.register(route);

      const deleted = registry.delete('GET', '/test');

      expect(deleted).toBe(true);
      expect(registry.has('GET', '/test')).toBe(false);
      expect(registry.count()).toBe(0);
    });

    it('should return false when deleting non-existent route', () => {
      const deleted = registry.delete('GET', '/nonexistent');

      expect(deleted).toBe(false);
    });

    it('should throw error if method is empty', () => {
      expect(() => registry.delete('' as HttpMethod, '/test')).toThrow('Method is required');
    });

    it('should throw error if path is empty', () => {
      expect(() => registry.delete('GET', '')).toThrow('Path is required');
    });

    it('should only delete specific route, not affect others', () => {
      registry.register(createMockRoute('GET', '/users'));
      registry.register(createMockRoute('POST', '/users'));
      registry.register(createMockRoute('GET', '/posts'));

      registry.delete('GET', '/users');

      expect(registry.count()).toBe(2);
      expect(registry.has('GET', '/users')).toBe(false);
      expect(registry.has('POST', '/users')).toBe(true);
      expect(registry.has('GET', '/posts')).toBe(true);
    });
  });

  describe('Boundary conditions', () => {
    it('should handle many routes efficiently', () => {
      // Register 1000 routes
      for (let i = 0; i < 1000; i++) {
        registry.register(createMockRoute('GET', `/route-${i}`));
      }

      expect(registry.count()).toBe(1000);
      expect(registry.has('GET', '/route-500')).toBe(true);
      expect(registry.getByMethod('GET')).toHaveLength(1000);
    });

    it('should handle routes with complex paths', () => {
      const route = createMockRoute('GET', '/api/v1/users/:userId/posts/:postId/comments');
      registry.register(route);

      expect(registry.has('GET', '/api/v1/users/:userId/posts/:postId/comments')).toBe(true);
    });
  });
});
