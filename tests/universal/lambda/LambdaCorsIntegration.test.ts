/**
 * Lambda CORS Integration Tests
 *
 * Tests CORS functionality in Lambda mode, specifically:
 * - OPTIONS preflight requests
 * - CORS headers in all responses
 * - Different CORS configurations
 *
 * Principles:
 * - Integration: Tests full Lambda handler flow
 * - Functional: Tests behavior, not implementation
 * - Guard Clauses: Early validation in test setup
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { RouteRegistry } from '../../../src/application/RouteRegistry';
import { SyntroJS } from '../../../src/core/SyntroJS';
import type { APIGatewayProxyEvent } from '../../../src/lambda/adapters/ApiGatewayAdapter';
import { LambdaHandler } from '../../../src/lambda/handlers/LambdaHandler';

describe('Lambda CORS Integration', () => {
  beforeEach(() => {
    RouteRegistry.clear();
  });

  describe('OPTIONS Preflight Requests', () => {
    it('should handle OPTIONS preflight with lambdaCors: true', async () => {
      const app = new SyntroJS({
        rest: false,
        lambdaCors: true,
      });

      app.post('/orders', {
        handler: () => ({ message: 'Order created' }),
      });

      const handler = app.handler();

      // Simulate OPTIONS preflight request
      const event: APIGatewayProxyEvent = {
        httpMethod: 'OPTIONS',
        path: '/orders',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        headers: {
          Origin: 'http://localhost:3000',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'content-type',
        },
        multiValueHeaders: undefined,
        body: null,
        isBase64Encoded: false,
        requestContext: {
          requestId: 'test-request-id',
          stage: 'test',
          resourceId: 'test-resource',
          resourcePath: '/orders',
          httpMethod: 'OPTIONS',
          requestTime: '2024-01-01T00:00:00Z',
          requestTimeEpoch: Date.now(),
          identity: {
            sourceIp: '127.0.0.1',
            userAgent: 'test-agent',
          },
        },
      };

      const response = await handler(event, {} as any);

      // CRITICAL: OPTIONS must return 204, not 404
      expect(response.statusCode).toBe(204);
      expect(response.headers).toBeDefined();
      expect(response.headers!['Access-Control-Allow-Origin']).toBeTruthy();
      expect(response.headers!['Access-Control-Allow-Methods']).toContain('POST');
    });

    it('should handle OPTIONS preflight with lambdaCors: CorsOptions', async () => {
      const app = new SyntroJS({
        rest: false,
        lambdaCors: {
          origin: true,
          credentials: true,
          methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
          allowedHeaders: ['Content-Type', 'Authorization'],
        },
      });

      app.get('/users', {
        handler: () => ({ users: [] }),
      });

      const handler = app.handler();

      const event: APIGatewayProxyEvent = {
        httpMethod: 'OPTIONS',
        path: '/users',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        headers: {
          Origin: 'http://localhost:3000',
          'Access-Control-Request-Method': 'GET',
        },
        multiValueHeaders: undefined,
        body: null,
        isBase64Encoded: false,
        requestContext: {
          requestId: 'test-request-id',
          stage: 'test',
          resourceId: 'test-resource',
          resourcePath: '/users',
          httpMethod: 'OPTIONS',
          requestTime: '2024-01-01T00:00:00Z',
          requestTimeEpoch: Date.now(),
          identity: {
            sourceIp: '127.0.0.1',
            userAgent: 'test-agent',
          },
        },
      };

      const response = await handler(event, {} as any);

      expect(response.statusCode).toBe(204);
      expect(response.headers).toBeDefined();
      expect(response.headers!['Access-Control-Allow-Origin']).toBe('http://localhost:3000');
      expect(response.headers!['Access-Control-Allow-Credentials']).toBe('true');
      expect(response.headers!['Access-Control-Allow-Methods']).toContain('GET');
    });

    it('should handle OPTIONS for non-existent routes', async () => {
      const app = new SyntroJS({
        rest: false,
        lambdaCors: true,
      });

      const handler = app.handler();

      const event: APIGatewayProxyEvent = {
        httpMethod: 'OPTIONS',
        path: '/nonexistent',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        headers: {
          Origin: 'http://localhost:3000',
          'Access-Control-Request-Method': 'GET',
        },
        multiValueHeaders: undefined,
        body: null,
        isBase64Encoded: false,
        requestContext: {
          requestId: 'test-request-id',
          stage: 'test',
          resourceId: 'test-resource',
          resourcePath: '/nonexistent',
          httpMethod: 'OPTIONS',
          requestTime: '2024-01-01T00:00:00Z',
          requestTimeEpoch: Date.now(),
          identity: {
            sourceIp: '127.0.0.1',
            userAgent: 'test-agent',
          },
        },
      };

      const response = await handler(event, {} as any);

      // Even for non-existent routes, OPTIONS should return 204 with CORS headers
      expect(response.statusCode).toBe(204);
      expect(response.headers).toBeDefined();
      expect(response.headers!['Access-Control-Allow-Origin']).toBeTruthy();
    });
  });

  describe('CORS Headers in Actual Requests', () => {
    it('should include CORS headers in POST responses', async () => {
      const app = new SyntroJS({
        rest: false,
        lambdaCors: {
          origin: true,
          credentials: true,
        },
      });

      app.post('/orders', {
        handler: () => ({ message: 'Order created' }),
      });

      const handler = app.handler();

      const event: APIGatewayProxyEvent = {
        httpMethod: 'POST',
        path: '/orders',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        headers: {
          Origin: 'http://localhost:3000',
          'Content-Type': 'application/json',
        },
        multiValueHeaders: undefined,
        body: JSON.stringify({ item: 'test' }),
        isBase64Encoded: false,
        requestContext: {
          requestId: 'test-request-id',
          stage: 'test',
          resourceId: 'test-resource',
          resourcePath: '/orders',
          httpMethod: 'POST',
          requestTime: '2024-01-01T00:00:00Z',
          requestTimeEpoch: Date.now(),
          identity: {
            sourceIp: '127.0.0.1',
            userAgent: 'test-agent',
          },
        },
      };

      const response = await handler(event, {} as any);

      expect(response.statusCode).toBe(200);
      expect(response.headers).toBeDefined();
      expect(response.headers!['Access-Control-Allow-Origin']).toBe('http://localhost:3000');
      expect(response.headers!['Access-Control-Allow-Credentials']).toBe('true');
    });

    it('should include CORS headers in error responses', async () => {
      const app = new SyntroJS({
        rest: false,
        lambdaCors: true,
      });

      app.get('/users/:id', {
        handler: () => {
          throw new Error('User not found');
        },
      });

      const handler = app.handler();

      const event: APIGatewayProxyEvent = {
        httpMethod: 'GET',
        path: '/users/123',
        pathParameters: { id: '123' },
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        headers: {
          Origin: 'http://localhost:3000',
        },
        multiValueHeaders: undefined,
        body: null,
        isBase64Encoded: false,
        requestContext: {
          requestId: 'test-request-id',
          stage: 'test',
          resourceId: 'test-resource',
          resourcePath: '/users/{id}',
          httpMethod: 'GET',
          requestTime: '2024-01-01T00:00:00Z',
          requestTimeEpoch: Date.now(),
          identity: {
            sourceIp: '127.0.0.1',
            userAgent: 'test-agent',
          },
        },
      };

      const response = await handler(event, {} as any);

      // Error responses should also include CORS headers
      expect(response.statusCode).toBeGreaterThanOrEqual(400);
      expect(response.headers).toBeDefined();
      expect(response.headers!['Access-Control-Allow-Origin']).toBeTruthy();
    });

    it('should include CORS headers in 404 responses', async () => {
      const app = new SyntroJS({
        rest: false,
        lambdaCors: true,
      });

      app.get('/users', {
        handler: () => ({ users: [] }),
      });

      const handler = app.handler();

      const event: APIGatewayProxyEvent = {
        httpMethod: 'GET',
        path: '/nonexistent',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        headers: {
          Origin: 'http://localhost:3000',
        },
        multiValueHeaders: undefined,
        body: null,
        isBase64Encoded: false,
        requestContext: {
          requestId: 'test-request-id',
          stage: 'test',
          resourceId: 'test-resource',
          resourcePath: '/nonexistent',
          httpMethod: 'GET',
          requestTime: '2024-01-01T00:00:00Z',
          requestTimeEpoch: Date.now(),
          identity: {
            sourceIp: '127.0.0.1',
            userAgent: 'test-agent',
          },
        },
      };

      const response = await handler(event, {} as any);

      // 404 responses should also include CORS headers
      expect(response.statusCode).toBe(404);
      expect(response.headers).toBeDefined();
      expect(response.headers!['Access-Control-Allow-Origin']).toBeTruthy();
    });
  });

  describe('CORS Configuration Edge Cases', () => {
    it('should not include CORS headers when lambdaCors is false', async () => {
      const app = new SyntroJS({
        rest: false,
        lambdaCors: false,
      });

      app.post('/orders', {
        handler: () => ({ message: 'Order created' }),
      });

      const handler = app.handler();

      const event: APIGatewayProxyEvent = {
        httpMethod: 'POST',
        path: '/orders',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        headers: {
          Origin: 'http://localhost:3000',
          'Content-Type': 'application/json',
        },
        multiValueHeaders: undefined,
        body: JSON.stringify({ item: 'test' }),
        isBase64Encoded: false,
        requestContext: {
          requestId: 'test-request-id',
          stage: 'test',
          resourceId: 'test-resource',
          resourcePath: '/orders',
          httpMethod: 'POST',
          requestTime: '2024-01-01T00:00:00Z',
          requestTimeEpoch: Date.now(),
          identity: {
            sourceIp: '127.0.0.1',
            userAgent: 'test-agent',
          },
        },
      };

      const response = await handler(event, {} as any);

      expect(response.statusCode).toBe(200);
      // CORS headers should not be present when disabled
      expect(response.headers?.['Access-Control-Allow-Origin']).toBeUndefined();
    });

    it('should handle wildcard origin configuration', async () => {
      const app = new SyntroJS({
        rest: false,
        lambdaCors: {
          origin: '*',
        },
      });

      app.get('/public', {
        handler: () => ({ data: 'public' }),
      });

      const handler = app.handler();

      const event: APIGatewayProxyEvent = {
        httpMethod: 'GET',
        path: '/public',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        headers: {
          Origin: 'http://any-origin.com',
        },
        multiValueHeaders: undefined,
        body: null,
        isBase64Encoded: false,
        requestContext: {
          requestId: 'test-request-id',
          stage: 'test',
          resourceId: 'test-resource',
          resourcePath: '/public',
          httpMethod: 'GET',
          requestTime: '2024-01-01T00:00:00Z',
          requestTimeEpoch: Date.now(),
          identity: {
            sourceIp: '127.0.0.1',
            userAgent: 'test-agent',
          },
        },
      };

      const response = await handler(event, {} as any);

      expect(response.statusCode).toBe(200);
      expect(response.headers).toBeDefined();
      expect(response.headers!['Access-Control-Allow-Origin']).toBe('*');
      // Credentials cannot be used with wildcard origin
      expect(response.headers!['Access-Control-Allow-Credentials']).toBeUndefined();
    });
  });
});
