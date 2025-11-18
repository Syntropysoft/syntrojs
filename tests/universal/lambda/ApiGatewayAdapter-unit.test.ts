/**
 * Unit Tests for ApiGatewayAdapter
 *
 * Tests the adapter in isolation without dependencies on SyntroJS core
 * This allows testing adapters independently before integration
 *
 * Principles Applied:
 * - SOLID: Single Responsibility, Dependency Inversion
 * - DDD: Domain Services, Value Objects
 * - Functional: Pure functions, Immutability
 * - Guard Clauses: Early validation, Fail Fast
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { ApiGatewayAdapter } from '../../../src/lambda/adapters/ApiGatewayAdapter';
import type { ILambdaAdapter } from '../../../src/domain/interfaces/ILambdaAdapter';
import type { APIGatewayProxyEvent } from '../../../src/lambda/adapters/ApiGatewayAdapter';

// Mock dependencies (can be replaced with real implementations for integration tests)
class MockRouteRegistry {
  private routes = new Map<string, unknown>();

  find(method: string, path: string): unknown {
    return this.routes.get(`${method}:${path}`) || null;
  }

  extractPathParams(routePath: string, requestPath: string): Record<string, string> {
    // Simple mock implementation
    if (routePath === requestPath) return {};
    const params: Record<string, string> = {};
    const routeParts = routePath.split('/');
    const requestParts = requestPath.split('/');
    routeParts.forEach((part, index) => {
      if (part.startsWith(':') && requestParts[index]) {
        params[part.slice(1)] = requestParts[index];
      }
    });
    return params;
  }

  register(route: unknown): void {
    const r = route as { method: string; path: string };
    this.routes.set(`${r.method}:${r.path}`, route);
  }

  clear(): void {
    this.routes.clear();
  }
}

class MockSchemaValidator {
  validate(schema: unknown, data: unknown): { success: boolean; data?: unknown; errors?: Array<{ field: string; message: string }> } {
    // Simple mock - always succeeds
    return { success: true, data };
  }
}

describe('ApiGatewayAdapter - Unit Tests (Isolated)', () => {
  let adapter: ApiGatewayAdapter;
  let mockRouteRegistry: MockRouteRegistry;
  let mockValidator: MockSchemaValidator;

  beforeEach(() => {
    mockRouteRegistry = new MockRouteRegistry();
    mockValidator = new MockSchemaValidator();
    adapter = new ApiGatewayAdapter(
      mockRouteRegistry as any,
      mockValidator as any,
    );
  });

  describe('ILambdaAdapter Interface Implementation', () => {
    it('should implement ILambdaAdapter interface', () => {
      expect(adapter).toBeInstanceOf(ApiGatewayAdapter);
      expect(adapter).toHaveProperty('getEventType');
      expect(adapter).toHaveProperty('canHandle');
      expect(adapter).toHaveProperty('handle');
    });

    it('should return correct event type', () => {
      const eventType = adapter.getEventType();
      expect(eventType).toBe('api-gateway');
    });

    it('should correctly identify API Gateway events', () => {
      const validEvent: APIGatewayProxyEvent = {
        httpMethod: 'GET',
        path: '/test',
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
          resourcePath: '/test',
          httpMethod: 'GET',
          requestTime: '2024-01-01T00:00:00Z',
          requestTimeEpoch: 1704067200000,
          identity: {
            sourceIp: '127.0.0.1',
            userAgent: 'test-agent',
          },
        },
      };

      expect(adapter.canHandle(validEvent)).toBe(true);
    });

    it('should reject non-API Gateway events', () => {
      expect(adapter.canHandle(null)).toBe(false);
      expect(adapter.canHandle({})).toBe(false);
      expect(adapter.canHandle({ someField: 'value' })).toBe(false);
      expect(adapter.canHandle('not an object')).toBe(false);
    });

    it('should reject events missing required fields', () => {
      expect(adapter.canHandle({ httpMethod: 'GET' })).toBe(false);
      expect(adapter.canHandle({ path: '/test' })).toBe(false);
      expect(adapter.canHandle({ httpMethod: 'GET', path: '/test' })).toBe(false);
    });
  });

  describe('toRequestDTO - Pure Function', () => {
    it('should convert API Gateway event to RequestDTO', () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: 'POST',
        path: '/users',
        pathParameters: { id: '123' },
        queryStringParameters: { page: '1' },
        multiValueQueryStringParameters: null,
        headers: { 'Content-Type': 'application/json' },
        multiValueHeaders: undefined,
        body: JSON.stringify({ name: 'John' }),
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

      const requestDTO = adapter['toRequestDTO'](event);

      expect(requestDTO.method).toBe('POST');
      expect(requestDTO.path).toBe('/users');
      expect(requestDTO.pathParams.id).toBe('123');
      expect(requestDTO.queryParams.page).toBe('1');
      expect(requestDTO.body).toEqual({ name: 'John' });
      expect(requestDTO.headers['Content-Type']).toBe('application/json');
      expect(requestDTO.correlationId).toBe('test-id');
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
  });

  describe('Guard Clauses', () => {
    it('should throw error for null event in handle', async () => {
      await expect(adapter.handle(null as any)).rejects.toThrow('API Gateway event is required');
    });

    it('should throw error for invalid event type in handle', async () => {
      await expect(adapter.handle({ invalid: 'event' })).rejects.toThrow('Event is not an API Gateway event');
    });

    it('should throw error for null event in toRequestDTO', () => {
      expect(() => adapter['toRequestDTO'](null as any)).toThrow('API Gateway event is required');
    });

    it('should throw error for invalid event in toRequestDTO', () => {
      expect(() => adapter['toRequestDTO']({} as any)).toThrow('API Gateway event must have httpMethod property');
    });
  });
});

