/**
 * Tests for SyntroJS Lambda Configuration
 *
 * Tests lambdaAdapters configuration in SyntroJS
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { SyntroJS } from '../../../src/core/SyntroJS';
import { RouteRegistry } from '../../../src/application/RouteRegistry';
import type { SQSEvent } from '../../../src/lambda/types';

describe('SyntroJS - Lambda Configuration', () => {
  beforeEach(() => {
    RouteRegistry.clear();
  });

  describe('lambdaAdapters configuration', () => {
    it('should create SyntroJS with lambda adapter configuration', () => {
      const app = new SyntroJS({
        rest: false,
        lambdaAdapters: {
          sqs: {
            handler: async (message) => {
              return { processed: message.messageId, custom: true };
            },
          },
        },
      });

      expect(app).toBeDefined();
      const handler = app.handler();
      expect(handler).toBeDefined();
    });

    it('should process SQS events with custom handler', async () => {
      const app = new SyntroJS({
        rest: false,
        lambdaAdapters: {
          sqs: {
            handler: async (message) => {
              return { processed: message.messageId, custom: true };
            },
          },
        },
      });

      const handler = app.handler();

      const sqsEvent: SQSEvent = {
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

      const response = await handler(sqsEvent);
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.processed).toBe(1);
      expect(body.results[0].custom).toBe(true);
    });

    it('should allow partial adapter configuration', () => {
      const app = new SyntroJS({
        rest: false,
        lambdaAdapters: {
          sqs: {
            handler: async (message) => ({ processed: message.messageId }),
          },
          // s3 and eventbridge use defaults
        },
      });

      expect(app).toBeDefined();
      const handler = app.handler();
      expect(handler).toBeDefined();
    });

    it('should work without lambdaAdapters configuration', () => {
      const app = new SyntroJS({
        rest: false,
      });

      expect(app).toBeDefined();
      const handler = app.handler();
      expect(handler).toBeDefined();
    });
  });
});

