import type { WebSocketHandler } from '../domain/types';

// ===== GUARD CLAUSES =====

/**
 * Guard Clause: Validar path
 */
const guardPath = (path: string | null | undefined): string => {
  if (!path || typeof path !== 'string' || path.trim() === '') {
    throw new Error('Path is required and must be a non-empty string');
  }
  return path;
};

/**
 * Guard Clause: Validar handler
 */
const guardHandler = (handler: WebSocketHandler | null | undefined): WebSocketHandler => {
  if (!handler || typeof handler !== 'function') {
    throw new Error('Handler must be a valid function');
  }
  return handler;
};

// ===== PURE FUNCTIONS (Funcional) =====

/**
 * Pure Function: Crear entrada de WebSocket inmutable
 * Principio: Inmutabilidad, validación
 */
const createWebSocketEntry = (
  path: string,
  handler: WebSocketHandler,
  id: string,
): WebSocketEntry => {
  guardPath(path);
  guardHandler(handler);

  if (!id || typeof id !== 'string') {
    throw new Error('ID must be a valid string');
  }

  return Object.freeze({
    path,
    handler,
    id,
  });
};

/**
 * Pure Function: Verificar si path coincide con patrón
 * Principio: Función pura, sin efectos secundarios
 */
const matchesPath = (pattern: string, path: string): boolean => {
  // Guard Clause
  if (!path || typeof path !== 'string') {
    return false;
  }

  if (pattern === path) return true;

  // Handle path parameters like /chat/:room
  const pathSegments = path.split('/');
  const patternSegments = pattern.split('/');

  if (pathSegments.length !== patternSegments.length) return false;

  return patternSegments.every((segment, index) => {
    return segment.startsWith(':') || segment === pathSegments[index];
  });
};

/**
 * Pure Function: Extraer parámetros de path
 * Principio: Función pura, composición funcional
 */
const extractParams = (path: string, pattern: string): Record<string, string> => {
  const pathSegments = path.split('/');
  const patternSegments = pattern.split('/');

  if (pathSegments.length !== patternSegments.length) {
    return {};
  }

  const params: Record<string, string> = {};

  patternSegments.forEach((segment, index) => {
    if (segment.startsWith(':')) {
      const paramName = segment.slice(1);
      params[paramName] = pathSegments[index];
    }
  });

  return params;
};

/**
 * WebSocket route entry - Value Object inmutable
 * Principio: DDD Value Object, inmutabilidad
 */
export interface WebSocketEntry {
  readonly path: string;
  readonly handler: WebSocketHandler;
  readonly id: string;
}

/**
 * WebSocketRegistry - Registry de WebSocket con principios SOLID + DDD + Funcional
 *
 * SOLID:
 * - S: Single Responsibility - Solo maneja registro y ejecución de WebSocket
 * - O: Open/Closed - Extensible via configuración sin modificar código
 * - L: Liskov Substitution - Implementa interfaces consistentes
 * - I: Interface Segregation - Interfaces específicas para cada operación
 * - D: Dependency Inversion - Depende de abstracciones, no implementaciones
 *
 * DDD:
 * - Domain Service: WebSocketRegistry como servicio de dominio
 * - Value Objects: WebSocketEntry inmutables
 * - Aggregate: WebSocketRegistry como agregado raíz
 *
 * Funcional:
 * - Pure Functions: Métodos sin efectos secundarios
 * - Immutability: Datos inmutables donde sea posible
 * - Composition: Composición de handlers
 * - Higher-Order Functions: Funciones que manejan WebSocket
 */
export class WebSocketRegistry {
  private readonly websockets: ReadonlyArray<WebSocketEntry> = [];
  private readonly nextId: number = 1;

  /**
   * Constructor funcional - inmutabilidad
   */
  constructor(initialWebSockets: ReadonlyArray<WebSocketEntry> = []) {
    this.websockets = Object.freeze([...initialWebSockets]);
  }

  /**
   * Register WebSocket handler - API funcional
   * Principio: Single Responsibility, Open/Closed, inmutabilidad
   */
  add(path: string, handler: WebSocketHandler): WebSocketRegistry {
    // Guard Clauses
    guardPath(path);
    guardHandler(handler);

    const id = `websocket_${this.nextId}`;
    const entry = createWebSocketEntry(path, handler, id);

    // Crear nueva instancia inmutable (principio funcional)
    return new WebSocketRegistry([...this.websockets, entry]);
  }

  /**
   * Get WebSocket handler for path - función pura
   * Principio: Single Responsibility, composición funcional
   */
  getHandler(path: string): WebSocketHandler | undefined {
    // Guard Clause
    guardPath(path);

    const entry = this.websockets.find((ws) => matchesPath(ws.path, path));
    return entry?.handler;
  }

  /**
   * Extract parameters from path - función pura
   * Principio: Composición funcional, inmutabilidad
   */
  extractParams(path: string, pattern: string): Record<string, string> {
    // Guard Clauses
    guardPath(path);
    guardPath(pattern);

    return extractParams(path, pattern);
  }

  /**
   * Get all WebSocket entries - función pura
   * Principio: Inmutabilidad, encapsulación
   */
  getAll(): ReadonlyArray<WebSocketEntry> {
    return this.websockets;
  }

  /**
   * Get count of WebSocket handlers - función pura
   * Principio: Single Responsibility
   */
  getCount(): number {
    return this.websockets.length;
  }

  /**
   * Check if registry is empty - función pura
   * Principio: Single Responsibility
   */
  isEmpty(): boolean {
    return this.websockets.length === 0;
  }

  /**
   * Find WebSocket by ID - función pura
   * Principio: Single Responsibility, composición funcional
   */
  findById(id: string): WebSocketEntry | undefined {
    // Guard Clause
    if (!id || typeof id !== 'string') {
      throw new Error('ID must be a valid string');
    }

    return this.websockets.find((entry) => entry.id === id);
  }

  /**
   * Check if WebSocket exists by ID - función pura
   * Principio: Single Responsibility
   */
  hasWebSocket(id: string): boolean {
    return this.findById(id) !== undefined;
  }

  /**
   * Remove WebSocket by ID - función pura que retorna nueva instancia
   * Principio: Inmutabilidad, composición funcional
   */
  remove(id: string): WebSocketRegistry {
    // Guard Clause
    if (!id || typeof id !== 'string') {
      throw new Error('ID must be a valid string');
    }

    const filtered = this.websockets.filter((entry) => entry.id !== id);
    return new WebSocketRegistry(filtered);
  }

  /**
   * Clear all WebSockets - función pura que retorna nueva instancia
   * Principio: Inmutabilidad
   */
  clear(): WebSocketRegistry {
    return new WebSocketRegistry([]);
  }
}
