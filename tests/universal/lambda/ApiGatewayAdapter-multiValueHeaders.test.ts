/**
 * ApiGatewayAdapter multiValueHeaders Tests
 * 
 * Tests that ApiGatewayAdapter correctly handles headers from both
 * event.headers and event.multiValueHeaders
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { ApiGatewayAdapter } from '../../../src/lambda/adapters/ApiGatewayAdapter';
import { RouteRegistry } from '../../../src/application/RouteRegistry';
import { SchemaValidator } from '../../../src/application/SchemaValidator';
import type { APIGatewayProxyEvent } from '../../../src/lambda/adapters/ApiGatewayAdapter';

describe('ApiGatewayAdapter - multiValueHeaders Support', () => {
  beforeEach(() => {
    RouteRegistry.clear();
  });

  it('should extract Origin from multiValueHeaders when headers is empty', async () => {
    const adapter = new ApiGatewayAdapter(RouteRegistry, SchemaValidator, {
      origin: true,
      credentials: true,
    });

    RouteRegistry.register('POST', '/users', {
      handler: () => ({ success: true }),
    });

    const event: APIGatewayProxyEvent = {
      httpMethod: 'POST',
      path: '/users',
      pathParameters: null,
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      headers: undefined, // No headers
      multiValueHeaders: {
        Origin: ['http://localhost:3001'], // Origin in multiValueHeaders
        'Content-Type': ['application/json'],
      },
      body: JSON.stringify({ name: 'Test' }),
      isBase64Encoded: false,
      requestContext: {
        requestId: 'test-request-id',
        stage: 'test',
        resourceId: 'test-resource',
        resourcePath: '/users',
        httpMethod: 'POST',
        requestTime: '2024-01-01T00:00:00Z',
        requestTimeEpoch: Date.now(),
        identity: {
          sourceIp: '127.0.0.1',
          userAgent: 'test-agent',
        },
      },
    };

    const response = await adapter.handle(event, {} as any);

    expect(response.statusCode).toBe(200);
    expect(response.headers).toBeDefined();
    expect(response.headers!['Access-Control-Allow-Origin']).toBe('http://localhost:3001');
    expect(response.headers!['Access-Control-Allow-Credentials']).toBe('true');
  });

  it('should prefer headers over multiValueHeaders when both are present', async () => {
    const adapter = new ApiGatewayAdapter(RouteRegistry, SchemaValidator, {
      origin: true,
      credentials: true,
    });

    RouteRegistry.register('POST', '/users', {
      handler: () => ({ success: true }),
    });

    const event: APIGatewayProxyEvent = {
      httpMethod: 'POST',
      path: '/users',
      pathParameters: null,
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      headers: {
        Origin: 'http://example.com', // This should take precedence
      },
      multiValueHeaders: {
        Origin: ['http://localhost:3001'], // This should be ignored
        'Content-Type': ['application/json'],
      },
      body: JSON.stringify({ name: 'Test' }),
      isBase64Encoded: false,
      requestContext: {
        requestId: 'test-request-id',
        stage: 'test',
        resourceId: 'test-resource',
        resourcePath: '/users',
        httpMethod: 'POST',
        requestTime: '2024-01-01T00:00:00Z',
        requestTimeEpoch: Date.now(),
        identity: {
          sourceIp: '127.0.0.1',
          userAgent: 'test-agent',
        },
      },
    };

    const response = await adapter.handle(event, {} as any);

    expect(response.statusCode).toBe(200);
    expect(response.headers).toBeDefined();
    // Should use Origin from headers, not multiValueHeaders
    expect(response.headers!['Access-Control-Allow-Origin']).toBe('http://example.com');
  });

  it('should handle case-insensitive Origin in multiValueHeaders', async () => {
    const adapter = new ApiGatewayAdapter(RouteRegistry, SchemaValidator, {
      origin: true,
      credentials: true,
    });

    // Register POST route (OPTIONS will be handled automatically for this route)
    RouteRegistry.register('POST', '/users', {
      handler: () => ({ success: true }),
    });

    const event: APIGatewayProxyEvent = {
      httpMethod: 'OPTIONS',
      path: '/users',
      pathParameters: null,
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      headers: undefined, // No headers
      multiValueHeaders: {
        origin: ['http://localhost:3001'], // lowercase origin
        'Access-Control-Request-Method': ['POST'],
      },
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

    const response = await adapter.handle(event, {} as any);

    expect(response.statusCode).toBe(204);
    expect(response.headers).toBeDefined();
    // extractOrigin should find lowercase 'origin' in merged headers
    expect(response.headers!['Access-Control-Allow-Origin']).toBe('http://localhost:3001');
  });
});

