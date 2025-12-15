/**
 * Regression Tests for CORS OPTIONS Bug
 *
 * These tests ensure that the CORS OPTIONS bug does not reappear.
 * The bug occurs when CORS plugin is registered BEFORE routes, causing
 * OPTIONS requests to return 404.
 *
 * Principles:
 * - Regression Prevention: Tests that catch the bug early
 * - Functional: Tests verify behavior, not implementation
 * - Guard Clauses: Early validation in test setup
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { RouteRegistry } from '../../../src/application/RouteRegistry';
import { SyntroJS } from '../../../src/core/SyntroJS';

describe('CORS OPTIONS Regression Prevention', () => {
  beforeEach(() => {
    RouteRegistry.clear();
  });

  describe('OPTIONS Preflight Requests', () => {
    it('should handle OPTIONS for POST routes', async () => {
      const app = new SyntroJS({
        fluentConfig: {
          cors: {
            origin: true,
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'x-user-id', 'Authorization'],
          },
        },
      });

      // Register POST route
      app.post('/orders', {
        handler: () => ({ message: 'Order created' }),
      });

      const server = await app.listen(0);
      const port = new URL(server).port;

      // OPTIONS preflight request
      const response = await fetch(`http://localhost:${port}/orders`, {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://localhost:3000',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'content-type,x-user-id',
        },
      });

      // CRITICAL: OPTIONS must return 204, not 404
      expect(response.status).toBe(204);
      expect(response.headers.get('access-control-allow-origin')).toBeTruthy();
      expect(response.headers.get('access-control-allow-methods')).toContain('POST');
      expect(response.headers.get('access-control-allow-headers')).toBeTruthy();

      await app.close();
    });

    it('should handle OPTIONS for GET routes', async () => {
      const app = new SyntroJS({
        fluentConfig: {
          cors: true,
        },
      });

      app.get('/users', {
        handler: () => ({ users: [] }),
      });

      const server = await app.listen(0);
      const port = new URL(server).port;

      const response = await fetch(`http://localhost:${port}/users`, {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://localhost:3000',
          'Access-Control-Request-Method': 'GET',
        },
      });

      // CRITICAL: Must not return 404
      expect(response.status).not.toBe(404);
      expect(response.status).toBe(204);
      expect(response.headers.get('access-control-allow-origin')).toBeTruthy();

      await app.close();
    });

    it('should handle OPTIONS for PUT routes', async () => {
      const app = new SyntroJS({
        fluentConfig: {
          cors: {
            origin: '*',
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
          },
        },
      });

      app.put('/users/:id', {
        handler: () => ({ message: 'User updated' }),
      });

      const server = await app.listen(0);
      const port = new URL(server).port;

      const response = await fetch(`http://localhost:${port}/users/123`, {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://localhost:3000',
          'Access-Control-Request-Method': 'PUT',
        },
      });

      expect(response.status).toBe(204);
      expect(response.headers.get('access-control-allow-methods')).toContain('PUT');

      await app.close();
    });

    it('should handle OPTIONS for DELETE routes', async () => {
      const app = new SyntroJS({
        fluentConfig: {
          cors: true,
        },
      });

      app.delete('/users/:id', {
        handler: () => ({ message: 'User deleted' }),
      });

      const server = await app.listen(0);
      const port = new URL(server).port;

      const response = await fetch(`http://localhost:${port}/users/123`, {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://localhost:3000',
          'Access-Control-Request-Method': 'DELETE',
        },
      });

      expect(response.status).toBe(204);
      expect(response.headers.get('access-control-allow-methods')).toContain('DELETE');

      await app.close();
    });
  });

  describe('CORS Headers in Actual Requests', () => {
    it('should include CORS headers in POST responses', async () => {
      const app = new SyntroJS({
        fluentConfig: {
          cors: {
            origin: true,
            credentials: true,
          },
        },
      });

      app.post('/orders', {
        handler: () => ({ message: 'Order created' }),
      });

      const server = await app.listen(0);
      const port = new URL(server).port;

      const response = await fetch(`http://localhost:${port}/orders`, {
        method: 'POST',
        headers: {
          Origin: 'http://localhost:3000',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ item: 'test' }),
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('access-control-allow-origin')).toBeTruthy();
      expect(response.headers.get('access-control-allow-credentials')).toBe('true');

      await app.close();
    });
  });

  describe('Multiple Routes with CORS', () => {
    it('should handle OPTIONS for all registered routes', async () => {
      const app = new SyntroJS({
        fluentConfig: {
          cors: true,
        },
      });

      // Register multiple routes
      app.get('/users', { handler: () => ({}) });
      app.post('/users', { handler: () => ({}) });
      app.put('/users/:id', { handler: () => ({}) });
      app.delete('/users/:id', { handler: () => ({}) });

      const server = await app.listen(0);
      const port = new URL(server).port;

      // Test OPTIONS for each route
      const methods = ['GET', 'POST', 'PUT', 'DELETE'];
      for (const method of methods) {
        const path = method === 'GET' || method === 'POST' ? '/users' : '/users/123';
        const response = await fetch(`http://localhost:${port}${path}`, {
          method: 'OPTIONS',
          headers: {
            Origin: 'http://localhost:3000',
            'Access-Control-Request-Method': method,
          },
        });

        expect(response.status).toBe(204);
        expect(response.headers.get('access-control-allow-methods')).toContain(method);
      }

      await app.close();
    });
  });
});
