/**
 * Tests for FastifyAdapter
 */

import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { z } from 'zod';
import { Route } from '../../../src/domain/Route';
import type { RequestContext } from '../../../src/domain/types';
import { createFastifyAdapter } from '../../../src/infrastructure/FastifyAdapter';

describe('FastifyAdapter', () => {
  let adapter: ReturnType<typeof createFastifyAdapter>;
  let fastify: FastifyInstance;

  beforeEach(() => {
    adapter = createFastifyAdapter();
  });

  afterEach(async () => {
    if (fastify) {
      await fastify.close();
    }
  });

  describe('create()', () => {
    test('creates a new Fastify instance with default config', () => {
      fastify = adapter.create();

      expect(fastify).toBeDefined();
      expect(fastify.server).toBeDefined();
    });

    test('creates a new Fastify instance with custom config', () => {
      fastify = adapter.create({
        logger: true,
        disableRequestLogging: false,
      });

      expect(fastify).toBeDefined();
      expect(fastify.server).toBeDefined();
    });

    test('creates different instances on each call (no singleton)', () => {
      const instance1 = adapter.create();
      const instance2 = adapter.create();

      expect(instance1).not.toBe(instance2);

      // Cleanup
      instance1.close();
      instance2.close();
    });

    test('disables logging by default', () => {
      fastify = adapter.create();

      // When logger is false, Fastify uses a no-op logger
      expect(fastify.log).toBeDefined();
    });
  });

  describe('registerRoute()', () => {
    beforeEach(() => {
      fastify = adapter.create();
    });

    test('registers a simple GET route', async () => {
      const route = new Route('GET', '/test', {
        handler: () => ({ message: 'Hello' }),
      });

      adapter.registerRoute(fastify, route);

      const response = await fastify.inject({
        method: 'GET',
        url: '/test',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ message: 'Hello' });
    });

    test('registers a POST route with body validation', async () => {
      const route = new Route('POST', '/users', {
        body: z.object({
          name: z.string(),
          age: z.number(),
        }),
        handler: ({ body }) => ({ id: 1, ...body }),
      });

      adapter.registerRoute(fastify, route);

      const response = await fastify.inject({
        method: 'POST',
        url: '/users',
        payload: {
          name: 'Gaby',
          age: 30,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        id: 1,
        name: 'Gaby',
        age: 30,
      });
    });

    test('validates body and returns 422 on invalid input', async () => {
      const route = new Route('POST', '/users', {
        body: z.object({
          name: z.string(),
          age: z.number().min(18),
        }),
        handler: ({ body }) => ({ id: 1, ...body }),
      });

      adapter.registerRoute(fastify, route);

      const response = await fastify.inject({
        method: 'POST',
        url: '/users',
        payload: {
          name: 'Minor',
          age: 17, // Invalid: less than 18
        },
      });

      expect(response.statusCode).toBe(422); // Unprocessable Entity
      const body = response.json();
      expect(body.detail).toContain('Validation Error');
    });

    test('validates params', async () => {
      const route = new Route('GET', '/users/:id', {
        params: z.object({
          id: z.coerce.number(),
        }),
        handler: ({ params }) => ({ id: params.id }),
      });

      adapter.registerRoute(fastify, route);

      const response = await fastify.inject({
        method: 'GET',
        url: '/users/123',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ id: 123 });
    });

    test('validates query parameters', async () => {
      const route = new Route('GET', '/search', {
        query: z.object({
          q: z.string(),
          limit: z.coerce.number().optional(),
        }),
        handler: ({ query }) => ({ query }),
      });

      adapter.registerRoute(fastify, route);

      const response = await fastify.inject({
        method: 'GET',
        url: '/search?q=test&limit=10',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        query: {
          q: 'test',
          limit: 10,
        },
      });
    });

    test('validates response schema', async () => {
      const route = new Route('GET', '/user', {
        response: z.object({
          id: z.number(),
          name: z.string(),
        }),
        handler: () => ({ id: 1, name: 'Gaby' }),
      });

      adapter.registerRoute(fastify, route);

      const response = await fastify.inject({
        method: 'GET',
        url: '/user',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ id: 1, name: 'Gaby' });
    });

    test('returns error if response does not match schema', async () => {
      const route = new Route('GET', '/user', {
        response: z.object({
          id: z.number(),
          name: z.string(),
        }),
        handler: () => ({
          id: 'invalid' as any,
          name: 123 as any,
        }),
      });

      adapter.registerRoute(fastify, route);

      const response = await fastify.inject({
        method: 'GET',
        url: '/user',
      });

      expect(response.statusCode).toBe(422); // Unprocessable Entity (validation error)
    });

    test('returns custom status code if specified', async () => {
      const route = new Route('POST', '/users', {
        status: 201,
        handler: () => ({ id: 1, name: 'Gaby' }),
      });

      adapter.registerRoute(fastify, route);

      const response = await fastify.inject({
        method: 'POST',
        url: '/users',
      });

      expect(response.statusCode).toBe(201);
    });

    test('handles async handlers', async () => {
      const route = new Route('GET', '/async', {
        handler: async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return { message: 'Async result' };
        },
      });

      adapter.registerRoute(fastify, route);

      const response = await fastify.inject({
        method: 'GET',
        url: '/async',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ message: 'Async result' });
    });

    test('builds context with correlation ID from header', async () => {
      let receivedContext: RequestContext | undefined;

      const route = new Route('GET', '/test', {
        handler: (context) => {
          receivedContext = context;
          return { ok: true };
        },
      });

      adapter.registerRoute(fastify, route);

      const correlationId = 'test-correlation-id-123';

      await fastify.inject({
        method: 'GET',
        url: '/test',
        headers: {
          'x-correlation-id': correlationId,
        },
      });

      expect(receivedContext.correlationId).toBe(correlationId);
    });

    test('generates correlation ID if not provided', async () => {
      let receivedContext: RequestContext | undefined;

      const route = new Route('GET', '/test', {
        handler: (context) => {
          receivedContext = context;
          return { ok: true };
        },
      });

      adapter.registerRoute(fastify, route);

      await fastify.inject({
        method: 'GET',
        url: '/test',
      });

      expect(receivedContext.correlationId).toBeDefined();
      expect(typeof receivedContext.correlationId).toBe('string');
      expect(receivedContext.correlationId.length).toBeGreaterThan(0);
    });

    test('builds context with timestamp', async () => {
      let receivedContext: RequestContext | undefined;

      const route = new Route('GET', '/test', {
        handler: (context) => {
          receivedContext = context;
          return { ok: true };
        },
      });

      adapter.registerRoute(fastify, route);

      const before = new Date();
      await fastify.inject({
        method: 'GET',
        url: '/test',
      });
      const after = new Date();

      expect(receivedContext.timestamp).toBeInstanceOf(Date);
      expect(receivedContext.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(receivedContext.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    test('throws error if fastify instance is not provided', () => {
      const route = new Route('GET', '/test', {
        handler: () => ({ ok: true }),
      });

      expect(() => adapter.registerRoute(null as any, route)).toThrow(
        'Fastify instance is required',
      );
    });

    test('throws error if route is not provided', () => {
      expect(() => adapter.registerRoute(fastify, null as any)).toThrow('Route is required');
    });
  });

  describe('listen()', () => {
    beforeEach(() => {
      fastify = adapter.create();
    });

    test('starts server on specified port', async () => {
      const address = await adapter.listen(fastify, 0); // Port 0 = random port

      expect(address).toContain('://');
      expect(address).toContain(':');
    });

    test('returns server address', async () => {
      const address = await adapter.listen(fastify, 0);

      expect(address).toMatch(/http:\/\/[^:]+:\d+/);
    });

    test('throws error if fastify instance is not provided', async () => {
      await expect(adapter.listen(null as any, 3000)).rejects.toThrow(
        'Fastify instance is required',
      );
    });

    test('throws error if port is negative', async () => {
      await expect(adapter.listen(fastify, -1)).rejects.toThrow(
        'Valid port number is required (0-65535)',
      );
    });

    test('throws error if port is too large', async () => {
      await expect(adapter.listen(fastify, 70000)).rejects.toThrow(
        'Valid port number is required (0-65535)',
      );
    });

    test('accepts port 0 for random assignment', async () => {
      const address = await adapter.listen(fastify, 0);

      expect(address).toBeDefined();
      expect(address).toContain('://');
    });

    test('accepts custom host', async () => {
      const address = await adapter.listen(fastify, 0, '127.0.0.1');

      expect(address).toContain('127.0.0.1');
    });
  });

  describe('close()', () => {
    beforeEach(async () => {
      fastify = adapter.create();
      await adapter.listen(fastify, 0);
    });

    test('stops server successfully', async () => {
      await expect(adapter.close(fastify)).resolves.not.toThrow();
    });

    test('throws error if fastify instance is not provided', async () => {
      await expect(adapter.close(null as any)).rejects.toThrow('Fastify instance is required');
    });

    test('can close without starting server', async () => {
      const instance = adapter.create();

      await expect(adapter.close(instance)).resolves.not.toThrow();
    });
  });

  describe('Guard Clauses', () => {
    beforeEach(() => {
      fastify = adapter.create();
    });

    test('all methods validate required parameters', () => {
      const route = new Route('GET', '/test', {
        handler: () => ({ ok: true }),
      });

      // registerRoute guards

      expect(() => adapter.registerRoute(null as any, route)).toThrow();

      expect(() => adapter.registerRoute(fastify, null as any)).toThrow();

      // listen guards

      expect(adapter.listen(null as any, 3000)).rejects.toThrow();
      expect(adapter.listen(fastify, -1)).rejects.toThrow();
      expect(adapter.listen(fastify, 70000)).rejects.toThrow();

      // close guards

      expect(adapter.close(null as any)).rejects.toThrow();
    });
  });
});
