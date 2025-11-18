/**
 * Tests for ApiGatewayAdapter
 *
 * Principles Applied:
 * - SOLID: Single Responsibility, Open/Closed, Dependency Inversion
 * - DDD: Domain Services, Value Objects, Aggregates
 * - Functional: Pure functions, Immutability, Composition
 * - Guard Clauses: Early validation, Fail Fast
 */

import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import { ApiGatewayAdapter, type APIGatewayProxyEvent } from '../../../src/lambda/adapters/ApiGatewayAdapter';
import { RouteRegistry } from '../../../src/application/RouteRegistry';
import { SchemaValidator } from '../../../src/application/SchemaValidator';
import { Route } from '../../../src/domain/Route';

describe('ApiGatewayAdapter', () => {
  let adapter: ApiGatewayAdapter;

  beforeEach(() => {
    RouteRegistry.clear();
    adapter = new ApiGatewayAdapter(RouteRegistry, SchemaValidator);
  });

  afterEach(() => {
    RouteRegistry.clear();
  });

  describe('toRequestDTO - Pure Function', () => {
    it('should convert API Gateway event to RequestDTO', () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: 'POST',
        path: '/users',
        pathParameters: null,
        queryStringParameters: { page: '1' },
        multiValueQueryStringParameters: null,
        headers: { 'Content-Type': 'application/json' },
        multiValueHeaders: undefined,
        body: JSON.stringify({ name: 'John' }),
        isBase64Encoded: false,
        requestContext: {
          requestId: 'test-request-id',
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

      const requestDTO = adapter['toRequestDTO'](event);

      expect(requestDTO.method).toBe('POST');
      expect(requestDTO.path).toBe('/users');
      expect(requestDTO.queryParams.page).toBe('1');
      expect(requestDTO.body).toEqual({ name: 'John' });
      expect(requestDTO.headers['Content-Type']).toBe('application/json');
      expect(requestDTO.correlationId).toBe('test-request-id');
    });

    it('should handle base64 encoded body', () => {
      const body = JSON.stringify({ name: 'John' });
      const base64Body = Buffer.from(body).toString('base64');

      const event: APIGatewayProxyEvent = {
        httpMethod: 'POST',
        path: '/users',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        headers: {},
        multiValueHeaders: undefined,
        body: base64Body,
        isBase64Encoded: true,
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

      const requestDTO = adapter['toRequestDTO'](event);
      expect(requestDTO.body).toEqual({ name: 'John' });
    });

    it('should extract cookies from headers', () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: 'GET',
        path: '/users',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        headers: { cookie: 'session=abc123; theme=dark' },
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

      const requestDTO = adapter['toRequestDTO'](event);
      expect(requestDTO.cookies?.session).toBe('abc123');
      expect(requestDTO.cookies?.theme).toBe('dark');
    });

    it('should throw error for invalid event', () => {
      expect(() => adapter['toRequestDTO'](null as any)).toThrow('API Gateway event is required');
      expect(() => adapter['toRequestDTO']({} as any)).toThrow('API Gateway event must have httpMethod property');
    });
  });

  describe('toLambdaResponse - Pure Function', () => {
    it('should convert handler result to Lambda response', () => {
      const result = { id: 1, name: 'John' };
      const response = adapter['toLambdaResponse'](result, 200);

      expect(response.statusCode).toBe(200);
      expect(response.body).toBe(JSON.stringify(result));
      expect(response.headers?.['Content-Type']).toBe('application/json');
    });

    it('should handle null/undefined result', () => {
      const response = adapter['toLambdaResponse'](null, 204);
      expect(response.statusCode).toBe(204);
      expect(response.body).toBe('');
    });

    it('should handle redirect responses', () => {
      const redirect = {
        statusCode: 302,
        headers: { Location: '/new-url' },
        body: null,
      };
      const response = adapter['toLambdaResponse'](redirect, 302);

      expect(response.statusCode).toBe(302);
      expect(response.headers?.Location).toBe('/new-url');
      expect(response.body).toBe('');
    });

    it('should handle custom response objects', () => {
      const customResponse = {
        status: 201,
        body: { id: 1 },
        headers: { 'X-Custom': 'value' },
      };
      const response = adapter['toLambdaResponse'](customResponse, 200);

      expect(response.statusCode).toBe(201);
      expect(response.body).toBe(JSON.stringify({ id: 1 }));
      expect(response.headers?.['X-Custom']).toBe('value');
    });
  });

  describe('handle - Integration', () => {
    it('should handle API Gateway event and execute handler', async () => {
      const UserSchema = z.object({
        name: z.string().min(1),
        email: z.string().email(),
      });

      RouteRegistry.register(
        new Route('POST', '/users', {
          body: UserSchema,
          handler: async ({ body }) => {
            return { id: 1, ...body };
          },
        }),
      );

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

      const response = await adapter.handle(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBe(1);
      expect(body.name).toBe('John');
      expect(body.email).toBe('john@example.com');
    });

    it('should return 404 for non-existent route', async () => {
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

      const response = await adapter.handle(event);

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Not Found');
    });

    it('should validate request body and return 400 on validation error', async () => {
      const UserSchema = z.object({
        name: z.string().min(1),
        email: z.string().email(),
      });

      RouteRegistry.register(
        new Route('POST', '/users', {
          body: UserSchema,
          handler: async ({ body }) => body,
        }),
      );

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

      const response = await adapter.handle(event);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Validation Error');
      expect(body.details).toBeDefined();
      expect(Array.isArray(body.details)).toBe(true);
    });

    it('should handle dynamic routes with path parameters', async () => {
      const UserIdSchema = z.object({
        id: z.string().uuid(),
      });

      RouteRegistry.register(
        new Route('GET', '/users/:id', {
          params: UserIdSchema,
          handler: async ({ params }) => {
            return { id: params.id, name: 'John' };
          },
        }),
      );

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

      const response = await adapter.handle(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBe('123e4567-e89b-12d3-a456-426614174000');
    });
  });
});

