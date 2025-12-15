/**
 * Tests for LambdaHandler
 *
 * Principles Applied:
 * - SOLID: Single Responsibility, Open/Closed, Dependency Inversion
 * - DDD: Domain Services, Value Objects, Aggregates
 * - Functional: Pure functions, Immutability, Composition
 * - Guard Clauses: Early validation, Fail Fast
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { RouteRegistry } from '../../../src/application/RouteRegistry';
import { SchemaValidator } from '../../../src/application/SchemaValidator';
import { Route } from '../../../src/domain/Route';
import { lambdaAdapterFactory } from '../../../src/lambda/adapters/LambdaAdapterFactory';
import { LambdaHandler } from '../../../src/lambda/handlers/LambdaHandler';

describe('LambdaHandler', () => {
  let handler: LambdaHandler;

  beforeEach(() => {
    RouteRegistry.clear();
    // Clear factory to avoid duplicate registration errors
    lambdaAdapterFactory.clear();
    handler = new LambdaHandler({
      routeRegistry: RouteRegistry,
      validator: SchemaValidator,
    });
  });

  afterEach(() => {
    RouteRegistry.clear();
    // Clean up factory after each test
    lambdaAdapterFactory.clear();
  });

  describe('detectEventType - Pure Function (Factory-based)', () => {
    it('should detect API Gateway v1 event using registered adapter', () => {
      const event = {
        httpMethod: 'GET',
        path: '/users',
        requestContext: {},
      };

      const eventType = handler['detectEventType'](event);
      expect(eventType).toBe('api-gateway');
    });

    it('should return unknown for API Gateway v2 (no adapter registered)', () => {
      const event = {
        requestContext: {
          http: {
            method: 'GET',
            path: '/users',
          },
        },
        routeKey: 'GET /users',
      };

      // No adapter registered for api-gateway-v2, so returns unknown
      const eventType = handler['detectEventType'](event);
      expect(eventType).toBe('unknown');
    });

    it('should return unknown for SQS (no adapter registered)', () => {
      const event = {
        Records: [
          {
            eventSource: 'aws:sqs',
            body: '{}',
          },
        ],
      };

      // No adapter registered for SQS, so returns unknown
      const eventType = handler['detectEventType'](event);
      expect(eventType).toBe('unknown');
    });

    it('should return unknown for S3 (no adapter registered)', () => {
      const event = {
        Records: [
          {
            s3: {
              bucket: { name: 'test-bucket' },
              object: { key: 'test-key' },
            },
          },
        ],
      };

      // No adapter registered for S3, so returns unknown
      const eventType = handler['detectEventType'](event);
      expect(eventType).toBe('unknown');
    });

    it('should return unknown for EventBridge (no adapter registered)', () => {
      const event = {
        source: 'aws.events',
        detail: {},
      };

      // No adapter registered for EventBridge, so returns unknown
      const eventType = handler['detectEventType'](event);
      expect(eventType).toBe('unknown');
    });

    it('should return unknown for invalid event', () => {
      const eventType = handler['detectEventType'](null);
      expect(eventType).toBe('unknown');

      const eventType2 = handler['detectEventType']({});
      expect(eventType2).toBe('unknown');
    });
  });

  describe('handler - Integration', () => {
    it('should handle API Gateway event', async () => {
      RouteRegistry.register(
        new Route('GET', '/hello', {
          handler: async () => {
            return { message: 'Hello World' };
          },
        }),
      );

      const event = {
        httpMethod: 'GET',
        path: '/hello',
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
          resourcePath: '/hello',
          httpMethod: 'GET',
          requestTime: '2024-01-01T00:00:00Z',
          requestTimeEpoch: 1704067200000,
          identity: {
            sourceIp: '127.0.0.1',
            userAgent: 'test-agent',
          },
        },
      };

      const response = await handler.handler(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Hello World');
    });

    it('should return 400 for unsupported event types (no adapter registered)', async () => {
      // Use an event type that doesn't have an adapter registered
      const unknownEvent = {
        Records: [
          {
            eventSource: 'aws:dynamodb', // Not supported
            body: '{}',
          },
        ],
      };

      // No adapter registered for this event type, so returns 400 (unknown event type)
      const response = await handler.handler(unknownEvent);
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Unknown event type');
    });

    it('should return 400 for unknown event type', async () => {
      const unknownEvent = { someUnknownField: 'value' };

      const response = await handler.handler(unknownEvent);
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Unknown event type');
    });

    it('should return 500 for null event', async () => {
      const response = await handler.handler(null as any);

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Invalid event: event is required');
    });
  });

  describe('createLambdaHandler - Factory Function', () => {
    it('should create handler function', () => {
      const handlerFn = handler.handler.bind(handler);
      expect(typeof handlerFn).toBe('function');
    });
  });
});
