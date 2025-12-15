/**
 * Type-Safe Client Tests
 *
 * Functional Tests: Test actual functionality, not just coverage
 * Principles: SOLID, DDD, Functional Programming, Guard Clauses
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SyntroJS } from '../../../src/core/SyntroJS';
import { createClient } from '../../../src/client/createClient';
import { RouteRegistry } from '../../../src/application/RouteRegistry';
import { z } from 'zod';

describe('createClient', () => {
  let app: SyntroJS;

  beforeEach(() => {
    app = new SyntroJS();
  });

  afterEach(() => {
    // Clean up routes between tests
    RouteRegistry.clear();
  });

  describe('Local Mode (Testing)', () => {
    it('should create client in local mode by default', () => {
      // Functional: create client
      const client = createClient(app);

      // Guard clause: client should exist
      expect(client).toBeDefined();
      expect(typeof client).toBe('object');
    });

    it('should execute GET route handler directly', async () => {
      // Arrange: register route
      app.get('/users', {
        handler: () => ({ users: [{ id: 1, name: 'John' }] }),
      });

      // Act: create client and call route
      const client = createClient(app) as any;
      const response = await client.users.get();

      // Assert: verify response
      expect(response).toBeDefined();
      expect(response.data).toEqual({ users: [{ id: 1, name: 'John' }] });
      expect(response.status).toBe(200);
    });

    it('should execute POST route handler with body', async () => {
      // Arrange: register route with body validation
      const createUserSchema = z.object({
        name: z.string(),
        email: z.string().email(),
      });

      app.post('/users', {
        body: createUserSchema,
        handler: (ctx) => ({
          id: 1,
          name: ctx.body.name,
          email: ctx.body.email,
        }),
      });

      // Act: create client and call route
      const client = createClient(app) as any;
      const response = await client.users.post({
        body: { name: 'John', email: 'john@example.com' },
      });

      // Assert: verify response
      expect(response.data).toEqual({
        id: 1,
        name: 'John',
        email: 'john@example.com',
      });
    });

    it('should handle route with path parameters', async () => {
      // Arrange: register route with params
      const paramsSchema = z.object({
        id: z.string(),
      });

      app.get('/users/:id', {
        params: paramsSchema,
        handler: (ctx) => ({
          id: ctx.params.id,
          name: 'John',
        }),
      });

      // Act: create client and call route
      const client = createClient(app) as any;
      const response = await client.users[':id'].get({
        params: { id: '123' },
      });

      // Assert: verify response
      expect(response.data).toEqual({
        id: '123',
        name: 'John',
      });
    });

    it('should handle route with query parameters', async () => {
      // Arrange: register route with query
      const querySchema = z.object({
        page: z.string().transform(Number),
        limit: z.string().transform(Number),
      });

      app.get('/users', {
        query: querySchema,
        handler: (ctx) => ({
          page: ctx.query.page,
          limit: ctx.query.limit,
          users: [],
        }),
      });

      // Act: create client and call route
      const client = createClient(app) as any;
      const response = await client.users.get({
        query: { page: '1', limit: '10' },
      });

      // Assert: verify response
      expect(response.data).toEqual({
        page: 1,
        limit: 10,
        users: [],
      });
    });

    it('should validate request body against schema', async () => {
      // Arrange: register route with body validation
      const bodySchema = z.object({
        name: z.string().min(3),
      });

      app.post('/users', {
        body: bodySchema,
        handler: () => ({ success: true }),
      });

      // Act & Assert: should throw validation error
      const client = createClient(app) as any;
      await expect(
        client.users.post({
          body: { name: 'ab' }, // Too short
        }),
      ).rejects.toThrow();
    });

    it('should handle nested routes', async () => {
      // Arrange: register nested routes
      app.get('/users/:id/posts', {
        handler: (ctx) => ({
          userId: ctx.params.id,
          posts: [],
        }),
      });

      // Act: create client and call nested route
      const client = createClient(app) as any;
      const response = await client.users[':id'].posts.get({
        params: { id: '123' },
      });

      // Assert: verify response
      expect(response.data).toEqual({
        userId: '123',
        posts: [],
      });
    });

    it('should handle multiple HTTP methods on same path', async () => {
      // Arrange: register multiple methods
      app.get('/users/:id', {
        handler: (ctx) => ({ method: 'GET', id: ctx.params.id }),
      });

      app.put('/users/:id', {
        handler: (ctx) => ({ method: 'PUT', id: ctx.params.id }),
      });

      app.delete('/users/:id', {
        handler: (ctx) => ({ method: 'DELETE', id: ctx.params.id }),
      });

      // Act: create client and call different methods
      const client = createClient(app) as any;
      const getResponse = await client.users[':id'].get({ params: { id: '1' } });
      const putResponse = await client.users[':id'].put({
        params: { id: '1' },
        body: { name: 'Updated' },
      });
      const deleteResponse = await client.users[':id'].delete({ params: { id: '1' } });

      // Assert: verify responses
      expect(getResponse.data.method).toBe('GET');
      expect(putResponse.data.method).toBe('PUT');
      expect(deleteResponse.data.method).toBe('DELETE');
    });
  });

  describe('Remote Mode (Frontend)', () => {
    it('should create client in remote mode with baseUrl', () => {
      // Functional: create client with remote config
      const client = createClient(app, {
        mode: 'remote',
        baseUrl: 'https://api.example.com',
      });

      // Guard clause: client should exist
      expect(client).toBeDefined();
    });

    it('should throw error if baseUrl is missing in remote mode', () => {
      // Guard clause: should throw error
      expect(() => {
        createClient(app, {
          mode: 'remote',
          // baseUrl missing
        });
      }).toThrow('baseUrl is required for remote mode');
    });

    it('should throw error if baseUrl is invalid', () => {
      // Guard clause: should throw error
      expect(() => {
        createClient(app, {
          mode: 'remote',
          baseUrl: 'not-a-valid-url',
        });
      }).toThrow('Invalid baseUrl');
    });
  });

  describe('Guard Clauses', () => {
    it('should throw error if app is null', () => {
      // Guard clause: should throw error
      expect(() => {
        createClient(null as any);
      }).toThrow('SyntroJS app instance is required');
    });

    it('should throw error if app is undefined', () => {
      // Guard clause: should throw error
      expect(() => {
        createClient(undefined as any);
      }).toThrow('SyntroJS app instance is required');
    });
  });

  describe('Route Not Found', () => {
    it('should throw error if route does not exist', async () => {
      // Arrange: no routes registered
      const client = createClient(app) as any;

      // Act & Assert: should throw error when accessing HTTP method
      await expect(async () => {
        await client.nonexistent.get();
      }).rejects.toThrow('Route not found: nonexistent');
    });
  });
});

