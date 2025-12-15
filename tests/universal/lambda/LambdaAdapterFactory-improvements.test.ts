/**
 * Tests for LambdaAdapterFactory Improvements
 *
 * Tests new methods: replace(), registerOrReplace(), getAdapterConfig(), hasCustomHandler()
 * and createLambdaAdapterFactory()
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { EventBridgeAdapter } from '../../../src/lambda/adapters/EventBridgeAdapter';
import {
  createLambdaAdapterFactory,
  LambdaAdapterFactory,
  lambdaAdapterFactory,
} from '../../../src/lambda/adapters/LambdaAdapterFactory';
import { S3Adapter } from '../../../src/lambda/adapters/S3Adapter';
import { SQSAdapter } from '../../../src/lambda/adapters/SQSAdapter';
import type { SQSEvent } from '../../../src/lambda/types';

describe('LambdaAdapterFactory - Improvements', () => {
  let factory: LambdaAdapterFactory;

  beforeEach(() => {
    factory = createLambdaAdapterFactory();
  });

  describe('replace() method', () => {
    it('should replace an existing adapter', () => {
      const adapter1 = new SQSAdapter();
      const adapter2 = new SQSAdapter({
        handler: async (message) => ({ processed: message.messageId }),
      });

      factory.register('sqs', adapter1);
      expect(factory.has('sqs')).toBe(true);

      factory.replace('sqs', adapter2);
      const replacedAdapter = factory.get('sqs');
      expect(replacedAdapter).toBe(adapter2);
      expect((replacedAdapter as SQSAdapter).hasHandler()).toBe(true);
    });

    it('should throw error if adapter is not registered', () => {
      const adapter = new SQSAdapter();

      expect(() => {
        factory.replace('sqs', adapter);
      }).toThrow("Adapter for event type 'sqs' is not registered");
    });

    it('should validate adapter before replacing', () => {
      factory.register('sqs', new SQSAdapter());

      expect(() => {
        factory.replace('sqs', null as any);
      }).toThrow('Adapter is required');

      expect(() => {
        factory.replace('sqs', {} as any);
      }).toThrow('Adapter must implement ILambdaAdapter interface');
    });
  });

  describe('registerOrReplace() method', () => {
    it('should register adapter if not exists', () => {
      const adapter = new SQSAdapter();

      factory.registerOrReplace('sqs', adapter);
      expect(factory.has('sqs')).toBe(true);
      expect(factory.get('sqs')).toBe(adapter);
    });

    it('should replace adapter if already exists', () => {
      const adapter1 = new SQSAdapter();
      const adapter2 = new SQSAdapter({
        handler: async (message) => ({ processed: message.messageId }),
      });

      factory.register('sqs', adapter1);
      factory.registerOrReplace('sqs', adapter2);

      const replacedAdapter = factory.get('sqs');
      expect(replacedAdapter).toBe(adapter2);
      expect((replacedAdapter as SQSAdapter).hasHandler()).toBe(true);
    });

    it('should validate adapter before registering or replacing', () => {
      expect(() => {
        factory.registerOrReplace('sqs', null as any);
      }).toThrow('Adapter is required');

      expect(() => {
        factory.registerOrReplace('sqs', {} as any);
      }).toThrow('Adapter must implement ILambdaAdapter interface');
    });
  });

  describe('getAdapterConfig() method', () => {
    it('should return adapter configuration if available', () => {
      const adapter = new SQSAdapter({
        handler: async (message) => ({ processed: message.messageId }),
        batchProcessing: true,
      });

      factory.register('sqs', adapter);
      const config = factory.getAdapterConfig('sqs');

      expect(config).toBeDefined();
      expect((config as any).handler).toBeDefined();
      expect((config as any).batchProcessing).toBe(true);
    });

    it('should return undefined if adapter is not registered', () => {
      const config = factory.getAdapterConfig('sqs');
      expect(config).toBeUndefined();
    });

    it('should return undefined if adapter does not have getConfig method', () => {
      // Create a mock adapter without getConfig
      const mockAdapter = {
        getEventType: () => 'test',
        canHandle: () => false,
        handle: async () => ({ statusCode: 200, body: '' }),
      };

      factory.register('test' as any, mockAdapter as any);
      const config = factory.getAdapterConfig('test' as any);
      expect(config).toBeUndefined();
    });
  });

  describe('hasCustomHandler() method', () => {
    it('should return true if adapter has custom handler', () => {
      const adapter = new SQSAdapter({
        handler: async (message) => ({ processed: message.messageId }),
      });

      factory.register('sqs', adapter);
      expect(factory.hasCustomHandler('sqs')).toBe(true);
    });

    it('should return false if adapter does not have custom handler', () => {
      const adapter = new SQSAdapter();

      factory.register('sqs', adapter);
      expect(factory.hasCustomHandler('sqs')).toBe(false);
    });

    it('should return false if adapter is not registered', () => {
      expect(factory.hasCustomHandler('sqs')).toBe(false);
    });

    it('should return false if adapter does not have hasHandler method', () => {
      // Create a mock adapter without hasHandler
      const mockAdapter = {
        getEventType: () => 'test',
        canHandle: () => false,
        handle: async () => ({ statusCode: 200, body: '' }),
      };

      factory.register('test' as any, mockAdapter as any);
      expect(factory.hasCustomHandler('test' as any)).toBe(false);
    });
  });

  describe('createLambdaAdapterFactory() function', () => {
    it('should create a new factory instance', () => {
      const factory1 = createLambdaAdapterFactory();
      const factory2 = createLambdaAdapterFactory();

      expect(factory1).not.toBe(factory2);
      expect(factory1).toBeInstanceOf(LambdaAdapterFactory);
      expect(factory2).toBeInstanceOf(LambdaAdapterFactory);
    });

    it('should create isolated factory instances', () => {
      const factory1 = createLambdaAdapterFactory();
      const factory2 = createLambdaAdapterFactory();

      const adapter1 = new SQSAdapter();
      const adapter2 = new S3Adapter();

      factory1.register('sqs', adapter1);
      factory2.register('s3', adapter2);

      expect(factory1.has('sqs')).toBe(true);
      expect(factory1.has('s3')).toBe(false);

      expect(factory2.has('sqs')).toBe(false);
      expect(factory2.has('s3')).toBe(true);
    });

    it('should not affect singleton factory', () => {
      const customFactory = createLambdaAdapterFactory();
      const adapter = new SQSAdapter();

      customFactory.register('sqs', adapter);

      expect(customFactory.has('sqs')).toBe(true);
      expect(lambdaAdapterFactory.has('sqs')).toBe(false);
    });
  });

  describe('Integration: Replace adapter workflow', () => {
    it('should allow replacing adapter with custom handler', () => {
      // Register default adapter
      const defaultAdapter = new SQSAdapter();
      factory.register('sqs', defaultAdapter);
      expect(factory.hasCustomHandler('sqs')).toBe(false);

      // Replace with custom handler
      const customAdapter = new SQSAdapter({
        handler: async (message) => {
          return { processed: message.messageId, custom: true };
        },
      });
      factory.replace('sqs', customAdapter);

      expect(factory.hasCustomHandler('sqs')).toBe(true);
      const config = factory.getAdapterConfig('sqs');
      expect((config as any).handler).toBeDefined();
    });

    it('should allow using registerOrReplace for simpler workflow', () => {
      // First registration
      const adapter1 = new SQSAdapter();
      factory.registerOrReplace('sqs', adapter1);
      expect(factory.has('sqs')).toBe(true);

      // Replace without checking if exists
      const adapter2 = new SQSAdapter({
        handler: async (message) => ({ processed: message.messageId }),
      });
      factory.registerOrReplace('sqs', adapter2);
      expect(factory.hasCustomHandler('sqs')).toBe(true);
    });
  });
});
