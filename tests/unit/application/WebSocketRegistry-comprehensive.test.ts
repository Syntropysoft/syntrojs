/**
 * Comprehensive tests for WebSocketRegistry.ts to increase coverage
 *
 * Principles Applied:
 * - SOLID: Single Responsibility, Open/Closed, Dependency Inversion
 * - DDD: Domain Services, Value Objects, Aggregates
 * - Functional: Pure functions, Immutability, Composition
 * - Guard Clauses: Early validation, Fail Fast
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { WebSocketRegistry } from '../../../src/application/WebSocketRegistry';
import type { RequestContext } from '../../../src/domain/types';

describe('WebSocketRegistry - Comprehensive Coverage Tests', () => {
  let registry: WebSocketRegistry;

  beforeEach(() => {
    registry = new WebSocketRegistry();
  });

  describe('Guard Clauses', () => {
    it('should validate path parameter', () => {
      const handler = (_ws: any, _context: RequestContext) => {};

      // Test null path
      expect(() => registry.add(null as any, handler)).toThrow(
        'Path is required and must be a valid string',
      );

      // Test undefined path
      expect(() => registry.add(undefined as any, handler)).toThrow(
        'Path is required and must be a valid string',
      );

      // Test empty path
      expect(() => registry.add('', handler)).toThrow(
        'Path is required and must be a valid string',
      );

      // Test non-string path
      expect(() => registry.add(123 as any, handler)).toThrow(
        'Path is required and must be a valid string',
      );
    });

    it('should validate handler parameter', () => {
      // Test null handler
      expect(() => registry.add('/ws', null as any)).toThrow(
        'WebSocket handler must be a valid function',
      );

      // Test undefined handler
      expect(() => registry.add('/ws', undefined as any)).toThrow(
        'WebSocket handler must be a valid function',
      );

      // Test non-function handler
      expect(() => registry.add('/ws', 'invalid' as any)).toThrow(
        'WebSocket handler must be a valid function',
      );
      expect(() => registry.add('/ws', 123 as any)).toThrow(
        'WebSocket handler must be a valid function',
      );
      expect(() => registry.add('/ws', {} as any)).toThrow(
        'WebSocket handler must be a valid function',
      );
    });
  });

  describe('WebSocket Handler Addition (Functional Programming)', () => {
    it('should add WebSocket handler and return new instance', () => {
      const handler = (_ws: any, _context: RequestContext) => {};

      const newRegistry = registry.add('/ws', handler);

      expect(newRegistry).toBeInstanceOf(WebSocketRegistry);
      expect(newRegistry).not.toBe(registry);
      expect(newRegistry.getCount()).toBe(1);
      expect(registry.getCount()).toBe(0);
    });

    it('should add multiple WebSocket handlers', () => {
      const handler1 = (_ws: any, _context: RequestContext) => {};
      const handler2 = (_ws: any, _context: RequestContext) => {};

      const registry1 = registry.add('/ws1', handler1);
      const registry2 = registry1.add('/ws2', handler2);

      expect(registry2.getCount()).toBe(2);
      expect(registry1.getCount()).toBe(1);
      expect(registry.getCount()).toBe(0);
    });

    it('should add handlers for same path with different patterns', () => {
      const handler1 = (_ws: any, _context: RequestContext) => {};
      const handler2 = (_ws: any, _context: RequestContext) => {};

      const registryWithBoth = registry.add('/ws', handler1).add('/ws', handler2);

      expect(registryWithBoth.getCount()).toBe(2);
    });
  });

  describe('WebSocket Handler Removal (Functional Programming)', () => {
    it('should remove WebSocket handler and return new instance', () => {
      const handler = (_ws: any, _context: RequestContext) => {};
      const registryWithHandler = registry.add('/ws', handler);

      const newRegistry = registryWithHandler.remove('/ws', handler);

      expect(newRegistry).toBeInstanceOf(WebSocketRegistry);
      expect(newRegistry).not.toBe(registryWithHandler);
      expect(newRegistry.getCount()).toBe(0);
    });

    it('should handle removal of non-existent handler', () => {
      const handler = (_ws: any, _context: RequestContext) => {};

      const newRegistry = registry.remove('/ws', handler);

      expect(newRegistry).toBeInstanceOf(WebSocketRegistry);
      expect(newRegistry).not.toBe(registry);
      expect(newRegistry.getCount()).toBe(0);
    });

    it('should remove specific handler from multiple', () => {
      const handler1 = (_ws: any, _context: RequestContext) => {};
      const handler2 = (_ws: any, _context: RequestContext) => {};

      const registryWithBoth = registry.add('/ws', handler1).add('/ws', handler2);

      const registryWithOne = registryWithBoth.remove('/ws', handler1);

      expect(registryWithOne.getCount()).toBe(1);
    });

    it('should handle removal with different path', () => {
      const handler = (_ws: any, _context: RequestContext) => {};
      const registryWithHandler = registry.add('/ws1', handler);

      const newRegistry = registryWithHandler.remove('/ws2', handler);

      expect(newRegistry.getCount()).toBe(1); // Handler should still exist
    });
  });

  describe('WebSocket Handler Clearing (Functional Programming)', () => {
    it('should clear all handlers and return new instance', () => {
      const handler1 = (_ws: any, _context: RequestContext) => {};
      const handler2 = (_ws: any, _context: RequestContext) => {};

      const registryWithHandlers = registry.add('/ws1', handler1).add('/ws2', handler2);

      const clearedRegistry = registryWithHandlers.clear();

      expect(clearedRegistry).toBeInstanceOf(WebSocketRegistry);
      expect(clearedRegistry).not.toBe(registryWithHandlers);
      expect(clearedRegistry.getCount()).toBe(0);
    });

    it('should handle clearing empty registry', () => {
      const clearedRegistry = registry.clear();

      expect(clearedRegistry).toBeInstanceOf(WebSocketRegistry);
      expect(clearedRegistry).not.toBe(registry);
      expect(clearedRegistry.getCount()).toBe(0);
    });
  });

  describe('WebSocket Handler Retrieval (DDD)', () => {
    it('should get handlers by exact path', () => {
      const handler = (_ws: any, _context: RequestContext) => {};
      const registryWithHandler = registry.add('/ws', handler);

      const handlers = registryWithHandler.getHandlers('/ws');

      expect(handlers).toHaveLength(1);
      expect(handlers[0]).toBe(handler);
    });

    it('should get handlers by path pattern', () => {
      const handler = (_ws: any, _context: RequestContext) => {};
      const registryWithHandler = registry.add('/ws/:id', handler);

      const handlers = registryWithHandler.getHandlers('/ws/123');

      expect(handlers).toHaveLength(1);
      expect(handlers[0]).toBe(handler);
    });

    it('should get handlers with wildcard path', () => {
      const handler = (_ws: any, _context: RequestContext) => {};
      const registryWithHandler = registry.add('*', handler);

      const handlers = registryWithHandler.getHandlers('/any/path');

      expect(handlers).toHaveLength(1);
    });

    it('should return empty array for non-matching path', () => {
      const handler = (_ws: any, _context: RequestContext) => {};
      const registryWithHandler = registry.add('/ws', handler);

      const handlers = registryWithHandler.getHandlers('/different');

      expect(handlers).toHaveLength(0);
    });

    it('should get multiple handlers for same path', () => {
      const handler1 = (_ws: any, _context: RequestContext) => {};
      const handler2 = (_ws: any, _context: RequestContext) => {};

      const registryWithHandlers = registry.add('/ws', handler1).add('/ws', handler2);

      const handlers = registryWithHandlers.getHandlers('/ws');

      expect(handlers).toHaveLength(2);
      expect(handlers).toContain(handler1);
      expect(handlers).toContain(handler2);
    });
  });

  describe('Path Parameter Extraction (Functional Programming)', () => {
    it('should extract parameters from path patterns', () => {
      const handler = (_ws: any, _context: RequestContext) => {};
      const registryWithHandler = registry.add('/ws/:id/users/:userId', handler);

      const handlers = registryWithHandler.getHandlers('/ws/123/users/456');

      expect(handlers).toHaveLength(1);
    });

    it('should handle complex path patterns', () => {
      const handler = (_ws: any, _context: RequestContext) => {};
      const registryWithHandler = registry.add('/api/:version/ws/:roomId', handler);

      const handlers = registryWithHandler.getHandlers('/api/v1/ws/room123');

      expect(handlers).toHaveLength(1);
    });

    it('should handle multiple parameter patterns', () => {
      const handler1 = (_ws: any, _context: RequestContext) => {};
      const handler2 = (_ws: any, _context: RequestContext) => {};

      const registryWithHandlers = registry
        .add('/ws/:id', handler1)
        .add('/ws/:id/:action', handler2);

      const handlers1 = registryWithHandlers.getHandlers('/ws/123');
      const handlers2 = registryWithHandlers.getHandlers('/ws/123/join');

      expect(handlers1).toHaveLength(1);
      expect(handlers2).toHaveLength(1);
    });
  });

  describe('Registry State (DDD)', () => {
    it('should track handler count correctly', () => {
      expect(registry.getCount()).toBe(0);
      expect(registry.isEmpty()).toBe(true);

      const handler = (_ws: any, _context: RequestContext) => {};
      const registryWithHandler = registry.add('/ws', handler);

      expect(registryWithHandler.getCount()).toBe(1);
      expect(registryWithHandler.isEmpty()).toBe(false);

      const registryWithTwo = registryWithHandler.add('/ws2', handler);

      expect(registryWithTwo.getCount()).toBe(2);
      expect(registryWithTwo.isEmpty()).toBe(false);
    });

    it('should maintain immutability', () => {
      const handler1 = (_ws: any, _context: RequestContext) => {};
      const handler2 = (_ws: any, _context: RequestContext) => {};

      const registry1 = registry.add('/ws1', handler1);
      const registry2 = registry1.add('/ws2', handler2);
      const registry3 = registry2.remove('/ws1', handler1);

      // Each operation should create a new instance
      expect(registry).not.toBe(registry1);
      expect(registry1).not.toBe(registry2);
      expect(registry2).not.toBe(registry3);

      // Original registry should remain unchanged
      expect(registry.getCount()).toBe(0);
      expect(registry1.getCount()).toBe(1);
      expect(registry2.getCount()).toBe(2);
      expect(registry3.getCount()).toBe(1);
    });
  });

  describe('Path Matching (Functional Programming)', () => {
    it('should match exact paths', () => {
      const handler = (_ws: any, _context: RequestContext) => {};
      const registryWithHandler = registry.add('/ws/chat', handler);

      const handlers = registryWithHandler.getHandlers('/ws/chat');

      expect(handlers).toHaveLength(1);
    });

    it('should match parameterized paths', () => {
      const handler = (_ws: any, _context: RequestContext) => {};
      const registryWithHandler = registry.add('/ws/:roomId', handler);

      const handlers = registryWithHandler.getHandlers('/ws/room123');

      expect(handlers).toHaveLength(1);
    });

    it('should match wildcard paths', () => {
      const handler = (_ws: any, _context: RequestContext) => {};
      const registryWithHandler = registry.add('*', handler);

      const handlers = registryWithHandler.getHandlers('/any/path/here');

      expect(handlers).toHaveLength(1);
    });

    it('should not match different paths', () => {
      const handler = (_ws: any, _context: RequestContext) => {};
      const registryWithHandler = registry.add('/ws/chat', handler);

      const handlers = registryWithHandler.getHandlers('/ws/different');

      expect(handlers).toHaveLength(0);
    });
  });

  describe('Complex Scenarios (Functional Composition)', () => {
    it('should handle complex WebSocket configurations', () => {
      const handler1 = (_ws: any, _context: RequestContext) => {};
      const handler2 = (_ws: any, _context: RequestContext) => {};
      const handler3 = (_ws: any, _context: RequestContext) => {};

      const complexRegistry = registry
        .add('/ws/chat', handler1)
        .add('/ws/:roomId', handler2)
        .add('*', handler3);

      expect(complexRegistry.getCount()).toBe(3);

      const chatHandlers = complexRegistry.getHandlers('/ws/chat');
      const roomHandlers = complexRegistry.getHandlers('/ws/room123');
      const anyHandlers = complexRegistry.getHandlers('/any/path');

      expect(chatHandlers).toHaveLength(3); // All handlers match
      expect(roomHandlers).toHaveLength(2); // handler2 + handler3
      expect(anyHandlers).toHaveLength(1); // Only handler3
    });

    it('should handle chaining operations', () => {
      const handler1 = (_ws: any, _context: RequestContext) => {};
      const handler2 = (_ws: any, _context: RequestContext) => {};
      const handler3 = (_ws: any, _context: RequestContext) => {};

      const chainedRegistry = registry
        .add('/ws1', handler1)
        .add('/ws2', handler2)
        .remove('/ws1', handler1)
        .add('/ws3', handler3)
        .clear()
        .add('/ws1', handler1);

      expect(chainedRegistry.getCount()).toBe(1);
    });

    it('should handle multiple handlers for same path', () => {
      const handler1 = (_ws: any, _context: RequestContext) => {};
      const handler2 = (_ws: any, _context: RequestContext) => {};
      const handler3 = (_ws: any, _context: RequestContext) => {};

      const multiHandlerRegistry = registry
        .add('/ws', handler1)
        .add('/ws', handler2)
        .add('/ws', handler3);

      const handlers = multiHandlerRegistry.getHandlers('/ws');

      expect(handlers).toHaveLength(3);
      expect(handlers).toContain(handler1);
      expect(handlers).toContain(handler2);
      expect(handlers).toContain(handler3);
    });
  });

  describe('Edge Cases (Guard Clauses)', () => {
    it('should handle special characters in paths', () => {
      const handler = (_ws: any, _context: RequestContext) => {};
      const registryWithHandler = registry.add('/ws/chat-room-123', handler);

      const handlers = registryWithHandler.getHandlers('/ws/chat-room-123');

      expect(handlers).toHaveLength(1);
    });

    it('should handle empty path segments', () => {
      const handler = (_ws: any, _context: RequestContext) => {};
      const registryWithHandler = registry.add('/ws//chat', handler);

      const handlers = registryWithHandler.getHandlers('/ws//chat');

      expect(handlers).toHaveLength(1);
    });

    it('should handle very long paths', () => {
      const handler = (_ws: any, _context: RequestContext) => {};
      const longPath = `/ws/${'a'.repeat(1000)}`;
      const registryWithHandler = registry.add(longPath, handler);

      const handlers = registryWithHandler.getHandlers(longPath);

      expect(handlers).toHaveLength(1);
    });
  });
});
