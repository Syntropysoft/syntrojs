/**
 * OpenAPI Generator - HEAD and OPTIONS support tests
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { SyntroJS } from '../../src/core/SyntroJS';

describe('OpenAPI Generator - HEAD and OPTIONS', () => {
  let app: SyntroJS;

  beforeEach(() => {
    app = new SyntroJS({
      title: 'Test API',
      version: '1.0.0',
    });
  });

  it('should include HEAD method in OpenAPI spec', async () => {
    app.head('/head-test/:id', {
      params: z.object({ id: z.string() }),
      summary: 'Check if user exists',
      description: 'Returns headers only',
      handler: ({ params }) => ({ exists: true, userId: params.id }),
    });

    const spec = app.getOpenAPISpec();

    expect(spec.paths['/head-test/:id']).toBeDefined();
    expect(spec.paths['/head-test/:id'].head).toBeDefined();
    expect(spec.paths['/head-test/:id'].head?.summary).toBe('Check if user exists');
    expect(spec.paths['/head-test/:id'].head?.description).toBe('Returns headers only');
  });

  it('should include OPTIONS method in OpenAPI spec', async () => {
    app.options('/users', {
      summary: 'Get allowed methods',
      description: 'Returns allowed HTTP methods',
      handler: () => ({ allow: ['GET', 'POST', 'HEAD', 'OPTIONS'] }),
    });

    const spec = app.getOpenAPISpec();

    expect(spec.paths['/users']).toBeDefined();
    expect(spec.paths['/users'].options).toBeDefined();
    expect(spec.paths['/users'].options?.summary).toBe('Get allowed methods');
    expect(spec.paths['/users'].options?.description).toBe('Returns allowed HTTP methods');
  });

  it('should include both HEAD and OPTIONS on the same path', async () => {
    const userSchema = z.object({ id: z.string() });

    app.get('/users/:id', {
      params: userSchema,
      summary: 'Get user',
      handler: ({ params }) => ({ id: params.id, name: 'John' }),
    });

    app.head('/users/:id', {
      params: userSchema,
      summary: 'Check user exists',
      handler: ({ params }) => ({ exists: true }),
    });

    app.options('/users/:id', {
      params: userSchema,
      summary: 'Get allowed methods',
      handler: () => ({ allow: ['GET', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'] }),
    });

    const spec = app.getOpenAPISpec();

    expect(spec.paths['/users/:id']).toBeDefined();
    expect(spec.paths['/users/:id'].get).toBeDefined();
    expect(spec.paths['/users/:id'].head).toBeDefined();
    expect(spec.paths['/users/:id'].options).toBeDefined();

    expect(spec.paths['/users/:id'].get?.summary).toBe('Get user');
    expect(spec.paths['/users/:id'].head?.summary).toBe('Check user exists');
    expect(spec.paths['/users/:id'].options?.summary).toBe('Get allowed methods');
  });

  it('should include parameters for HEAD requests', async () => {
    app.head('/search', {
      query: z.object({
        q: z.string(),
        limit: z.number().optional(),
      }),
      summary: 'Check search results',
      handler: ({ query }) => ({ found: true, count: 10 }),
    });

    const spec = app.getOpenAPISpec();

    expect(spec.paths['/search'].head).toBeDefined();
    expect(spec.paths['/search'].head?.parameters).toBeDefined();
    expect(spec.paths['/search'].head?.parameters?.length).toBeGreaterThan(0);
  });

  it('should include tags for HEAD and OPTIONS', async () => {
    app.head('/tags-test/:id', {
      params: z.object({ id: z.string() }),
      tags: ['users', 'metadata'],
      summary: 'User metadata',
      handler: () => ({ exists: true }),
    });

    app.options('/tags-test', {
      tags: ['users', 'cors'],
      summary: 'CORS preflight',
      handler: () => ({ allow: ['GET', 'POST'] }),
    });

    const spec = app.getOpenAPISpec();

    expect(spec.paths['/tags-test/:id'].head?.tags).toEqual(['users', 'metadata']);
    expect(spec.paths['/tags-test'].options?.tags).toEqual(['users', 'cors']);
  });

  it('should mark HEAD and OPTIONS as deprecated if specified', async () => {
    app.head('/legacy/:id', {
      params: z.object({ id: z.string() }),
      deprecated: true,
      handler: () => ({ exists: true }),
    });

    app.options('/legacy', {
      deprecated: true,
      handler: () => ({ allow: ['GET'] }),
    });

    const spec = app.getOpenAPISpec();

    expect(spec.paths['/legacy/:id'].head?.deprecated).toBe(true);
    expect(spec.paths['/legacy'].options?.deprecated).toBe(true);
  });

  it('should include operationId for HEAD and OPTIONS', async () => {
    app.head('/operation-test/:id', {
      params: z.object({ id: z.string() }),
      operationId: 'checkUserExists',
      handler: () => ({ exists: true }),
    });

    app.options('/operation-test', {
      operationId: 'getUserOptions',
      handler: () => ({ allow: ['GET', 'POST'] }),
    });

    const spec = app.getOpenAPISpec();

    expect(spec.paths['/operation-test/:id'].head?.operationId).toBe('checkUserExists');
    expect(spec.paths['/operation-test'].options?.operationId).toBe('getUserOptions');
  });

  it('should generate correct responses for HEAD and OPTIONS', async () => {
    app.head('/response-test/:id', {
      params: z.object({ id: z.string() }),
      handler: () => ({ exists: true }),
    });

    app.options('/response-test', {
      handler: () => ({ allow: ['GET', 'POST'] }),
    });

    const spec = app.getOpenAPISpec();

    expect(spec.paths['/response-test/:id'].head?.responses).toBeDefined();
    expect(spec.paths['/response-test/:id'].head?.responses['200']).toBeDefined();

    expect(spec.paths['/response-test'].options?.responses).toBeDefined();
    expect(spec.paths['/response-test'].options?.responses['200']).toBeDefined();
  });
});
