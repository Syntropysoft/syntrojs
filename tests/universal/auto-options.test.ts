/**
 * Auto-OPTIONS Generator Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SyntroJS } from '../../src/core/SyntroJS';
import { RouteRegistry } from '../../src/application/RouteRegistry';
import {
  getAllowedMethods,
  generateOptionsHeaders,
  generateOptionsResponse,
} from '../../src/application/AutoOptionsGenerator';
import { z } from 'zod';

describe('Auto-OPTIONS Generator', () => {
  let app: SyntroJS;

  beforeEach(() => {
    app = new SyntroJS({ title: 'Test API' });
  });

  afterEach(() => {
    // Clear routes between tests since RouteRegistry is a singleton
    RouteRegistry.clear();
  });

  describe('getAllowedMethods', () => {
    it('should return allowed methods for a path with multiple routes', () => {
      app.get('/users', { handler: () => ({ users: [] }) });
      app.post('/users', { handler: ({ body }) => ({ created: true }) });
      app.delete('/users', { handler: () => ({ deleted: true }) });

      const methods = getAllowedMethods(RouteRegistry, '/users');

      expect(methods).toContain('GET');
      expect(methods).toContain('POST');
      expect(methods).toContain('DELETE');
      expect(methods).toContain('OPTIONS');
    });

    it('should handle path parameters correctly', () => {
      app.get('/users/:id', {
        params: z.object({ id: z.string() }),
        handler: ({ params }) => ({ id: params.id }),
      });
      app.put('/users/:id', {
        params: z.object({ id: z.string() }),
        handler: ({ params }) => ({ updated: true }),
      });

      const methods = getAllowedMethods(RouteRegistry, '/users/123');

      expect(methods).toContain('GET');
      expect(methods).toContain('PUT');
      expect(methods).toContain('OPTIONS');
    });

    it('should return empty array for non-existent path', () => {
      app.get('/users', { handler: () => ({ users: [] }) });

      const methods = getAllowedMethods(RouteRegistry, '/posts');

      expect(methods).toEqual([]);
    });

    it('should include HEAD and OPTIONS methods', () => {
      app.get('/resource', { handler: () => ({ data: 'test' }) });
      app.head('/resource', { handler: () => ({ exists: true }) });
      app.options('/resource', { handler: () => ({ allow: ['GET', 'HEAD', 'OPTIONS'] }) });

      const methods = getAllowedMethods(RouteRegistry, '/resource');

      expect(methods).toContain('GET');
      expect(methods).toContain('HEAD');
      expect(methods).toContain('OPTIONS');
    });

    it('should return sorted methods', () => {
      app.delete('/users', { handler: () => ({ deleted: true }) });
      app.post('/users', { handler: ({ body }) => ({ created: true }) });
      app.get('/users', { handler: () => ({ users: [] }) });
      app.put('/users', { handler: ({ body }) => ({ updated: true }) });

      const methods = getAllowedMethods(RouteRegistry, '/users');

      // Should be alphabetically sorted
      const expected = ['DELETE', 'GET', 'OPTIONS', 'POST', 'PUT'];
      expect(methods).toEqual(expected);
    });
  });

  describe('generateOptionsHeaders', () => {
    it('should generate basic Allow header', () => {
      const headers = generateOptionsHeaders(['GET', 'POST', 'OPTIONS']);

      expect(headers.Allow).toBe('GET, POST, OPTIONS');
    });

    it('should include CORS headers by default', () => {
      const headers = generateOptionsHeaders(['GET', 'POST']);

      expect(headers['Access-Control-Allow-Origin']).toBe('*');
      expect(headers['Access-Control-Allow-Methods']).toBe('GET, POST');
      expect(headers['Access-Control-Allow-Headers']).toBe(
        'Content-Type, Authorization, X-Requested-With',
      );
      expect(headers['Access-Control-Max-Age']).toBe('86400');
    });

    it('should allow custom origin', () => {
      const headers = generateOptionsHeaders(['GET'], { origin: 'https://example.com' });

      expect(headers['Access-Control-Allow-Origin']).toBe('https://example.com');
      expect(headers['Access-Control-Allow-Credentials']).toBe('true');
    });

    it('should allow custom max age', () => {
      const headers = generateOptionsHeaders(['GET'], { maxAge: 3600 });

      expect(headers['Access-Control-Max-Age']).toBe('3600');
    });

    it('should include additional headers', () => {
      const headers = generateOptionsHeaders(['GET'], {
        additionalHeaders: {
          'X-Custom-Header': 'value',
          'X-Another-Header': 'another-value',
        },
      });

      expect(headers['X-Custom-Header']).toBe('value');
      expect(headers['X-Another-Header']).toBe('another-value');
    });

    it('should skip CORS headers when includeCorsHeaders is false', () => {
      const headers = generateOptionsHeaders(['GET'], { includeCorsHeaders: false });

      expect(headers.Allow).toBe('GET');
      expect(headers['Access-Control-Allow-Origin']).toBeUndefined();
      expect(headers['Access-Control-Allow-Methods']).toBeUndefined();
    });
  });

  describe('generateOptionsResponse', () => {
    it('should generate complete OPTIONS response', () => {
      app.get('/users', { handler: () => ({ users: [] }) });
      app.post('/users', { handler: ({ body }) => ({ created: true }) });

      const response = generateOptionsResponse(RouteRegistry, '/users');

      expect(response.status).toBe(204);
      expect(response.body).toBeNull();
      expect(response.headers.Allow).toContain('GET');
      expect(response.headers.Allow).toContain('POST');
      expect(response.headers['Access-Control-Allow-Origin']).toBe('*');
    });

    it('should return 404 for non-existent path', () => {
      app.get('/users', { handler: () => ({ users: [] }) });

      const response = generateOptionsResponse(RouteRegistry, '/posts');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Not Found' });
    });

    it('should use custom configuration', () => {
      app.get('/users', { handler: () => ({ users: [] }) });

      const response = generateOptionsResponse(RouteRegistry, '/users', {
        origin: 'https://example.com',
        maxAge: 7200,
        additionalHeaders: { 'X-API-Version': '1.0' },
      });

      expect(response.headers['Access-Control-Allow-Origin']).toBe('https://example.com');
      expect(response.headers['Access-Control-Max-Age']).toBe('7200');
      expect(response.headers['X-API-Version']).toBe('1.0');
    });

    it('should handle paths with parameters', () => {
      app.get('/users/:id', {
        params: z.object({ id: z.string() }),
        handler: () => ({ id: '123' }),
      });
      app.put('/users/:id', {
        params: z.object({ id: z.string() }),
        handler: () => ({ updated: true }),
      });

      const response = generateOptionsResponse(RouteRegistry, '/users/123');

      expect(response.status).toBe(204);
      expect(response.headers.Allow).toContain('GET');
      expect(response.headers.Allow).toContain('PUT');
      expect(response.headers.Allow).toContain('OPTIONS');
    });
  });

  describe('Integration', () => {
    it('should work for RESTful resource with all methods', () => {
      app.get('/users/:id', {
        params: z.object({ id: z.string() }),
        handler: () => ({ id: '1', name: 'John' }),
      });
      app.put('/users/:id', {
        params: z.object({ id: z.string() }),
        handler: () => ({ updated: true }),
      });
      app.patch('/users/:id', {
        params: z.object({ id: z.string() }),
        handler: () => ({ patched: true }),
      });
      app.delete('/users/:id', {
        params: z.object({ id: z.string() }),
        handler: () => ({ deleted: true }),
      });
      app.head('/users/:id', {
        params: z.object({ id: z.string() }),
        handler: () => ({ exists: true }),
      });

      const response = generateOptionsResponse(RouteRegistry, '/users/123');

      expect(response.status).toBe(204);
      expect(response.headers.Allow).toContain('GET');
      expect(response.headers.Allow).toContain('PUT');
      expect(response.headers.Allow).toContain('PATCH');
      expect(response.headers.Allow).toContain('DELETE');
      expect(response.headers.Allow).toContain('HEAD');
      expect(response.headers.Allow).toContain('OPTIONS');
    });
  });
});

