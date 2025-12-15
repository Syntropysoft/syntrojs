/**
 * SerializerRegistry Chain of Responsibility Tests
 * Testing Chain of Responsibility pattern with next() function
 *
 * Principles Applied:
 * - SOLID: Single Responsibility, Open/Closed, Dependency Inversion
 * - DDD: Application Services, Domain Interfaces
 * - Functional: Pure functions, Composition, Immutability
 * - Guard Clauses: Early validation, Fail Fast
 * - Tests: Functional testing (prove behavior, not coverage)
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SerializerRegistry } from '../../../src/application/SerializerRegistry';
import { ResponseHandler } from '../../../src/application/ResponseHandler';
import { CustomResponseSerializer } from '../../../src/application/serializers';
import { JsonSerializer } from '../../../src/application/serializers';
import { RedirectSerializer } from '../../../src/application/serializers';
import type {
  IResponseSerializer,
  SerializedResponseDTO,
  SerializerNext,
} from '../../../src/domain/interfaces';

describe('SerializerRegistry - Chain of Responsibility', () => {
  let registry: SerializerRegistry;
  let handler: ResponseHandler;

  beforeEach(() => {
    registry = new SerializerRegistry();
    handler = new ResponseHandler(registry);
  });

  afterEach(() => {
    registry.clear();
  });

  describe('Chain of Responsibility with next()', () => {
    it('should allow serializer to delegate to next serializer', async () => {
      let decoratorCalled = false;
      let jsonCalled = false;

      // Decorator serializer that wraps JSON responses
      class DecoratorSerializer implements IResponseSerializer {
        canSerialize(result: any): boolean {
          return typeof result === 'object' && result !== null;
        }

        serialize(
          result: any,
          statusCode: number,
          request: Request,
          next?: SerializerNext,
        ): SerializedResponseDTO | null {
          decoratorCalled = true;

          // Delegate to next serializer (JSON)
          if (next) {
            const dto = next(result, statusCode, request);
            if (dto) {
              // Wrap response with decorator headers
              return {
                ...dto,
                headers: {
                  ...dto.headers,
                  'X-Decorated': 'true',
                },
              };
            }
          }

          return null;
        }
      }

      // JSON serializer
      class TestJsonSerializer implements IResponseSerializer {
        canSerialize(result: any): boolean {
          return typeof result === 'object' && result !== null;
        }

        serialize(
          result: any,
          statusCode: number,
          _request: Request,
          _next?: SerializerNext,
        ): SerializedResponseDTO | null {
          jsonCalled = true;
          return {
            body: result,
            statusCode,
            headers: { 'Content-Type': 'application/json' },
          };
        }
      }

      // Register decorator first (higher priority), then JSON
      registry.register(new DecoratorSerializer(), 'Decorator', { priority: 10 });
      registry.register(new TestJsonSerializer(), 'Json', { priority: 999 });

      const result = { message: 'test' };
      const request = new Request('http://localhost', {
        headers: { Accept: 'application/json' },
      });

      const dto = await handler.serialize(result, 200, 'application/json');

      // Verify decorator was called
      expect(decoratorCalled).toBe(true);
      // Verify JSON serializer was called via next()
      expect(jsonCalled).toBe(true);
      // Verify decorator headers were added
      expect(dto.headers['X-Decorated']).toBe('true');
      expect(dto.body).toEqual(result);
    });

    it('should allow serializer to intercept and modify response', async () => {
      let interceptorCalled = false;

      // Interceptor serializer that adds metrics
      class MetricsSerializer implements IResponseSerializer {
        canSerialize(_result: any): boolean {
          return true; // Intercepts everything
        }

        serialize(
          result: any,
          statusCode: number,
          request: Request,
          next?: SerializerNext,
        ): SerializedResponseDTO | null {
          interceptorCalled = true;

          // Call next serializer
          if (next) {
            const dto = next(result, statusCode, request);
            if (dto) {
              // Add metrics headers
              return {
                ...dto,
                headers: {
                  ...dto.headers,
                  'X-Response-Time': '10ms',
                  'X-Request-ID': '12345',
                },
              };
            }
          }

          return null;
        }
      }

      // Simple serializer
      class SimpleSerializer implements IResponseSerializer {
        canSerialize(result: any): boolean {
          return typeof result === 'object';
        }

        serialize(
          result: any,
          statusCode: number,
          _request: Request,
          _next?: SerializerNext,
        ): SerializedResponseDTO {
          return {
            body: result,
            statusCode,
            headers: { 'Content-Type': 'application/json' },
          };
        }
      }

      registry.registerFirst(new MetricsSerializer(), 'Metrics');
      registry.register(new SimpleSerializer(), 'Simple', { priority: 100 });

      const result = { data: 'test' };
      const dto = await handler.serialize(result, 200);

      expect(interceptorCalled).toBe(true);
      expect(dto.headers['X-Response-Time']).toBe('10ms');
      expect(dto.headers['X-Request-ID']).toBe('12345');
      expect(dto.body).toEqual(result);
    });

    it('should allow serializer to skip next() and handle directly', async () => {
      let customCalled = false;
      let jsonCalled = false;

      // Custom serializer that handles specific case
      class CustomSerializer implements IResponseSerializer {
        canSerialize(result: any): boolean {
          return result?.type === 'custom';
        }

        serialize(
          result: any,
          statusCode: number,
          _request: Request,
          _next?: SerializerNext,
        ): SerializedResponseDTO | null {
          customCalled = true;
          // Handle directly, don't call next()
          return {
            body: { handled: 'by-custom', original: result },
            statusCode,
            headers: { 'Content-Type': 'application/custom' },
          };
        }
      }

      // JSON serializer (should not be called for custom type)
      class TestJsonSerializer implements IResponseSerializer {
        canSerialize(_result: any): boolean {
          return true;
        }

        serialize(
          result: any,
          statusCode: number,
          _request: Request,
          _next?: SerializerNext,
        ): SerializedResponseDTO {
          jsonCalled = true;
          return {
            body: result,
            statusCode,
            headers: { 'Content-Type': 'application/json' },
          };
        }
      }

      registry.register(new CustomSerializer(), 'Custom', { priority: 50 });
      registry.register(new TestJsonSerializer(), 'Json', { priority: 999 });

      const customResult = { type: 'custom', data: 'test' };
      const dto = await handler.serialize(customResult, 200);

      expect(customCalled).toBe(true);
      expect(jsonCalled).toBe(false); // Should not be called
      expect(dto.body.handled).toBe('by-custom');
    });
  });

  describe('Priority System', () => {
    it('should execute serializers in priority order', async () => {
      const executionOrder: string[] = [];

      class PrioritySerializer implements IResponseSerializer {
        constructor(private name: string, private priority: number) {}

        canSerialize(_result: any): boolean {
          return true;
        }

        serialize(
          result: any,
          statusCode: number,
          request: Request,
          next?: SerializerNext,
        ): SerializedResponseDTO | null {
          executionOrder.push(this.name);

          if (next) {
            return next(result, statusCode, request);
          }

          return {
            body: result,
            statusCode,
            headers: { 'Content-Type': 'application/json' },
          };
        }
      }

      // Register in non-priority order
      registry.register(new PrioritySerializer('Third', 300), 'Third', { priority: 300 });
      registry.register(new PrioritySerializer('First', 100), 'First', { priority: 100 });
      registry.register(new PrioritySerializer('Second', 200), 'Second', { priority: 200 });

      const result = { test: 'data' };
      const request = new Request('http://localhost');
      
      // Serialize - should execute in priority order via chain
      await handler.serialize(result, 200);

      // Verify execution order matches priority (lower number = higher priority)
      // Note: All serializers in chain are called via next(), so we see all of them
      expect(executionOrder).toContain('First');
      expect(executionOrder).toContain('Second');
      expect(executionOrder).toContain('Third');
      // First should be called first
      expect(executionOrder[0]).toBe('First');
    });

    it('should respect default priorities for built-in serializers', () => {

      registry.register(new CustomResponseSerializer(), 'CustomResponse');
      registry.register(new RedirectSerializer(), 'Redirect');
      registry.register(new JsonSerializer(), 'Json', { contentTypes: ['application/json'] });

      const serializers = registry.getAll();
      const names = serializers.map((s) => s.constructor.name);

      // CustomResponse should be first (priority 10)
      expect(names[0]).toBe('CustomResponseSerializer');
      // Json should be last (priority 999)
      expect(names[names.length - 1]).toBe('JsonSerializer');
    });
  });

  describe('Helper Methods', () => {
    it('should register serializer before target', () => {

      class BeforeSerializer implements IResponseSerializer {
        canSerialize(_result: any): boolean {
          return true;
        }

        serialize(
          result: any,
          statusCode: number,
          _request: Request,
          _next?: SerializerNext,
        ): SerializedResponseDTO {
          return {
            body: result,
            statusCode,
            headers: { 'Content-Type': 'application/before' },
          };
        }
      }

      registry.register(new JsonSerializer(), 'Json', {
        contentTypes: ['application/json'],
        priority: 999,
      });

      registry.registerBefore('Json', new BeforeSerializer(), 'Before');

      const serializers = registry.getAll();
      const jsonIndex = serializers.findIndex((s) => s.constructor.name === 'JsonSerializer');
      const beforeIndex = serializers.findIndex((s) => s.constructor.name === 'BeforeSerializer');

      // BeforeSerializer should be before JsonSerializer
      expect(beforeIndex).toBeLessThan(jsonIndex);
    });

    it('should register serializer after target', () => {

      class AfterSerializer implements IResponseSerializer {
        canSerialize(_result: any): boolean {
          return true;
        }

        serialize(
          result: any,
          statusCode: number,
          _request: Request,
          _next?: SerializerNext,
        ): SerializedResponseDTO {
          return {
            body: result,
            statusCode,
            headers: { 'Content-Type': 'application/after' },
          };
        }
      }

      registry.register(new CustomResponseSerializer(), 'CustomResponse', { priority: 10 });

      registry.registerAfter('CustomResponse', new AfterSerializer(), 'After');

      const serializers = registry.getAll();
      const customIndex = serializers.findIndex(
        (s) => s.constructor.name === 'CustomResponseSerializer',
      );
      const afterIndex = serializers.findIndex((s) => s.constructor.name === 'AfterSerializer');

      // AfterSerializer should be after CustomResponseSerializer
      expect(afterIndex).toBeGreaterThan(customIndex);
    });

    it('should register serializer with highest priority (first)', () => {

      class FirstSerializer implements IResponseSerializer {
        canSerialize(_result: any): boolean {
          return true;
        }

        serialize(
          result: any,
          statusCode: number,
          _request: Request,
          _next?: SerializerNext,
        ): SerializedResponseDTO {
          return {
            body: result,
            statusCode,
            headers: { 'Content-Type': 'application/first' },
          };
        }
      }

      registry.register(new CustomResponseSerializer(), 'CustomResponse', { priority: 10 });

      registry.registerFirst(new FirstSerializer(), 'First');

      const serializers = registry.getAll();

      // FirstSerializer should be first in the array
      expect(serializers[0].constructor.name).toBe('FirstSerializer');
    });

    it('should throw error if target serializer not found in registerBefore', () => {
      class TestSerializer implements IResponseSerializer {
        canSerialize(_result: any): boolean {
          return true;
        }

        serialize(
          result: any,
          statusCode: number,
          _request: Request,
          _next?: SerializerNext,
        ): SerializedResponseDTO {
          return {
            body: result,
            statusCode,
            headers: {},
          };
        }
      }

      expect(() => {
        registry.registerBefore('NonExistent', new TestSerializer());
      }).toThrow('Target serializer "NonExistent" not found');
    });

    it('should throw error if target serializer not found in registerAfter', () => {
      class TestSerializer implements IResponseSerializer {
        canSerialize(_result: any): boolean {
          return true;
        }

        serialize(
          result: any,
          statusCode: number,
          _request: Request,
          _next?: SerializerNext,
        ): SerializedResponseDTO {
          return {
            body: result,
            statusCode,
            headers: {},
          };
        }
      }

      expect(() => {
        registry.registerAfter('NonExistent', new TestSerializer());
      }).toThrow('Target serializer "NonExistent" not found');
    });
  });

  describe('Real-world Use Cases', () => {
    it('should implement OpenTelemetry decorator pattern', async () => {
      let telemetryCalled = false;
      let traceId: string | undefined;

      // OpenTelemetry decorator serializer
      class OpenTelemetrySerializer implements IResponseSerializer {
        canSerialize(_result: any): boolean {
          return true; // Intercepts all responses
        }

        serialize(
          result: any,
          statusCode: number,
          request: Request,
          next?: SerializerNext,
        ): SerializedResponseDTO | null {
          telemetryCalled = true;
          traceId = `trace-${Date.now()}`;

          if (next) {
            const dto = next(result, statusCode, request);
            if (dto) {
              // Add OpenTelemetry headers
              return {
                ...dto,
                headers: {
                  ...dto.headers,
                  'X-Trace-ID': traceId,
                  'X-Span-ID': `span-${Date.now()}`,
                },
              };
            }
          }

          return null;
        }
      }

      // JSON serializer
      class TestJsonSerializer implements IResponseSerializer {
        canSerialize(result: any): boolean {
          return typeof result === 'object';
        }

        serialize(
          result: any,
          statusCode: number,
          _request: Request,
          _next?: SerializerNext,
        ): SerializedResponseDTO {
          return {
            body: result,
            statusCode,
            headers: { 'Content-Type': 'application/json' },
          };
        }
      }

      registry.registerFirst(new OpenTelemetrySerializer(), 'OpenTelemetry');
      registry.register(new TestJsonSerializer(), 'Json', { priority: 999 });

      const result = { users: [{ id: 1, name: 'Test' }] };
      const dto = await handler.serialize(result, 200);

      expect(telemetryCalled).toBe(true);
      expect(dto.headers['X-Trace-ID']).toBeDefined();
      expect(dto.headers['X-Span-ID']).toBeDefined();
      expect(dto.body).toEqual(result);
    });

    it('should implement response compression decorator', async () => {
      let compressionCalled = false;
      let jsonCalled = false;

      // Compression serializer (decorator)
      class CompressionSerializer implements IResponseSerializer {
        canSerialize(_result: any): boolean {
          return true;
        }

        serialize(
          result: any,
          statusCode: number,
          request: Request,
          next?: SerializerNext,
        ): SerializedResponseDTO | null {
          compressionCalled = true;

          // Delegate to next serializer
          if (next) {
            const dto = next(result, statusCode, request);
            if (dto) {
              // Add compression header (simplified - real implementation would compress body)
              return {
                ...dto,
                headers: {
                  ...dto.headers,
                  'Content-Encoding': 'gzip',
                },
              };
            }
          }

          return null;
        }
      }

      class TestJsonSerializer implements IResponseSerializer {
        canSerialize(result: any): boolean {
          return typeof result === 'object';
        }

        serialize(
          result: any,
          statusCode: number,
          _request: Request,
          _next?: SerializerNext,
        ): SerializedResponseDTO {
          jsonCalled = true;
          return {
            body: result,
            statusCode,
            headers: { 'Content-Type': 'application/json' },
          };
        }
      }

      registry.registerFirst(new CompressionSerializer(), 'Compression');
      registry.register(new TestJsonSerializer(), 'Json', { priority: 999 });

      const result = { data: 'test' };
      const dto = await handler.serialize(result, 200, 'application/json');

      // Verify compression serializer was called first
      expect(compressionCalled).toBe(true);
      // Verify JSON serializer was called via next()
      expect(jsonCalled).toBe(true);
      // Verify compression header was added
      expect(dto.headers['Content-Encoding']).toBe('gzip');
      expect(dto.body).toEqual(result);
    });
  });
});

