/**
 * Unit Tests for EventBridgeAdapter
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

import { beforeEach, describe, expect, it } from 'vitest';
import type { ILambdaAdapter } from '../../../src/domain/interfaces/ILambdaAdapter';
import { EventBridgeAdapter } from '../../../src/lambda/adapters/EventBridgeAdapter';
import type { EventBridgeEvent } from '../../../src/lambda/types';

describe('EventBridgeAdapter - Unit Tests (Isolated)', () => {
  let adapter: EventBridgeAdapter;

  beforeEach(() => {
    adapter = new EventBridgeAdapter();
  });

  describe('ILambdaAdapter Interface Implementation', () => {
    it('should implement ILambdaAdapter interface', () => {
      expect(adapter).toBeInstanceOf(EventBridgeAdapter);
      expect(adapter).toHaveProperty('getEventType');
      expect(adapter).toHaveProperty('canHandle');
      expect(adapter).toHaveProperty('handle');
    });

    it('should return correct event type', () => {
      const eventType = adapter.getEventType();
      expect(eventType).toBe('eventbridge');
    });

    it('should correctly identify EventBridge events', () => {
      const validEvent: EventBridgeEvent = {
        version: '0',
        id: 'test-id',
        'detail-type': 'Test Event',
        source: 'aws.events',
        account: '123456789012',
        time: '2024-01-01T00:00:00Z',
        region: 'us-east-1',
        resources: [],
        detail: {
          key: 'value',
        },
      };

      expect(adapter.canHandle(validEvent)).toBe(true);
    });

    it('should reject non-EventBridge events', () => {
      const invalidEvent = {
        Records: [
          {
            eventSource: 'aws:sqs',
          },
        ],
      };

      expect(adapter.canHandle(invalidEvent)).toBe(false);
      expect(adapter.canHandle(null)).toBe(false);
      expect(adapter.canHandle({})).toBe(false);
    });
  });

  describe('Event Handling', () => {
    it('should process EventBridge event without handler', async () => {
      const event: EventBridgeEvent = {
        version: '0',
        id: 'test-id',
        'detail-type': 'Test Event',
        source: 'aws.events',
        account: '123456789012',
        time: '2024-01-01T00:00:00Z',
        region: 'us-east-1',
        resources: [],
        detail: {
          key: 'value',
        },
      };

      const response = await adapter.handle(event);
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.source).toBe('aws.events');
      expect(body.detailType).toBe('Test Event');
      expect(body.detail.key).toBe('value');
    });

    it('should process EventBridge event with custom handler', async () => {
      const handler = async (event: any) => {
        return { processed: event.id, source: event.source };
      };

      const adapterWithHandler = new EventBridgeAdapter({ handler });

      const event: EventBridgeEvent = {
        version: '0',
        id: 'test-id',
        'detail-type': 'Test Event',
        source: 'aws.events',
        account: '123456789012',
        time: '2024-01-01T00:00:00Z',
        region: 'us-east-1',
        resources: [],
        detail: {
          key: 'value',
        },
      };

      const response = await adapterWithHandler.handle(event);
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.processed).toBe('test-id');
      expect(body.source).toBe('aws.events');
    });

    it('should handle EventBridge event with resources', async () => {
      const event: EventBridgeEvent = {
        version: '0',
        id: 'test-id',
        'detail-type': 'Test Event',
        source: 'aws.events',
        account: '123456789012',
        time: '2024-01-01T00:00:00Z',
        region: 'us-east-1',
        resources: ['arn:aws:lambda:us-east-1:123456789012:function:test'],
        detail: {
          key: 'value',
        },
      };

      const handler = async (e: any) => {
        expect(e.resources).toHaveLength(1);
        expect(e.resources[0]).toContain('lambda');
        return e;
      };

      const adapterWithHandler = new EventBridgeAdapter({ handler });
      const response = await adapterWithHandler.handle(event);
      expect(response.statusCode).toBe(200);
    });

    it('should handle EventBridge event with complex detail', async () => {
      const event: EventBridgeEvent = {
        version: '0',
        id: 'test-id',
        'detail-type': 'Test Event',
        source: 'aws.events',
        account: '123456789012',
        time: '2024-01-01T00:00:00Z',
        region: 'us-east-1',
        resources: [],
        detail: {
          nested: {
            object: {
              with: {
                deep: 'values',
              },
            },
          },
          array: [1, 2, 3],
          string: 'test',
          number: 123,
        },
      };

      const handler = async (e: any) => {
        expect(e.detail.nested.object.with.deep).toBe('values');
        expect(e.detail.array).toEqual([1, 2, 3]);
        return e.detail;
      };

      const adapterWithHandler = new EventBridgeAdapter({ handler });
      const response = await adapterWithHandler.handle(event);
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.nested.object.with.deep).toBe('values');
    });

    it('should handle EventBridge event with missing optional fields', async () => {
      const event: EventBridgeEvent = {
        version: '0',
        id: '',
        'detail-type': 'Test Event',
        source: 'aws.events',
        account: '',
        time: '',
        region: '',
        resources: [],
        detail: {},
      };

      const response = await adapter.handle(event);
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.source).toBe('aws.events');
    });
  });

  describe('Error Handling', () => {
    it('should throw error for invalid event in handle', async () => {
      await expect(adapter.handle(null as any)).rejects.toThrow();
      await expect(adapter.handle({} as any)).rejects.toThrow();
    });

    it('should handle handler errors gracefully', async () => {
      const handler = async () => {
        throw new Error('Handler error');
      };

      const adapterWithHandler = new EventBridgeAdapter({ handler });

      const event: EventBridgeEvent = {
        version: '0',
        id: 'test-id',
        'detail-type': 'Test Event',
        source: 'aws.events',
        account: '123456789012',
        time: '2024-01-01T00:00:00Z',
        region: 'us-east-1',
        resources: [],
        detail: {
          key: 'value',
        },
      };

      const response = await adapterWithHandler.handle(event);
      expect(response.statusCode).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Configuration', () => {
    it('should accept handler configuration', () => {
      const handler = async () => ({});
      const adapterWithHandler = new EventBridgeAdapter({ handler });
      expect(adapterWithHandler).toBeInstanceOf(EventBridgeAdapter);
    });
  });
});
