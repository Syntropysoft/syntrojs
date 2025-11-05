/**
 * Auto-OPTIONS Generator Tests
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  generateOptionsHeaders,
  generateOptionsResponse,
  getAllowedMethods,
} from '../../src/application/AutoOptionsGenerator';
import { RouteRegistry } from '../../src/application/RouteRegistry';
import { SyntroJS } from '../../src/core/SyntroJS';

describe('Auto-OPTIONS Generator', () => {
  let app: SyntroJS;

  beforeEach(() => {
    app = new SyntroJS({ title: 'Test API' });
  });

  describe('getAllowedMethods', () => {
    it('should return allowed methods for a path with multiple routes', () => {
      app.get('/auto-users', { handler: () => ({ users: [] }) });
      app.post('/auto-users', { handler: ({ body }) => ({ created: true }) });
      app.delete('/auto-users', { handler: () => ({ deleted: true }) });

      const methods = getAllowedMethods(RouteRegistry, '/auto-users');

      expect(methods).toContain('GET');
      expect(methods).toContain('POST');
      expect(methods).toContain('DELETE');
      expect(methods).toContain('OPTIONS');
    });

    it('should handle path parameters correctly', () => {
      app.get('/auto-accounts/:id', {
        params: z.object({ id: z.string() }),
        handler: ({ params }) => ({ id: params.id }),
      });
      app.put('/auto-accounts/:id', {
        params: z.object({ id: z.string() }),
        handler: ({ params }) => ({ updated: true }),
      });

      const methods = getAllowedMethods(RouteRegistry, '/auto-accounts/123');

      expect(methods).toContain('GET');
      expect(methods).toContain('PUT');
      expect(methods).toContain('OPTIONS');
    });

    it('should return empty array for non-existent path', () => {
      app.get('/auto-something', { handler: () => ({ users: [] }) });

      const methods = getAllowedMethods(RouteRegistry, '/auto-nonexistent');

      expect(methods).toEqual([]);
    });

    it('should include HEAD and OPTIONS methods', () => {
      app.get('/auto-resource', { handler: () => ({ data: 'test' }) });
      app.head('/auto-resource', { handler: () => ({ exists: true }) });
      app.options('/auto-resource', { handler: () => ({ allow: ['GET', 'HEAD', 'OPTIONS'] }) });

      const methods = getAllowedMethods(RouteRegistry, '/auto-resource');

      expect(methods).toContain('GET');
      expect(methods).toContain('HEAD');
      expect(methods).toContain('OPTIONS');
    });

    it('should return sorted methods', () => {
      app.delete('/auto-sorted', { handler: () => ({ deleted: true }) });
      app.post('/auto-sorted', { handler: ({ body }) => ({ created: true }) });
      app.get('/auto-sorted', { handler: () => ({ users: [] }) });
      app.put('/auto-sorted', { handler: ({ body }) => ({ updated: true }) });

      const methods = getAllowedMethods(RouteRegistry, '/auto-sorted');

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
      app.get('/auto-response', { handler: () => ({ users: [] }) });
      app.post('/auto-response', { handler: ({ body }) => ({ created: true }) });

      const response = generateOptionsResponse(RouteRegistry, '/auto-response');

      expect(response.status).toBe(204);
      expect(response.body).toBeNull();
      expect(response.headers.Allow).toContain('GET');
      expect(response.headers.Allow).toContain('POST');
      expect(response.headers['Access-Control-Allow-Origin']).toBe('*');
    });

    it('should return 404 for non-existent path', () => {
      app.get('/auto-existing', { handler: () => ({ users: [] }) });

      const response = generateOptionsResponse(RouteRegistry, '/auto-notfound');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Not Found' });
    });

    it('should use custom configuration', () => {
      app.get('/auto-config', { handler: () => ({ users: [] }) });

      const response = generateOptionsResponse(RouteRegistry, '/auto-config', {
        origin: 'https://example.com',
        maxAge: 7200,
        additionalHeaders: { 'X-API-Version': '1.0' },
      });

      expect(response.headers['Access-Control-Allow-Origin']).toBe('https://example.com');
      expect(response.headers['Access-Control-Max-Age']).toBe('7200');
      expect(response.headers['X-API-Version']).toBe('1.0');
    });

    it('should handle paths with parameters', () => {
      app.get('/auto-items/:id', {
        params: z.object({ id: z.string() }),
        handler: () => ({ id: '123' }),
      });
      app.put('/auto-items/:id', {
        params: z.object({ id: z.string() }),
        handler: () => ({ updated: true }),
      });

      const response = generateOptionsResponse(RouteRegistry, '/auto-items/123');

      expect(response.status).toBe(204);
      expect(response.headers.Allow).toContain('GET');
      expect(response.headers.Allow).toContain('PUT');
      expect(response.headers.Allow).toContain('OPTIONS');
    });
  });

  describe('Integration', () => {
    it('should work for RESTful resource with all methods', () => {
      app.get('/auto-restful/:id', {
        params: z.object({ id: z.string() }),
        handler: () => ({ id: '1', name: 'John' }),
      });
      app.put('/auto-restful/:id', {
        params: z.object({ id: z.string() }),
        handler: () => ({ updated: true }),
      });
      app.patch('/auto-restful/:id', {
        params: z.object({ id: z.string() }),
        handler: () => ({ patched: true }),
      });
      app.delete('/auto-restful/:id', {
        params: z.object({ id: z.string() }),
        handler: () => ({ deleted: true }),
      });
      app.head('/auto-restful/:id', {
        params: z.object({ id: z.string() }),
        handler: () => ({ exists: true }),
      });

      const response = generateOptionsResponse(RouteRegistry, '/auto-restful/123');

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
