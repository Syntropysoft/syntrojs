/**
 * Basic API E2E tests
 * Testing the complete flow from route definition to HTTP response
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ErrorHandler } from '../../../src/application/ErrorHandler';
import { RouteRegistry } from '../../../src/application/RouteRegistry';
import { SyntroJS } from '../../../src/core';
import { HTTPException, NotFoundException } from '../../../src/domain/HTTPException';

describe('SyntroJS E2E - Basic API', () => {
  let app: SyntroJS;
  let server: string;

  beforeEach(() => {
    app = new SyntroJS();
    // Clear registry to avoid duplicate routes between tests
    RouteRegistry.clear();
    // Reset error handler to defaults
    ErrorHandler.clearCustomHandlers();
  });

  afterEach(async () => {
    // Only close if server was started
    if (server) {
      try {
        await app.close();
      } catch {
        // Ignore errors in cleanup
      }
    }
  });

  describe('Simple routes', () => {
    it('should create and respond to GET route', async () => {
      app.get('/hello', {
        handler: () => ({ message: 'Hello World' }),
      });

      server = await app.listen(0); // Random port
      const port = new URL(server).port;

      const response = await fetch(`http://localhost:${port}/hello`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ message: 'Hello World' });
    });

    it('should create and respond to POST route', async () => {
      app.post('/echo', {
        handler: ({ body }) => body,
      });

      server = await app.listen(0);
      const port = new URL(server).port;

      const response = await fetch(`http://localhost:${port}/echo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: 'data' }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ test: 'data' });
    });
  });

  describe('Route with validation', () => {
    it('should validate and parse path parameters', async () => {
      app.get('/users/:id', {
        params: z.object({ id: z.coerce.number() }),
        handler: ({ params }) => ({ userId: params.id, type: typeof params.id }),
      });

      server = await app.listen(0);
      const port = new URL(server).port;

      const response = await fetch(`http://localhost:${port}/users/123`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.userId).toBe(123);
      expect(data.type).toBe('number');
    });

    it('should validate query parameters', async () => {
      app.get('/search', {
        query: z.object({
          q: z.string(),
          limit: z.coerce.number().default(10),
        }),
        handler: ({ query }) => ({ query: query.q, limit: query.limit }),
      });

      server = await app.listen(0);
      const port = new URL(server).port;

      const response = await fetch(`http://localhost:${port}/search?q=test&limit=20`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ query: 'test', limit: 20 });
    });

    it('should validate POST body', async () => {
      app.post('/users', {
        body: z.object({
          name: z.string().min(1),
          email: z.string().email(),
        }),
        handler: ({ body }) => ({ id: 1, ...body }),
      });

      server = await app.listen(0);
      const port = new URL(server).port;

      const response = await fetch(`http://localhost:${port}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Gaby', email: 'gaby@example.com' }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ id: 1, name: 'Gaby', email: 'gaby@example.com' });
    });

    it('should return 422 for invalid body', async () => {
      app.post('/users', {
        body: z.object({
          email: z.string().email(),
        }),
        handler: ({ body }) => body,
      });

      server = await app.listen(0);
      const port = new URL(server).port;

      const response = await fetch(`http://localhost:${port}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'invalid-email' }),
      });
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.detail).toBe('Validation Error');
      expect(data.errors).toBeDefined();
      expect(data.errors[0].field).toBe('email');
    });
  });

  describe('Custom status codes', () => {
    it('should use custom status code', async () => {
      app.post('/users', {
        status: 201,
        handler: () => ({ id: 1 }),
      });

      server = await app.listen(0);
      const port = new URL(server).port;

      const response = await fetch(`http://localhost:${port}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(201);
    });
  });

  describe('HTTPException handling', () => {
    it('should handle HTTPException thrown in handler', async () => {
      app.get('/error', {
        handler: () => {
          throw new HTTPException(404, 'Not found');
        },
      });

      server = await app.listen(0);
      const port = new URL(server).port;

      const response = await fetch(`http://localhost:${port}/error`);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.detail).toBe('Not found');
      expect(data.path).toBe('/error');
    });

    it('should handle NotFoundException', async () => {
      app.get('/users/:id', {
        params: z.object({ id: z.coerce.number() }),
        handler: ({ params }) => {
          if (params.id === 999) {
            throw new NotFoundException('User not found');
          }
          return { id: params.id };
        },
      });

      server = await app.listen(0);
      const port = new URL(server).port;

      const response = await fetch(`http://localhost:${port}/users/999`);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.detail).toBe('User not found');
    });
  });

  describe('Custom exception handlers', () => {
    it('should use custom exception handler', async () => {
      class DatabaseError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'DatabaseError';
        }
      }

      app.exceptionHandler(DatabaseError, (context, error) => ({
        status: 503,
        body: {
          detail: 'Database unavailable',
          message: error.message,
          path: context.path,
        },
      }));

      app.get('/db-error', {
        handler: () => {
          throw new DatabaseError('Connection failed');
        },
      });

      server = await app.listen(0);
      const port = new URL(server).port;

      const response = await fetch(`http://localhost:${port}/db-error`);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.detail).toBe('Database unavailable');
      expect(data.message).toBe('Connection failed');
    });
  });

  describe('All HTTP Methods', () => {
    it('should handle PUT request', async () => {
      app.put('/users/:id', {
        params: z.object({ id: z.coerce.number() }),
        body: z.object({ name: z.string() }),
        handler: ({ params, body }) => ({ id: params.id, updated: true, ...body }),
      });

      server = await app.listen(0);
      const port = new URL(server).port;

      const response = await fetch(`http://localhost:${port}/users/1`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated Name' }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual({ id: 1, updated: true, name: 'Updated Name' });
    });

    it('should handle DELETE request', async () => {
      app.delete('/users/:id', {
        params: z.object({ id: z.coerce.number() }),
        handler: ({ params }) => ({ deleted: true, id: params.id }),
      });

      server = await app.listen(0);
      const port = new URL(server).port;

      const response = await fetch(`http://localhost:${port}/users/1`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual({ deleted: true, id: 1 });
    });

    it('should handle PATCH request', async () => {
      app.patch('/users/:id', {
        params: z.object({ id: z.coerce.number() }),
        body: z.object({ name: z.string().optional(), email: z.string().optional() }),
        handler: ({ params, body }) => ({ id: params.id, patched: true, changes: body }),
      });

      server = await app.listen(0);
      const port = new URL(server).port;

      const response = await fetch(`http://localhost:${port}/users/1`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Patched Name' }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual({ id: 1, patched: true, changes: { name: 'Patched Name' } });
    });

    it('should handle multiple routes on same path with different methods', async () => {
      app.get('/users', {
        handler: () => ({ method: 'GET' }),
      });

      app.post('/users', {
        handler: () => ({ method: 'POST' }),
      });

      server = await app.listen(0);
      const port = new URL(server).port;

      const getResponse = await fetch(`http://localhost:${port}/users`);
      const getData = await getResponse.json();

      const postResponse = await fetch(`http://localhost:${port}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const postData = await postResponse.json();

      expect(getData.method).toBe('GET');
      expect(postData.method).toBe('POST');
    });
  });

  describe('Response validation', () => {
    it('should validate response against schema', async () => {
      app.get('/users/:id', {
        params: z.object({ id: z.coerce.number() }),
        response: z.object({
          id: z.number(),
          name: z.string(),
        }),
        handler: ({ params }) => ({
          id: params.id,
          name: 'Gaby',
        }),
      });

      server = await app.listen(0);
      const port = new URL(server).port;

      const response = await fetch(`http://localhost:${port}/users/123`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ id: 123, name: 'Gaby' });
    });

    it('should throw error if response does not match schema', async () => {
      app.get('/invalid-response', {
        response: z.object({ id: z.number() }),
        handler: () => ({ id: 'invalid' as any }), // Wrong type
      });

      server = await app.listen(0);
      const port = new URL(server).port;

      const response = await fetch(`http://localhost:${port}/invalid-response`);

      expect(response.status).toBe(422);
    });
  });

  describe('Server lifecycle', () => {
    it('should throw error if listen called twice', async () => {
      app.get('/test', { handler: () => ({}) });

      server = await app.listen(0);

      await expect(app.listen(0)).rejects.toThrow('Server is already started');
    });

    it('should throw error if close called before listen', async () => {
      await expect(app.close()).rejects.toThrow('Server is not started');
    });

    it('should throw error for invalid port numbers', async () => {
      app.get('/test', { handler: () => ({}) });

      await expect(app.listen(-1)).rejects.toThrow('Valid port number is required');
      await expect(app.listen(99999)).rejects.toThrow('Valid port number is required');
    });
  });

  describe('Method chaining', () => {
    it('should allow chaining route definitions', async () => {
      const result = app
        .get('/route1', { handler: () => ({}) })
        .post('/route2', { handler: () => ({}) })
        .put('/route3', { handler: () => ({}) });

      expect(result).toBe(app);
    });

    it('should allow chaining exception handlers', () => {
      class Error1 extends Error {}
      class Error2 extends Error {}

      const result = app
        .exceptionHandler(Error1, () => ({}) as any)
        .exceptionHandler(Error2, () => ({}) as any);

      expect(result).toBe(app);
    });
  });

  describe('Guard Clauses', () => {
    describe('exceptionHandler validations', () => {
      it('should throw error if error class is null', () => {
        expect(() => app.exceptionHandler(null as any, () => ({}) as any)).toThrow(
          'Error class is required',
        );
      });

      it('should throw error if handler is null', () => {
        class CustomError extends Error {}
        expect(() => app.exceptionHandler(CustomError, null as any)).toThrow(
          'Handler function is required',
        );
      });
    });

    describe('route registration validations', () => {
      it('should throw error if path is null in GET', () => {
        expect(() => app.get(null as any, { handler: () => ({}) })).toThrow('Path is required');
      });

      it('should throw error if config is null in POST', () => {
        expect(() => app.post('/test', null as any)).toThrow('Config is required');
      });

      it('should throw error if path is null in PUT', () => {
        expect(() => app.put(null as any, { handler: () => ({}) })).toThrow('Path is required');
      });

      it('should throw error if path is null in DELETE', () => {
        expect(() => app.delete(null as any, { handler: () => ({}) })).toThrow('Path is required');
      });

      it('should throw error if path is null in PATCH', () => {
        expect(() => app.patch(null as any, { handler: () => ({}) })).toThrow('Path is required');
      });
    });
  });
});
