/**
 * Test funcional para WebSocket system
 * Principios: Inmutabilidad, Pureza, Composición
 */

import { describe, expect, it } from 'vitest';
import { WebSocketRegistry } from '../../../src/application/WebSocketRegistry';
import { SyntroJS } from '../../../src/core';

// Helper funcional para crear app limpia
const createApp = () => new SyntroJS();

// Helper funcional para crear handler puro
const createPureHandler = (message: string) => async (_ws: any, ctx: any) => {
  // Sin efectos secundarios - solo retorna datos
  return { message, path: ctx.path };
};

// Helper funcional para verificar registro
const verifyRegistry = (app: SyntroJS, expectedCount: number) => {
  const registry = app.getWebSocketRegistry();
  expect(registry).toBeInstanceOf(WebSocketRegistry);
  expect(registry.getAll()).toHaveLength(expectedCount);
};

// Helper funcional para extraer parámetros
const extractParams = (registry: WebSocketRegistry, path: string, pattern: string) =>
  registry.extractParams(path, pattern);

describe('WebSocket System', () => {
  it('should create SyntroJS with websocket support', () => {
    const app = createApp();
    expect(app).toBeDefined();
    verifyRegistry(app, 0);
  });

  it('should register websocket handler functionally', () => {
    const app = createApp();
    const handler = createPureHandler('Hello!');

    app.ws('/chat', handler);

    const registry = app.getWebSocketRegistry();
    const registeredHandler = registry.getHandler('/chat');

    expect(registeredHandler).toBeDefined();
    expect(registeredHandler).toBe(handler);
  });

  it('should handle path parameters functionally', () => {
    const app = createApp();
    const handler = createPureHandler('Room message');

    app.ws('/chat/:room', handler);

    const registry = app.getWebSocketRegistry();
    const registeredHandler = registry.getHandler('/chat/general');

    expect(registeredHandler).toBeDefined();

    // Test parameter extraction funcional
    const params = extractParams(registry, '/chat/general', '/chat/:room');
    expect(params).toEqual({ room: 'general' });
  });

  it('should support functional composition', () => {
    const app = createApp();
    const chatHandler = createPureHandler('Chat message');
    const notificationHandler = createPureHandler('Notification');

    // Composición funcional
    const result = app.ws('/chat', chatHandler).ws('/notifications', notificationHandler);

    expect(result).toBe(app);
    verifyRegistry(app, 2);
  });

  it('should handle complex path patterns functionally', () => {
    const app = createApp();
    const handler = createPureHandler('Complex pattern');

    app.ws('/users/:userId/rooms/:roomId', handler);

    const registry = app.getWebSocketRegistry();
    const params = extractParams(
      registry,
      '/users/123/rooms/general',
      '/users/:userId/rooms/:roomId',
    );

    expect(params).toEqual({ userId: '123', roomId: 'general' });
  });
});
