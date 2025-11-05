/**
 * HEAD and OPTIONS HTTP methods tests
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { inject } from '../../src/application/DependencyInjector';
import { TinyTest } from '../../src/testing/TinyTest';

describe('HEAD HTTP Method', () => {
  let api: TinyTest;

  beforeEach(() => {
    api = new TinyTest();
  });

  afterEach(async () => {
    await api.close();
  });

  it('should register a HEAD route', async () => {
    api.head('/users/:id', {
      params: z.object({ id: z.string() }),
      handler: ({ params }) => ({ exists: true, userId: params.id }),
    });

    const response = await api.request('HEAD', '/users/123');

    expect(response.status).toBe(200);
  });

  it('should handle HEAD request with query params', async () => {
    api.head('/search', {
      query: z.object({
        q: z.string(),
        limit: z.string().optional(),
      }),
      handler: ({ query }) => ({
        found: query.q === 'test',
        limit: query.limit || '10',
      }),
    });

    const response = await api.request('HEAD', '/search?q=test&limit=20');

    expect(response.status).toBe(200);
  });

  it('should validate HEAD request params', async () => {
    api.head('/users/:id', {
      params: z.object({ id: z.string().uuid() }),
      handler: ({ params }) => ({ userId: params.id }),
    });

    // Invalid UUID should fail validation with 422 (Unprocessable Entity)
    const response = await api.request('HEAD', '/users/not-a-uuid');

    expect(response.status).toBe(422);
  });

  it('should return custom headers in HEAD response', async () => {
    api.head('/resource', {
      handler: () => ({
        status: 200,
        body: { exists: true },
        headers: {
          'X-Resource-Version': '2.0',
          'X-Cache-Status': 'HIT',
        },
      }),
    });

    const response = await api.request('HEAD', '/resource');

    expect(response.status).toBe(200);
    expect(response.headers['x-resource-version']).toBe('2.0');
    expect(response.headers['x-cache-status']).toBe('HIT');
  });

  it('should work with dependency injection', async () => {
    const getCurrentUser = () => ({ id: '123', name: 'Test User' });

    api.head('/profile', {
      dependencies: {
        user: inject(getCurrentUser),
      },
      handler: ({ dependencies }) => ({
        userId: dependencies.user.id,
        exists: true,
      }),
    });

    const response = await api.request('HEAD', '/profile');

    expect(response.status).toBe(200);
  });

  it('should handle HEAD errors properly', async () => {
    api.head('/error', {
      handler: () => {
        throw new Error('Something went wrong');
      },
    });

    const response = await api.request('HEAD', '/error');

    expect(response.status).toBe(500);
  });
});

describe('OPTIONS HTTP Method', () => {
  let api: TinyTest;

  beforeEach(() => {
    api = new TinyTest();
  });

  afterEach(async () => {
    await api.close();
  });

  it('should register an OPTIONS route', async () => {
    api.options('/users', {
      handler: () => ({
        allow: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
      }),
    });

    const response = await api.request('OPTIONS', '/users');

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('allow');
    expect(response.data.allow).toContain('GET');
    expect(response.data.allow).toContain('POST');
  });

  it('should handle OPTIONS with path params', async () => {
    api.options('/users/:id', {
      params: z.object({ id: z.string() }),
      handler: ({ params }) => ({
        allow: ['GET', 'PUT', 'DELETE', 'HEAD'],
        resource: `/users/${params.id}`,
      }),
    });

    const response = await api.request('OPTIONS', '/users/123');

    expect(response.status).toBe(200);
    expect(response.data.resource).toBe('/users/123');
  });

  it('should return allowed methods in headers', async () => {
    api.options('/api/resource', {
      handler: () => ({
        status: 204,
        body: null,
        headers: {
          Allow: 'GET, POST, OPTIONS',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }),
    });

    const response = await api.request('OPTIONS', '/api/resource');

    expect(response.status).toBe(204);
    expect(response.headers.allow).toBe('GET, POST, OPTIONS');
  });

  it('should handle CORS preflight request', async () => {
    api.options('/api/data', {
      handler: () => ({
        status: 204,
        body: null,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      }),
    });

    const response = await api.request('OPTIONS', '/api/data');

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('*');
    expect(response.headers['access-control-allow-methods']).toBe(
      'GET, POST, PUT, DELETE, OPTIONS',
    );
  });

  it('should validate OPTIONS request params', async () => {
    api.options('/users/:id', {
      params: z.object({ id: z.string().uuid() }),
      handler: ({ params }) => ({
        allow: ['GET', 'PUT', 'DELETE'],
        userId: params.id,
      }),
    });

    // Invalid UUID should fail validation with 422 (Unprocessable Entity)
    const response = await api.request('OPTIONS', '/users/invalid-uuid');

    expect(response.status).toBe(422);
  });

  it('should work with dependency injection', async () => {
    const getPermissions = () => ({
      canRead: true,
      canWrite: false,
      canDelete: false,
    });

    api.options('/resource', {
      dependencies: {
        permissions: inject(getPermissions),
      },
      handler: ({ dependencies }) => {
        const methods = ['OPTIONS'];
        if (dependencies.permissions.canRead) methods.push('GET', 'HEAD');
        if (dependencies.permissions.canWrite) methods.push('POST', 'PUT', 'PATCH');
        if (dependencies.permissions.canDelete) methods.push('DELETE');

        return { allow: methods };
      },
    });

    const response = await api.request('OPTIONS', '/resource');

    expect(response.status).toBe(200);
    expect(response.data.allow).toContain('GET');
    expect(response.data.allow).toContain('HEAD');
    expect(response.data.allow).not.toContain('POST');
    expect(response.data.allow).not.toContain('DELETE');
  });
});

describe('HEAD and OPTIONS Integration', () => {
  let api: TinyTest;

  beforeEach(() => {
    api = new TinyTest();
  });

  afterEach(async () => {
    await api.close();
  });

  it('should support both HEAD and OPTIONS on the same path', async () => {
    const userSchema = z.object({ id: z.string() });

    api.head('/users/:id', {
      params: userSchema,
      handler: ({ params }) => ({
        exists: true,
        userId: params.id,
      }),
    });

    api.options('/users/:id', {
      params: userSchema,
      handler: () => ({
        allow: ['GET', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'],
      }),
    });

    const headResponse = await api.request('HEAD', '/users/123');
    const optionsResponse = await api.request('OPTIONS', '/users/123');

    expect(headResponse.status).toBe(200);
    expect(optionsResponse.status).toBe(200);
    expect(optionsResponse.data.allow).toContain('HEAD');
  });

  it('should allow all HTTP methods on the same resource', async () => {
    const path = '/resource';
    const handler = { handler: () => ({ success: true }) };

    api.get(path, handler);
    api.post(path, { handler: ({ body }) => ({ success: true, body }) });
    api.put(path, { handler: ({ body }) => ({ success: true, body }) });
    api.patch(path, { handler: ({ body }) => ({ success: true, body }) });
    api.delete(path, handler);
    api.head(path, handler);
    api.options(path, {
      handler: () => ({
        allow: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
      }),
    });

    // Test GET, HEAD, DELETE, OPTIONS (no body required)
    const noBodyMethods = ['GET', 'HEAD', 'DELETE', 'OPTIONS'] as const;
    for (const method of noBodyMethods) {
      const response = await api.request(method, path);
      expect(response.status).toBe(200);
    }

    // Test POST, PUT, PATCH (with empty body)
    const bodyMethods = ['POST', 'PUT', 'PATCH'] as const;
    for (const method of bodyMethods) {
      const response = await api.request(method, path, { body: {} });
      expect(response.status).toBe(200);
    }
  });
});
