/**
 * Integration Tests for LambdaHandler with SQS, S3, and EventBridge Adapters
 *
 * Tests that LambdaHandler correctly detects and delegates to the new adapters
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { lambdaAdapterFactory } from '../../../src/lambda/adapters/LambdaAdapterFactory';
import { LambdaHandler } from '../../../src/lambda/handlers/LambdaHandler';
import type { EventBridgeEvent, S3Event, SQSEvent } from '../../../src/lambda/types';

describe('LambdaHandler - New Adapters Integration', () => {
  let handler: LambdaHandler;

  beforeEach(() => {
    handler = new LambdaHandler();
  });

  afterEach(() => {
    // Clean up factory after each test
    lambdaAdapterFactory.clear();
  });

  describe('SQS Adapter Integration', () => {
    it('should detect SQS event type', () => {
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

      const eventType = handler['detectEventType'](event);
      expect(eventType).toBe('sqs');
    });

    it('should handle SQS event', async () => {
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

      const response = await handler.handler(event);
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.processed).toBe(1);
    });
  });

  describe('S3 Adapter Integration', () => {
    it('should detect S3 event type', () => {
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

      const eventType = handler['detectEventType'](event);
      expect(eventType).toBe('s3');
    });

    it('should handle S3 event', async () => {
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

      const response = await handler.handler(event);
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.processed).toBe(1);
    });
  });

  describe('EventBridge Adapter Integration', () => {
    it('should detect EventBridge event type', () => {
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

      const eventType = handler['detectEventType'](event);
      expect(eventType).toBe('eventbridge');
    });

    it('should handle EventBridge event', async () => {
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

      const response = await handler.handler(event);
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.source).toBe('aws.events');
      expect(body.detailType).toBe('Test Event');
    });
  });

  describe('Event Type Detection', () => {
    it('should correctly distinguish between different event types', () => {
      const sqsEvent: SQSEvent = {
        Records: [
          {
            messageId: 'test-id',
            receiptHandle: 'test-handle',
            body: '{}',
            attributes: {},
            messageAttributes: {},
            md5OfBody: 'test-md5',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
            awsRegion: 'us-east-1',
          },
        ],
      };

      const s3Event: S3Event = {
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

      const eventBridgeEvent: EventBridgeEvent = {
        version: '0',
        id: 'test-id',
        'detail-type': 'Test Event',
        source: 'aws.events',
        account: '123456789012',
        time: '2024-01-01T00:00:00Z',
        region: 'us-east-1',
        resources: [],
        detail: {},
      };

      expect(handler['detectEventType'](sqsEvent)).toBe('sqs');
      expect(handler['detectEventType'](s3Event)).toBe('s3');
      expect(handler['detectEventType'](eventBridgeEvent)).toBe('eventbridge');
    });
  });
});
