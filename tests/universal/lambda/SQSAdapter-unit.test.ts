/**
 * Unit Tests for SQSAdapter
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
import { SQSAdapter } from '../../../src/lambda/adapters/SQSAdapter';
import type { ILambdaAdapter } from '../../../src/domain/interfaces/ILambdaAdapter';
import type { SQSEvent } from '../../../src/lambda/types';

describe('SQSAdapter - Unit Tests (Isolated)', () => {
  let adapter: SQSAdapter;

  beforeEach(() => {
    adapter = new SQSAdapter();
  });

  describe('ILambdaAdapter Interface Implementation', () => {
    it('should implement ILambdaAdapter interface', () => {
      expect(adapter).toBeInstanceOf(SQSAdapter);
      expect(adapter).toHaveProperty('getEventType');
      expect(adapter).toHaveProperty('canHandle');
      expect(adapter).toHaveProperty('handle');
    });

    it('should return correct event type', () => {
      const eventType = adapter.getEventType();
      expect(eventType).toBe('sqs');
    });

    it('should correctly identify SQS events', () => {
      const validEvent: SQSEvent = {
        Records: [
          {
            messageId: 'test-id',
            receiptHandle: 'test-handle',
            body: '{"test": "data"}',
            attributes: {},
            messageAttributes: {},
            md5OfBody: 'test-md5',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
            awsRegion: 'us-east-1',
          },
        ],
      };

      expect(adapter.canHandle(validEvent)).toBe(true);
    });

    it('should reject non-SQS events', () => {
      const invalidEvent = {
        Records: [
          {
            eventSource: 'aws:s3',
            s3: { bucket: { name: 'test' } },
          },
        ],
      };

      expect(adapter.canHandle(invalidEvent)).toBe(false);
      expect(adapter.canHandle(null)).toBe(false);
      expect(adapter.canHandle({})).toBe(false);
      expect(adapter.canHandle({ Records: [] })).toBe(false);
    });
  });

  describe('Event Handling', () => {
    it('should process SQS event without handler', async () => {
      const event: SQSEvent = {
        Records: [
          {
            messageId: 'test-id',
            receiptHandle: 'test-handle',
            body: '{"test": "data"}',
            attributes: {},
            messageAttributes: {},
            md5OfBody: 'test-md5',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
            awsRegion: 'us-east-1',
          },
        ],
      };

      const response = await adapter.handle(event);
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.processed).toBe(1);
      expect(body.results).toHaveLength(1);
    });

    it('should process SQS event with custom handler', async () => {
      const handler = async (message: any) => {
        return { processed: message.messageId, data: message.body };
      };

      const adapterWithHandler = new SQSAdapter({ handler });

      const event: SQSEvent = {
        Records: [
          {
            messageId: 'test-id',
            receiptHandle: 'test-handle',
            body: '{"test": "data"}',
            attributes: {},
            messageAttributes: {},
            md5OfBody: 'test-md5',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
            awsRegion: 'us-east-1',
          },
        ],
      };

      const response = await adapterWithHandler.handle(event);
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.processed).toBe(1);
      expect(body.results[0].processed).toBe('test-id');
    });

    it('should handle multiple SQS messages', async () => {
      const event: SQSEvent = {
        Records: [
          {
            messageId: 'id-1',
            receiptHandle: 'handle-1',
            body: '{"test": "data1"}',
            attributes: {},
            messageAttributes: {},
            md5OfBody: 'md5-1',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
            awsRegion: 'us-east-1',
          },
          {
            messageId: 'id-2',
            receiptHandle: 'handle-2',
            body: '{"test": "data2"}',
            attributes: {},
            messageAttributes: {},
            md5OfBody: 'md5-2',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
            awsRegion: 'us-east-1',
          },
        ],
      };

      const response = await adapter.handle(event);
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.processed).toBe(2);
      expect(body.results).toHaveLength(2);
    });

    it('should reject empty Records array in canHandle', () => {
      const event: SQSEvent = {
        Records: [],
      };

      // Empty Records array should not pass canHandle
      expect(adapter.canHandle(event)).toBe(false);
    });

    it('should parse JSON message body', async () => {
      const event: SQSEvent = {
        Records: [
          {
            messageId: 'test-id',
            receiptHandle: 'test-handle',
            body: '{"key": "value", "number": 123}',
            attributes: {},
            messageAttributes: {},
            md5OfBody: 'test-md5',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
            awsRegion: 'us-east-1',
          },
        ],
      };

      const handler = async (message: any) => {
        expect(typeof message.body).toBe('object');
        expect(message.body.key).toBe('value');
        expect(message.body.number).toBe(123);
        return message.body;
      };

      const adapterWithHandler = new SQSAdapter({ handler });
      const response = await adapterWithHandler.handle(event);
      expect(response.statusCode).toBe(200);
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

      const adapterWithHandler = new SQSAdapter({ handler });

      const event: SQSEvent = {
        Records: [
          {
            messageId: 'test-id',
            receiptHandle: 'test-handle',
            body: '{"test": "data"}',
            attributes: {},
            messageAttributes: {},
            md5OfBody: 'test-md5',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
            awsRegion: 'us-east-1',
          },
        ],
      };

      const response = await adapterWithHandler.handle(event);
      expect(response.statusCode).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Configuration', () => {
    it('should accept handler configuration', () => {
      const handler = async () => ({});
      const adapterWithHandler = new SQSAdapter({ handler });
      expect(adapterWithHandler).toBeInstanceOf(SQSAdapter);
    });

    it('should accept batchProcessing configuration', () => {
      const adapterWithBatch = new SQSAdapter({ batchProcessing: true });
      expect(adapterWithBatch).toBeInstanceOf(SQSAdapter);
    });
  });
});

