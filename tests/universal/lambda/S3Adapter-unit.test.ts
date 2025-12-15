/**
 * Unit Tests for S3Adapter
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
import { S3Adapter } from '../../../src/lambda/adapters/S3Adapter';
import type { S3Event } from '../../../src/lambda/types';

describe('S3Adapter - Unit Tests (Isolated)', () => {
  let adapter: S3Adapter;

  beforeEach(() => {
    adapter = new S3Adapter();
  });

  describe('ILambdaAdapter Interface Implementation', () => {
    it('should implement ILambdaAdapter interface', () => {
      expect(adapter).toBeInstanceOf(S3Adapter);
      expect(adapter).toHaveProperty('getEventType');
      expect(adapter).toHaveProperty('canHandle');
      expect(adapter).toHaveProperty('handle');
    });

    it('should return correct event type', () => {
      const eventType = adapter.getEventType();
      expect(eventType).toBe('s3');
    });

    it('should correctly identify S3 events', () => {
      const validEvent: S3Event = {
        Records: [
          {
            eventVersion: '2.1',
            eventSource: 'aws:s3',
            awsRegion: 'us-east-1',
            eventTime: '2024-01-01T00:00:00.000Z',
            eventName: 'ObjectCreated:Put',
            userIdentity: {
              principalId: 'test-principal',
            },
            requestParameters: {
              sourceIPAddress: '127.0.0.1',
            },
            responseElements: {},
            s3: {
              s3SchemaVersion: '1.0',
              configurationId: 'test-config',
              bucket: {
                name: 'test-bucket',
                ownerIdentity: {
                  principalId: 'test-owner',
                },
                arn: 'arn:aws:s3:::test-bucket',
              },
              object: {
                key: 'test-key',
                size: 1024,
                eTag: 'test-etag',
                sequencer: 'test-sequencer',
              },
            },
          },
        ],
      };

      expect(adapter.canHandle(validEvent)).toBe(true);
    });

    it('should reject non-S3 events', () => {
      const invalidEvent = {
        Records: [
          {
            eventSource: 'aws:sqs',
            body: '{}',
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
    it('should process S3 event without handler', async () => {
      const event: S3Event = {
        Records: [
          {
            eventVersion: '2.1',
            eventSource: 'aws:s3',
            awsRegion: 'us-east-1',
            eventTime: '2024-01-01T00:00:00.000Z',
            eventName: 'ObjectCreated:Put',
            userIdentity: {
              principalId: 'test-principal',
            },
            requestParameters: {
              sourceIPAddress: '127.0.0.1',
            },
            responseElements: {},
            s3: {
              s3SchemaVersion: '1.0',
              configurationId: 'test-config',
              bucket: {
                name: 'test-bucket',
                ownerIdentity: {
                  principalId: 'test-owner',
                },
                arn: 'arn:aws:s3:::test-bucket',
              },
              object: {
                key: 'test-key',
                size: 1024,
                eTag: 'test-etag',
                sequencer: 'test-sequencer',
              },
            },
          },
        ],
      };

      const response = await adapter.handle(event);
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.processed).toBe(1);
      expect(body.results).toHaveLength(1);
      expect(body.results[0].bucket).toBe('test-bucket');
      expect(body.results[0].key).toBe('test-key');
    });

    it('should process S3 event with custom handler', async () => {
      const handler = async (object: any) => {
        return { processed: object.bucket, key: object.key };
      };

      const adapterWithHandler = new S3Adapter({ handler });

      const event: S3Event = {
        Records: [
          {
            eventVersion: '2.1',
            eventSource: 'aws:s3',
            awsRegion: 'us-east-1',
            eventTime: '2024-01-01T00:00:00.000Z',
            eventName: 'ObjectCreated:Put',
            userIdentity: {
              principalId: 'test-principal',
            },
            requestParameters: {
              sourceIPAddress: '127.0.0.1',
            },
            responseElements: {},
            s3: {
              s3SchemaVersion: '1.0',
              configurationId: 'test-config',
              bucket: {
                name: 'test-bucket',
                ownerIdentity: {
                  principalId: 'test-owner',
                },
                arn: 'arn:aws:s3:::test-bucket',
              },
              object: {
                key: 'test-key',
                size: 1024,
                eTag: 'test-etag',
                sequencer: 'test-sequencer',
              },
            },
          },
        ],
      };

      const response = await adapterWithHandler.handle(event);
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.processed).toBe(1);
      expect(body.results[0].processed).toBe('test-bucket');
    });

    it('should handle multiple S3 objects', async () => {
      const event: S3Event = {
        Records: [
          {
            eventVersion: '2.1',
            eventSource: 'aws:s3',
            awsRegion: 'us-east-1',
            eventTime: '2024-01-01T00:00:00.000Z',
            eventName: 'ObjectCreated:Put',
            userIdentity: {
              principalId: 'test-principal',
            },
            requestParameters: {
              sourceIPAddress: '127.0.0.1',
            },
            responseElements: {},
            s3: {
              s3SchemaVersion: '1.0',
              configurationId: 'test-config',
              bucket: {
                name: 'test-bucket',
                ownerIdentity: {
                  principalId: 'test-owner',
                },
                arn: 'arn:aws:s3:::test-bucket',
              },
              object: {
                key: 'key-1',
                size: 1024,
                eTag: 'etag-1',
                sequencer: 'seq-1',
              },
            },
          },
          {
            eventVersion: '2.1',
            eventSource: 'aws:s3',
            awsRegion: 'us-east-1',
            eventTime: '2024-01-01T00:00:00.000Z',
            eventName: 'ObjectCreated:Put',
            userIdentity: {
              principalId: 'test-principal',
            },
            requestParameters: {
              sourceIPAddress: '127.0.0.1',
            },
            responseElements: {},
            s3: {
              s3SchemaVersion: '1.0',
              configurationId: 'test-config',
              bucket: {
                name: 'test-bucket',
                ownerIdentity: {
                  principalId: 'test-owner',
                },
                arn: 'arn:aws:s3:::test-bucket',
              },
              object: {
                key: 'key-2',
                size: 2048,
                eTag: 'etag-2',
                sequencer: 'seq-2',
              },
            },
          },
        ],
      };

      const response = await adapter.handle(event);
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.processed).toBe(2);
      expect(body.results).toHaveLength(2);
    });

    it('should decode URL-encoded keys', async () => {
      const event: S3Event = {
        Records: [
          {
            eventVersion: '2.1',
            eventSource: 'aws:s3',
            awsRegion: 'us-east-1',
            eventTime: '2024-01-01T00:00:00.000Z',
            eventName: 'ObjectCreated:Put',
            userIdentity: {
              principalId: 'test-principal',
            },
            requestParameters: {
              sourceIPAddress: '127.0.0.1',
            },
            responseElements: {},
            s3: {
              s3SchemaVersion: '1.0',
              configurationId: 'test-config',
              bucket: {
                name: 'test-bucket',
                ownerIdentity: {
                  principalId: 'test-owner',
                },
                arn: 'arn:aws:s3:::test-bucket',
              },
              object: {
                key: 'test%2Fpath%2Ffile.txt',
                size: 1024,
                eTag: 'test-etag',
                sequencer: 'test-sequencer',
              },
            },
          },
        ],
      };

      const handler = async (object: any) => {
        expect(object.key).toBe('test/path/file.txt');
        return object;
      };

      const adapterWithHandler = new S3Adapter({ handler });
      const response = await adapterWithHandler.handle(event);
      expect(response.statusCode).toBe(200);
    });

    it('should reject empty Records array in canHandle', () => {
      const event: S3Event = {
        Records: [],
      };

      // Empty Records array should not pass canHandle
      expect(adapter.canHandle(event)).toBe(false);
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

      const adapterWithHandler = new S3Adapter({ handler });

      const event: S3Event = {
        Records: [
          {
            eventVersion: '2.1',
            eventSource: 'aws:s3',
            awsRegion: 'us-east-1',
            eventTime: '2024-01-01T00:00:00.000Z',
            eventName: 'ObjectCreated:Put',
            userIdentity: {
              principalId: 'test-principal',
            },
            requestParameters: {
              sourceIPAddress: '127.0.0.1',
            },
            responseElements: {},
            s3: {
              s3SchemaVersion: '1.0',
              configurationId: 'test-config',
              bucket: {
                name: 'test-bucket',
                ownerIdentity: {
                  principalId: 'test-owner',
                },
                arn: 'arn:aws:s3:::test-bucket',
              },
              object: {
                key: 'test-key',
                size: 1024,
                eTag: 'test-etag',
                sequencer: 'test-sequencer',
              },
            },
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
      const adapterWithHandler = new S3Adapter({ handler });
      expect(adapterWithHandler).toBeInstanceOf(S3Adapter);
    });
  });
});
