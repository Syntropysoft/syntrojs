/**
 * Comprehensive tests for FluentAdapter.ts to increase coverage
 *
 * Principles Applied:
 * - SOLID: Single Responsibility, Open/Closed, Dependency Inversion
 * - DDD: Domain Services, Value Objects, Aggregates
 * - Functional: Pure functions, Immutability, Composition
 * - Guard Clauses: Early validation, Fail Fast
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { MiddlewareRegistry } from '../../../../src/application/MiddlewareRegistry';
import { FluentAdapter } from '../../../../src/infrastructure/FluentAdapter';

describe('FluentAdapter - Comprehensive Coverage Tests', () => {
  let adapter: FluentAdapter;

  beforeEach(() => {
    adapter = new FluentAdapter();
  });

  describe('Configuration Methods (Functional Programming)', () => {
    it('should validate boolean parameters in all with* methods', () => {
      // Test withLogger
      expect(() => adapter.withLogger('invalid' as any)).toThrow(
        'Logger enabled must be a boolean',
      );
      expect(() => adapter.withLogger(123 as any)).toThrow('Logger enabled must be a boolean');

      // Test withValidation
      expect(() => adapter.withValidation('invalid' as any)).toThrow(
        'Validation enabled must be a boolean',
      );

      // Test withErrorHandling
      expect(() => adapter.withErrorHandling('invalid' as any)).toThrow(
        'Error handling enabled must be a boolean',
      );

      // Test withDependencyInjection
      expect(() => adapter.withDependencyInjection('invalid' as any)).toThrow(
        'Dependency injection enabled must be a boolean',
      );

      // Test withBackgroundTasks
      expect(() => adapter.withBackgroundTasks('invalid' as any)).toThrow(
        'Background tasks enabled must be a boolean',
      );

      // Test withOpenAPI
      expect(() => adapter.withOpenAPI('invalid' as any)).toThrow(
        'OpenAPI enabled must be a boolean',
      );

      // Test withCompression
      expect(() => adapter.withCompression('invalid' as any)).toThrow(
        'Compression enabled must be a boolean',
      );

      // Test withCors
      expect(() => adapter.withCors('invalid' as any)).toThrow('CORS enabled must be a boolean');

      // Test withHelmet
      expect(() => adapter.withHelmet('invalid' as any)).toThrow(
        'Helmet enabled must be a boolean',
      );

      // Test withRateLimit
      expect(() => adapter.withRateLimit('invalid' as any)).toThrow(
        'Rate limit enabled must be a boolean',
      );

      // Test withMiddleware
      expect(() => adapter.withMiddleware('invalid' as any)).toThrow(
        'Middleware enabled must be a boolean',
      );
    });

    it('should return new instances for immutability', () => {
      const originalAdapter = adapter;

      const newAdapter1 = adapter.withLogger(true);
      const newAdapter2 = adapter.withValidation(false);

      // Each method should return a new instance
      expect(newAdapter1).not.toBe(originalAdapter);
      expect(newAdapter2).not.toBe(originalAdapter);
      expect(newAdapter1).not.toBe(newAdapter2);
    });

    it('should chain configuration methods', () => {
      const configuredAdapter = adapter
        .withLogger(true)
        .withValidation(false)
        .withErrorHandling(true)
        .withDependencyInjection(false)
        .withBackgroundTasks(true)
        .withOpenAPI(false)
        .withCompression(true)
        .withCors(false)
        .withHelmet(true)
        .withRateLimit(false)
        .withMiddleware(true);

      expect(configuredAdapter).toBeInstanceOf(FluentAdapter);
      expect(configuredAdapter).not.toBe(adapter);
    });
  });

  describe('Preset Methods (Functional Composition)', () => {
    it('should apply minimal preset correctly', () => {
      const minimalAdapter = adapter.minimal();

      expect(minimalAdapter).toBeInstanceOf(FluentAdapter);
      expect(minimalAdapter).not.toBe(adapter);
    });

    it('should apply standard preset correctly', () => {
      const standardAdapter = adapter.standard();

      expect(standardAdapter).toBeInstanceOf(FluentAdapter);
      expect(standardAdapter).not.toBe(adapter);
    });

    it('should apply production preset correctly', () => {
      const productionAdapter = adapter.production();

      expect(productionAdapter).toBeInstanceOf(FluentAdapter);
      expect(productionAdapter).not.toBe(adapter);
    });

    it('should chain presets with configuration', () => {
      const configuredAdapter = adapter.minimal().withLogger(true).withValidation(true);

      expect(configuredAdapter).toBeInstanceOf(FluentAdapter);
    });
  });

  describe('Middleware Registry Integration (DDD)', () => {
    it('should support middleware registry configuration', () => {
      const registry = new MiddlewareRegistry();

      const configuredAdapter = adapter.withMiddlewareRegistry(registry);

      expect(configuredAdapter).toBeInstanceOf(FluentAdapter);
      expect(configuredAdapter).not.toBe(adapter);
    });

    it('should maintain middleware registry through chaining', () => {
      const registry = new MiddlewareRegistry();

      const configuredAdapter = adapter
        .withMiddlewareRegistry(registry)
        .withLogger(true)
        .withValidation(false);

      expect(configuredAdapter).toBeInstanceOf(FluentAdapter);
    });
  });

  describe('Static Methods (SOLID)', () => {
    it('should support static create method', async () => {
      const fastifyInstance = await FluentAdapter.create();

      expect(fastifyInstance).toBeDefined();
    });

    it('should support static create with configuration', async () => {
      const fastifyInstance = await FluentAdapter.create({ logger: true });

      expect(fastifyInstance).toBeDefined();
    });

    it('should support static registerRoute method', async () => {
      const fastifyInstance = await FluentAdapter.create();

      // Mock route for testing
      const mockRoute = {
        method: 'GET',
        path: '/test',
        config: {
          handler: () => ({ message: 'test' }),
        },
      } as any;

      await expect(FluentAdapter.registerRoute(fastifyInstance, mockRoute)).resolves.not.toThrow();
    });

    it('should support static listen method', async () => {
      const fastifyInstance = await FluentAdapter.create();

      await expect(FluentAdapter.listen(fastifyInstance, 0)).resolves.toBeDefined();
    });

    it('should support static close method', async () => {
      const fastifyInstance = await FluentAdapter.create();

      await expect(FluentAdapter.close(fastifyInstance)).resolves.not.toThrow();
    });
  });

  describe('Instance Methods (Functional Programming)', () => {
    it('should create Fastify instance', async () => {
      const fastifyInstance = await adapter.create();

      expect(fastifyInstance).toBeDefined();
    });

    it('should register route with all features', async () => {
      const fastifyInstance = await adapter.create();

      // Mock route for testing
      const mockRoute = {
        method: 'GET',
        path: '/test',
        config: {
          handler: () => ({ message: 'test' }),
        },
      } as any;

      await expect(adapter.registerRoute(fastifyInstance, mockRoute)).resolves.not.toThrow();
    });

    it('should handle route registration with middleware', async () => {
      const registry = new MiddlewareRegistry();
      const configuredAdapter = adapter.withMiddlewareRegistry(registry);

      const fastifyInstance = await configuredAdapter.create();

      // Mock route for testing
      const mockRoute = {
        method: 'GET',
        path: '/test',
        config: {
          handler: () => ({ message: 'test' }),
        },
      } as any;

      await expect(
        configuredAdapter.registerRoute(fastifyInstance, mockRoute),
      ).resolves.not.toThrow();
    });

    it('should handle route registration with background tasks', async () => {
      const configuredAdapter = adapter.withBackgroundTasks(true);

      const fastifyInstance = await configuredAdapter.create();

      // Mock route for testing
      const mockRoute = {
        method: 'POST',
        path: '/test',
        config: {
          handler: () => ({ message: 'test' }),
        },
      } as any;

      await expect(
        configuredAdapter.registerRoute(fastifyInstance, mockRoute),
      ).resolves.not.toThrow();
    });

    it('should handle route registration with dependency injection', async () => {
      const configuredAdapter = adapter.withDependencyInjection(true);

      const fastifyInstance = await configuredAdapter.create();

      // Mock route for testing
      const mockRoute = {
        method: 'GET',
        path: '/test',
        config: {
          handler: () => ({ message: 'test' }),
        },
      } as any;

      await expect(
        configuredAdapter.registerRoute(fastifyInstance, mockRoute),
      ).resolves.not.toThrow();
    });

    it('should handle route registration with validation', async () => {
      const configuredAdapter = adapter.withValidation(true);

      const fastifyInstance = await configuredAdapter.create();

      // Mock route for testing
      const mockRoute = {
        method: 'POST',
        path: '/test',
        config: {
          handler: () => ({ message: 'test' }),
        },
      } as any;

      await expect(
        configuredAdapter.registerRoute(fastifyInstance, mockRoute),
      ).resolves.not.toThrow();
    });

    it('should handle route registration with error handling', async () => {
      const configuredAdapter = adapter.withErrorHandling(true);

      const fastifyInstance = await configuredAdapter.create();

      // Mock route for testing
      const mockRoute = {
        method: 'GET',
        path: '/test',
        config: {
          handler: () => {
            throw new Error('Test error');
          },
        },
      } as any;

      await expect(
        configuredAdapter.registerRoute(fastifyInstance, mockRoute),
      ).resolves.not.toThrow();
    });

    it('should listen on specified port and host', async () => {
      const fastifyInstance = await adapter.create();

      const address = await adapter.listen(fastifyInstance, 0, '127.0.0.1');

      expect(address).toBeDefined();
    });

    it('should close Fastify instance', async () => {
      const fastifyInstance = await adapter.create();

      await expect(adapter.close(fastifyInstance)).resolves.not.toThrow();
    });
  });

  describe('Configuration Immutability (Functional Programming)', () => {
    it('should maintain immutability across all operations', () => {
      const originalAdapter = adapter;

      // Apply multiple configurations
      const configuredAdapter = originalAdapter
        .withLogger(true)
        .withValidation(false)
        .withErrorHandling(true)
        .minimal()
        .withMiddlewareRegistry(new MiddlewareRegistry())
        .standard()
        .production();

      // Original adapter should remain unchanged
      expect(originalAdapter).not.toBe(configuredAdapter);

      // Each step should create a new instance
      const step1 = originalAdapter.withLogger(true);
      const step2 = step1.withValidation(false);

      expect(originalAdapter).not.toBe(step1);
      expect(step1).not.toBe(step2);
      expect(originalAdapter).not.toBe(step2);
    });
  });

  describe('Error Handling (Guard Clauses)', () => {
    it('should handle invalid route registration gracefully', async () => {
      const fastifyInstance = await adapter.create();

      // Test with null route
      await expect(adapter.registerRoute(fastifyInstance, null as any)).resolves.not.toThrow();

      // Test with undefined route
      await expect(adapter.registerRoute(fastifyInstance, undefined as any)).resolves.not.toThrow();
    });

    it('should handle invalid Fastify instance gracefully', async () => {
      // Test with null Fastify instance
      await expect(adapter.listen(null as any, 3000)).rejects.toThrow();

      // Test with undefined Fastify instance
      await expect(adapter.listen(undefined as any, 3000)).rejects.toThrow();
    });
  });

  describe('Feature Combinations (Functional Composition)', () => {
    it('should handle all features enabled', () => {
      const fullFeatureAdapter = adapter
        .withLogger(true)
        .withValidation(true)
        .withErrorHandling(true)
        .withDependencyInjection(true)
        .withBackgroundTasks(true)
        .withOpenAPI(true)
        .withCompression(true)
        .withCors(true)
        .withHelmet(true)
        .withRateLimit(true)
        .withMiddleware(true);

      expect(fullFeatureAdapter).toBeInstanceOf(FluentAdapter);
    });

    it('should handle all features disabled', () => {
      const noFeatureAdapter = adapter
        .withLogger(false)
        .withValidation(false)
        .withErrorHandling(false)
        .withDependencyInjection(false)
        .withBackgroundTasks(false)
        .withOpenAPI(false)
        .withCompression(false)
        .withCors(false)
        .withHelmet(false)
        .withRateLimit(false)
        .withMiddleware(false);

      expect(noFeatureAdapter).toBeInstanceOf(FluentAdapter);
    });

    it('should handle mixed feature configuration', () => {
      const mixedAdapter = adapter
        .withLogger(true)
        .withValidation(false)
        .withErrorHandling(true)
        .withDependencyInjection(false)
        .withBackgroundTasks(true)
        .withOpenAPI(false)
        .withCompression(true)
        .withCors(false)
        .withHelmet(true)
        .withRateLimit(false)
        .withMiddleware(true);

      expect(mixedAdapter).toBeInstanceOf(FluentAdapter);
    });
  });
});
