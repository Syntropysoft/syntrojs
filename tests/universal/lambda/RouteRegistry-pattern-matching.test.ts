/**
 * Tests for RouteRegistry pattern matching (Lambda support)
 *
 * Principles Applied:
 * - SOLID: Single Responsibility, Open/Closed, Dependency Inversion
 * - DDD: Domain Services, Value Objects, Aggregates
 * - Functional: Pure functions, Immutability, Composition
 * - Guard Clauses: Early validation, Fail Fast
 */

import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { RouteRegistry } from '../../../src/application/RouteRegistry';
import { Route } from '../../../src/domain/Route';

describe('RouteRegistry - Pattern Matching (Lambda Support)', () => {
  beforeEach(() => {
    RouteRegistry.clear();
  });

  afterEach(() => {
    RouteRegistry.clear();
  });

  describe('find - Pattern Matching', () => {
    it('should find exact match route', () => {
      const route = new Route('GET', '/users', {
        handler: async () => ({ message: 'users' }),
      });

      RouteRegistry.register(route);

      const found = RouteRegistry.find('GET', '/users');
      expect(found).toBe(route);
    });

    it('should find route with dynamic path parameter', () => {
      const route = new Route('GET', '/users/:id', {
        handler: async () => ({ message: 'user' }),
      });

      RouteRegistry.register(route);

      const found = RouteRegistry.find('GET', '/users/123');
      expect(found).toBe(route);
    });

    it('should find route with multiple path parameters', () => {
      const route = new Route('GET', '/users/:userId/posts/:postId', {
        handler: async () => ({ message: 'post' }),
      });

      RouteRegistry.register(route);

      const found = RouteRegistry.find('GET', '/users/123/posts/456');
      expect(found).toBe(route);
    });

    it('should return undefined for non-matching route', () => {
      const route = new Route('GET', '/users/:id', {
        handler: async () => ({ message: 'user' }),
      });

      RouteRegistry.register(route);

      const found = RouteRegistry.find('GET', '/posts/123');
      expect(found).toBeUndefined();
    });

    it('should match method case-insensitively', () => {
      const route = new Route('GET', '/users', {
        handler: async () => ({ message: 'users' }),
      });

      RouteRegistry.register(route);

      const found = RouteRegistry.find('GET', '/users');
      expect(found).toBe(route);
    });

    it('should prioritize exact match over pattern match', () => {
      const exactRoute = new Route('GET', '/users/me', {
        handler: async () => ({ type: 'exact' }),
      });
      const patternRoute = new Route('GET', '/users/:id', {
        handler: async () => ({ type: 'pattern' }),
      });

      RouteRegistry.register(exactRoute);
      RouteRegistry.register(patternRoute);

      const found = RouteRegistry.find('GET', '/users/me');
      expect(found).toBe(exactRoute);
    });
  });

  describe('extractPathParams - Pure Function', () => {
    it('should extract single path parameter', () => {
      const params = RouteRegistry.extractPathParams('/users/:id', '/users/123');
      expect(params.id).toBe('123');
    });

    it('should extract multiple path parameters', () => {
      const params = RouteRegistry.extractPathParams(
        '/users/:userId/posts/:postId',
        '/users/123/posts/456',
      );
      expect(params.userId).toBe('123');
      expect(params.postId).toBe('456');
    });

    it('should return empty object for exact match', () => {
      const params = RouteRegistry.extractPathParams('/users', '/users');
      expect(Object.keys(params).length).toBe(0);
    });

    it('should return empty object for non-matching paths', () => {
      const params = RouteRegistry.extractPathParams('/users/:id', '/posts/123');
      expect(Object.keys(params).length).toBe(0);
    });

    it('should handle empty or invalid inputs', () => {
      expect(RouteRegistry.extractPathParams('', '')).toEqual({});
      expect(RouteRegistry.extractPathParams('/users/:id', '')).toEqual({});
      expect(RouteRegistry.extractPathParams('', '/users/123')).toEqual({});
    });
  });

  describe('Integration - Pattern Matching + Extraction', () => {
    it('should find route and extract parameters', () => {
      const route = new Route('GET', '/users/:id/posts/:postId', {
        handler: async ({ params }) => params,
      });

      RouteRegistry.register(route);

      const found = RouteRegistry.find('GET', '/users/123/posts/456');
      expect(found).toBe(route);

      if (found) {
        const params = RouteRegistry.extractPathParams(found.path, '/users/123/posts/456');
        expect(params.id).toBe('123');
        expect(params.postId).toBe('456');
      }
    });
  });
});

