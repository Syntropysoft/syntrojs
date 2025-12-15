/**
 * Unit Tests for LambdaAdapterFactory
 *
 * Tests the factory in isolation, demonstrating how adapters can be
 * registered and managed independently
 *
 * Principles Applied:
 * - SOLID: Single Responsibility, Open/Closed, Dependency Inversion
 * - DDD: Domain Services
 * - Functional: Pure functions, Immutability
 * - Guard Clauses: Early validation, Fail Fast
 */

import { beforeEach, describe, expect, it } from 'vitest';
import type { ILambdaAdapter } from '../../../src/domain/interfaces/ILambdaAdapter';
import { LambdaAdapterFactory } from '../../../src/lambda/adapters/LambdaAdapterFactory';
import type { LambdaResponse } from '../../../src/lambda/types';

// Mock adapter for testing
class MockAdapter implements ILambdaAdapter {
  constructor(private eventType: string) {}

  getEventType(): string {
    return this.eventType;
  }

  canHandle(event: unknown): boolean {
    if (typeof event !== 'object' || event === null) return false;
    const e = event as Record<string, unknown>;
    return e.type === this.eventType;
  }

  async handle(event: unknown): Promise<LambdaResponse> {
    return {
      statusCode: 200,
      body: JSON.stringify({ handled: true }),
      headers: { 'Content-Type': 'application/json' },
    };
  }
}

describe('LambdaAdapterFactory - Unit Tests', () => {
  let factory: LambdaAdapterFactory;

  beforeEach(() => {
    factory = new LambdaAdapterFactory();
  });

  describe('register - Guard Clauses', () => {
    it('should throw error for null adapter', () => {
      expect(() => factory.register('api-gateway', null as any)).toThrow('Adapter is required');
    });

    it('should throw error for adapter missing getEventType', () => {
      const invalidAdapter = {
        canHandle: () => true,
        handle: async () => ({ statusCode: 200, body: '' }),
      } as any;

      expect(() => factory.register('api-gateway', invalidAdapter)).toThrow(
        'Adapter must implement ILambdaAdapter interface',
      );
    });

    it('should throw error for adapter missing canHandle', () => {
      const invalidAdapter = {
        getEventType: () => 'api-gateway',
        handle: async () => ({ statusCode: 200, body: '' }),
      } as any;

      expect(() => factory.register('api-gateway', invalidAdapter)).toThrow(
        'Adapter must implement canHandle method',
      );
    });

    it('should throw error for adapter missing handle', () => {
      const invalidAdapter = {
        getEventType: () => 'api-gateway',
        canHandle: () => true,
      } as any;

      expect(() => factory.register('api-gateway', invalidAdapter)).toThrow(
        'Adapter must implement handle method',
      );
    });

    it('should throw error when event type does not match adapter', () => {
      const adapter = new MockAdapter('api-gateway');
      expect(() => factory.register('sqs', adapter)).toThrow(
        'Adapter event type (api-gateway) does not match registration type (sqs)',
      );
    });

    it('should throw error for duplicate registration', () => {
      const adapter1 = new MockAdapter('api-gateway');
      const adapter2 = new MockAdapter('api-gateway');

      factory.register('api-gateway', adapter1);
      expect(() => factory.register('api-gateway', adapter2)).toThrow(
        "Adapter for event type 'api-gateway' is already registered",
      );
    });
  });

  describe('register - Happy Path', () => {
    it('should register adapter successfully', () => {
      const adapter = new MockAdapter('api-gateway');
      expect(() => factory.register('api-gateway', adapter)).not.toThrow();
      expect(factory.has('api-gateway')).toBe(true);
    });

    it('should register multiple adapters', () => {
      const adapter1 = new MockAdapter('api-gateway');
      const adapter2 = new MockAdapter('sqs');

      factory.register('api-gateway', adapter1);
      factory.register('sqs', adapter2);

      expect(factory.has('api-gateway')).toBe(true);
      expect(factory.has('sqs')).toBe(true);
    });
  });

  describe('get - Pure Function', () => {
    it('should return adapter if registered', () => {
      const adapter = new MockAdapter('api-gateway');
      factory.register('api-gateway', adapter);

      const retrieved = factory.get('api-gateway');
      expect(retrieved).toBe(adapter);
    });

    it('should return undefined if not registered', () => {
      expect(factory.get('api-gateway')).toBeUndefined();
    });

    it('should return undefined for null event type', () => {
      expect(factory.get(null as any)).toBeUndefined();
    });
  });

  describe('findAdapter - Pure Function', () => {
    it('should find adapter that can handle event', () => {
      const adapter = new MockAdapter('api-gateway');
      factory.register('api-gateway', adapter);

      const event = { type: 'api-gateway' };
      const found = factory.findAdapter(event);

      expect(found).toBe(adapter);
    });

    it('should return undefined if no adapter can handle event', () => {
      const adapter = new MockAdapter('api-gateway');
      factory.register('api-gateway', adapter);

      const event = { type: 'unknown' };
      const found = factory.findAdapter(event);

      expect(found).toBeUndefined();
    });

    it('should return undefined for null event', () => {
      expect(factory.findAdapter(null)).toBeUndefined();
    });

    it('should return undefined for non-object event', () => {
      expect(factory.findAdapter('string')).toBeUndefined();
      expect(factory.findAdapter(123)).toBeUndefined();
    });
  });

  describe('getAll - Pure Function', () => {
    it('should return all registered adapters', () => {
      const adapter1 = new MockAdapter('api-gateway');
      const adapter2 = new MockAdapter('sqs');

      factory.register('api-gateway', adapter1);
      factory.register('sqs', adapter2);

      const all = factory.getAll();
      expect(all.length).toBe(2);
      expect(all).toContain(adapter1);
      expect(all).toContain(adapter2);
    });

    it('should return empty array if no adapters registered', () => {
      const all = factory.getAll();
      expect(all.length).toBe(0);
    });
  });

  describe('getEventTypes - Pure Function', () => {
    it('should return all registered event types', () => {
      factory.register('api-gateway', new MockAdapter('api-gateway'));
      factory.register('sqs', new MockAdapter('sqs'));

      const types = factory.getEventTypes();
      expect(types.length).toBe(2);
      expect(types).toContain('api-gateway');
      expect(types).toContain('sqs');
    });
  });

  describe('has - Pure Function', () => {
    it('should return true if adapter is registered', () => {
      factory.register('api-gateway', new MockAdapter('api-gateway'));
      expect(factory.has('api-gateway')).toBe(true);
    });

    it('should return false if adapter is not registered', () => {
      expect(factory.has('api-gateway')).toBe(false);
    });

    it('should return false for null event type', () => {
      expect(factory.has(null as any)).toBe(false);
    });
  });

  describe('clear - Utility', () => {
    it('should clear all registered adapters', () => {
      factory.register('api-gateway', new MockAdapter('api-gateway'));
      factory.register('sqs', new MockAdapter('sqs'));

      expect(factory.getAll().length).toBe(2);

      factory.clear();

      expect(factory.getAll().length).toBe(0);
      expect(factory.has('api-gateway')).toBe(false);
      expect(factory.has('sqs')).toBe(false);
    });
  });
});
