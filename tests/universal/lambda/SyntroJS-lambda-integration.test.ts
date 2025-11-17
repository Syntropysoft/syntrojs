/**
 * SyntroJS Lambda Mode - Integration Tests
 *
 * Tests end-to-end integration of SyntroJS in Lambda mode
 * Verifies that the same code works in both REST and Lambda modes
 *
 * Principles Applied:
 * - SOLID: Single Responsibility, Open/Closed, Dependency Inversion
 * - DDD: Domain Services, Value Objects, Aggregates
 * - Functional: Pure functions, Immutability, Composition
 * - Guard Clauses: Early validation, Fail Fast
 */

import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import { SyntroJS } from '../../../src/core';
import { RouteRegistry } from '../../../src/application/RouteRegistry';
import { lambdaAdapterFactory } from '../../../src/lambda/adapters/LambdaAdapterFactory';
import type { APIGatewayProxyEvent } from '../../../src/lambda/adapters/ApiGatewayAdapter';

describe('SyntroJS Lambda Mode - Integration Tests', () => {
  beforeEach(() => {
    RouteRegistry.clear();
    lambdaAdapterFactory.clear();
  });

  afterEach(() => {
    RouteRegistry.clear();
    lambdaAdapterFactory.clear();
  });

  describe('Lambda Mode Configuration', () => {
    it('should create SyntroJS instance in Lambda mode', () => {
      const app = new SyntroJS({ rest: false });
      expect(app).toBeDefined();
    });

    it('should throw error when calling listen() in Lambda mode', async () => {
      const app = new SyntroJS({ rest: false });
      await expect(app.listen(3000)).rejects.toThrow(
        'Cannot start HTTP server in Lambda mode',
      );
    });

    it('should throw error when calling handler() in REST mode', () => {
      const app = new SyntroJS({ rest: true });
      expect(() => app.handler()).toThrow('Lambda handler not available in REST mode');
    });

    it('should return handler function in Lambda mode', () => {
      const app = new SyntroJS({ rest: false });
      const handler = app.handler();
      expect(typeof handler).toBe('function');
    });
  });

  describe('End-to-End Lambda Flow', () => {
    it('should handle complete request flow in Lambda mode', async () => {
      const app = new SyntroJS({ rest: false, title: 'Test API' });

      const UserSchema = z.object({
        name: z.string().min(1),
        email: z.string().email(),
      });

      app.post('/users', {
        body: UserSchema,
        handler: async ({ body }) => {
          return { id: '123', ...body };
        },
      });

      const handler = app.handler();

      const event: APIGatewayProxyEvent = {
        httpMethod: 'POST',
        path: '/users',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        headers: { 'Content-Type': 'application/json' },
        multiValueHeaders: undefined,
        body: JSON.stringify({ name: 'John', email: 'john@example.com' }),
        isBase64Encoded: false,
        requestContext: {
          requestId: 'test-id',
          stage: 'prod',
          resourceId: 'resource-id',
          resourcePath: '/users',
          httpMethod: 'POST',
          requestTime: '2024-01-01T00:00:00Z',
          requestTimeEpoch: 1704067200000,
          identity: {
            sourceIp: '127.0.0.1',
            userAgent: 'test-agent',
          },
        },
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBe('123');
      expect(body.name).toBe('John');
      expect(body.email).toBe('john@example.com');
    });

    it('should validate request body and return 400 on validation error', async () => {
      const app = new SyntroJS({ rest: false });

      const UserSchema = z.object({
        name: z.string().min(1),
        email: z.string().email(),
      });

      app.post('/users', {
        body: UserSchema,
        handler: async ({ body }) => body,
      });

      const handler = app.handler();

      const event: APIGatewayProxyEvent = {
        httpMethod: 'POST',
        path: '/users',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        headers: { 'Content-Type': 'application/json' },
        multiValueHeaders: undefined,
        body: JSON.stringify({ name: '', email: 'invalid-email' }),
        isBase64Encoded: false,
        requestContext: {
          requestId: 'test-id',
          stage: 'prod',
          resourceId: 'resource-id',
          resourcePath: '/users',
          httpMethod: 'POST',
          requestTime: '2024-01-01T00:00:00Z',
          requestTimeEpoch: 1704067200000,
          identity: {
            sourceIp: '127.0.0.1',
            userAgent: 'test-agent',
          },
        },
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Validation Error');
      expect(body.details).toBeDefined();
    });

    it('should handle GET request with query parameters', async () => {
      const app = new SyntroJS({ rest: false });

      app.get('/users', {
        query: z.object({
          page: z.string().optional(),
          limit: z.string().optional(),
        }),
        handler: async ({ query }) => {
          return {
            page: query.page || '1',
            limit: query.limit || '10',
            users: [],
          };
        },
      });

      const handler = app.handler();

      const event: APIGatewayProxyEvent = {
        httpMethod: 'GET',
        path: '/users',
        pathParameters: null,
        queryStringParameters: { page: '2', limit: '20' },
        multiValueQueryStringParameters: null,
        headers: {},
        multiValueHeaders: undefined,
        body: null,
        isBase64Encoded: false,
        requestContext: {
          requestId: 'test-id',
          stage: 'prod',
          resourceId: 'resource-id',
          resourcePath: '/users',
          httpMethod: 'GET',
          requestTime: '2024-01-01T00:00:00Z',
          requestTimeEpoch: 1704067200000,
          identity: {
            sourceIp: '127.0.0.1',
            userAgent: 'test-agent',
          },
        },
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.page).toBe('2');
      expect(body.limit).toBe('20');
    });

    it('should handle dynamic routes with path parameters', async () => {
      const app = new SyntroJS({ rest: false });

      app.get('/users/:id', {
        params: z.object({
          id: z.string().uuid(),
        }),
        handler: async ({ params }) => {
          return { id: params.id, name: 'John' };
        },
      });

      const handler = app.handler();

      const event: APIGatewayProxyEvent = {
        httpMethod: 'GET',
        path: '/users/123e4567-e89b-12d3-a456-426614174000',
        pathParameters: { id: '123e4567-e89b-12d3-a456-426614174000' },
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        headers: {},
        multiValueHeaders: undefined,
        body: null,
        isBase64Encoded: false,
        requestContext: {
          requestId: 'test-id',
          stage: 'prod',
          resourceId: 'resource-id',
          resourcePath: '/users/{id}',
          httpMethod: 'GET',
          requestTime: '2024-01-01T00:00:00Z',
          requestTimeEpoch: 1704067200000,
          identity: {
            sourceIp: '127.0.0.1',
            userAgent: 'test-agent',
          },
        },
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('should return 404 for non-existent routes', async () => {
      const app = new SyntroJS({ rest: false });

      app.get('/users', {
        handler: async () => ({ users: [] }),
      });

      const handler = app.handler();

      const event: APIGatewayProxyEvent = {
        httpMethod: 'GET',
        path: '/nonexistent',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        headers: {},
        multiValueHeaders: undefined,
        body: null,
        isBase64Encoded: false,
        requestContext: {
          requestId: 'test-id',
          stage: 'prod',
          resourceId: 'resource-id',
          resourcePath: '/nonexistent',
          httpMethod: 'GET',
          requestTime: '2024-01-01T00:00:00Z',
          requestTimeEpoch: 1704067200000,
          identity: {
            sourceIp: '127.0.0.1',
            userAgent: 'test-agent',
          },
        },
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Not Found');
    });
  });

  describe('Same Code, Different Modes', () => {
    it('should work with same route definitions in both modes', () => {
      // Clear registry before creating apps
      RouteRegistry.clear();

      const routes = {
        '/users': {
          get: {
            handler: async () => ({ users: [] }),
          },
          post: {
            body: z.object({ name: z.string() }),
            handler: async ({ body }) => ({ id: '1', ...body }),
          },
        },
      };

      // REST mode
      const restApp = new SyntroJS({ rest: true, routes });
      expect(restApp).toBeDefined();

      // Clear registry before creating Lambda app
      RouteRegistry.clear();

      // Lambda mode
      const lambdaApp = new SyntroJS({ rest: false, routes });
      expect(lambdaApp).toBeDefined();
      expect(typeof lambdaApp.handler()).toBe('function');
    });
  });
});

