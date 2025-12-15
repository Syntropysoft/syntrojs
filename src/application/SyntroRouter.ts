/**
 * SyntroRouter - Router for Grouping Routes
 *
 * Application Layer Service
 * Responsibility: Group routes with a common prefix and optional middleware
 * Pattern: Router Pattern (similar to FastAPI APIRouter, Express Router)
 * Principles: SOLID, DDD, Guard Clauses, Functional Programming
 *
 * Usage:
 * ```typescript
 * const router = new SyntroRouter('/api/v1');
 *
 * router.get('/users', { handler: () => getUsers() });
 * router.post('/users', { handler: (ctx) => createUser(ctx.body) });
 *
 * app.include(router);
 * ```
 */

import { Route } from '../domain/Route';
import type {
  HttpMethod,
  Middleware,
  RouteConfig,
} from '../domain/types';
import { RouteRegistry } from './RouteRegistry';
import { MiddlewareRegistry } from './MiddlewareRegistry';

// ===== GUARD CLAUSES =====

/**
 * Guard Clause: Validar prefix del router
 * Principio: Guard Clauses + Fail Fast
 */
const guardPrefix = (prefix: string | null | undefined): string => {
  if (!prefix) {
    throw new Error('Router prefix is required');
  }

  if (typeof prefix !== 'string') {
    throw new Error('Router prefix must be a string');
  }

  if (prefix.trim().length === 0) {
    throw new Error('Router prefix cannot be empty');
  }

  // Normalize prefix: ensure it starts with / and doesn't end with /
  const normalized = prefix.trim();
  if (!normalized.startsWith('/')) {
    throw new Error('Router prefix must start with /');
  }

  return normalized;
};

/**
 * Guard Clause: Validar path de ruta
 * Principio: Guard Clauses + Fail Fast
 */
const guardRoutePath = (path: string | null | undefined): string => {
  if (!path) {
    throw new Error('Route path is required');
  }

  if (typeof path !== 'string') {
    throw new Error('Route path must be a string');
  }

  if (path.trim().length === 0) {
    throw new Error('Route path cannot be empty');
  }

  const normalized = path.trim();
  if (!normalized.startsWith('/')) {
    throw new Error('Route path must start with /');
  }

  return normalized;
};

/**
 * Guard Clause: Validar método HTTP
 * Principio: Guard Clauses + Fail Fast
 */
const guardHttpMethod = (method: HttpMethod | null | undefined): HttpMethod => {
  if (!method) {
    throw new Error('HTTP method is required');
  }

  if (typeof method !== 'string') {
    throw new Error('HTTP method must be a string');
  }

  const normalized = method.toUpperCase().trim() as HttpMethod;
  const validMethods: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

  if (!validMethods.includes(normalized)) {
    throw new Error(`Invalid HTTP method: ${method}. Must be one of: ${validMethods.join(', ')}`);
  }

  return normalized;
};

/**
 * Guard Clause: Validar configuración de ruta
 * Principio: Guard Clauses + Fail Fast
 */
const guardRouteConfig = <
  TParams = unknown,
  TQuery = unknown,
  TBody = unknown,
  TResponse = unknown,
  TDependencies = Record<string, unknown>,
>(
  config: RouteConfig<TParams, TQuery, TBody, TResponse, TDependencies> | null | undefined,
): RouteConfig<TParams, TQuery, TBody, TResponse, TDependencies> => {
  if (!config) {
    throw new Error('Route config is required');
  }

  if (typeof config !== 'object') {
    throw new Error('Route config must be an object');
  }

  if (!config.handler) {
    throw new Error('Route handler is required');
  }

  if (typeof config.handler !== 'function') {
    throw new Error('Route handler must be a function');
  }

  return config;
};

/**
 * Guard Clause: Validar middleware
 * Principio: Guard Clauses + Fail Fast
 */
const guardMiddleware = (middleware: Middleware | null | undefined): Middleware => {
  if (!middleware) {
    throw new Error('Middleware is required');
  }

  if (typeof middleware !== 'function') {
    throw new Error('Middleware must be a function');
  }

  return middleware;
};

// ===== PURE FUNCTIONS =====

/**
 * Pure Function: Combinar prefix y path
 * Principio: Functional Programming + Immutability
 *
 * @param prefix - Router prefix (e.g., '/api/v1')
 * @param path - Route path (e.g., '/users')
 * @returns Combined path (e.g., '/api/v1/users')
 */
const combinePath = (prefix: string, path: string): string => {
  // Guard clauses already validated inputs
  const normalizedPrefix = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  // Avoid double slashes
  if (normalizedPath === '/') {
    return normalizedPrefix;
  }

  return `${normalizedPrefix}${normalizedPath}`;
};

/**
 * SyntroRouter - Router for grouping routes
 *
 * Responsibilities:
 * - Group routes with a common prefix
 * - Apply router-level middleware
 * - Register routes with RouteRegistry
 * - Register middleware with MiddlewareRegistry
 *
 * Principles Applied:
 * - SOLID: Single Responsibility (route grouping), Open/Closed (extensible)
 * - DDD: Application Service (orchestrates domain entities)
 * - Functional: Pure functions for path combination, immutable operations
 * - Guard Clauses: Early validation, fail fast
 */
export class SyntroRouter {
  private readonly prefix: string;
  private readonly routeRegistry: typeof RouteRegistry;
  private readonly middlewareRegistry: MiddlewareRegistry;
  private readonly routes: Route[] = [];

  /**
   * Create a new router
   *
   * @param prefix - Prefix for all routes (e.g., '/api/v1')
   * @param routeRegistry - Optional RouteRegistry (defaults to singleton)
   * @param middlewareRegistry - Optional MiddlewareRegistry (defaults to singleton)
   */
  constructor(
    prefix: string,
    routeRegistry?: typeof RouteRegistry,
    middlewareRegistry?: MiddlewareRegistry,
  ) {
    // Guard clauses: validate prefix
    this.prefix = guardPrefix(prefix);

    // Dependency Injection: Use provided registries or defaults
    // RouteRegistry is exported as singleton instance
    // MiddlewareRegistry is a class, create new instance if not provided
    this.routeRegistry = routeRegistry ?? RouteRegistry;
    this.middlewareRegistry = middlewareRegistry ?? new MiddlewareRegistry();
  }

  /**
   * Register a GET route
   *
   * @param path - Route path (relative to prefix)
   * @param config - Route configuration
   * @returns this (for method chaining)
   */
  get<
    TParams = unknown,
    TQuery = unknown,
    TBody = unknown,
    TResponse = unknown,
    TDependencies extends Record<string, unknown> = Record<string, unknown>,
  >(
    path: string,
    config: RouteConfig<TParams, TQuery, TBody, TResponse, TDependencies>,
  ): this {
    return this.registerRoute('GET', path, config);
  }

  /**
   * Register a POST route
   *
   * @param path - Route path (relative to prefix)
   * @param config - Route configuration
   * @returns this (for method chaining)
   */
  post<
    TParams = unknown,
    TQuery = unknown,
    TBody = unknown,
    TResponse = unknown,
    TDependencies extends Record<string, unknown> = Record<string, unknown>,
  >(
    path: string,
    config: RouteConfig<TParams, TQuery, TBody, TResponse, TDependencies>,
  ): this {
    return this.registerRoute('POST', path, config);
  }

  /**
   * Register a PUT route
   *
   * @param path - Route path (relative to prefix)
   * @param config - Route configuration
   * @returns this (for method chaining)
   */
  put<
    TParams = unknown,
    TQuery = unknown,
    TBody = unknown,
    TResponse = unknown,
    TDependencies extends Record<string, unknown> = Record<string, unknown>,
  >(
    path: string,
    config: RouteConfig<TParams, TQuery, TBody, TResponse, TDependencies>,
  ): this {
    return this.registerRoute('PUT', path, config);
  }

  /**
   * Register a DELETE route
   *
   * @param path - Route path (relative to prefix)
   * @param config - Route configuration
   * @returns this (for method chaining)
   */
  delete<
    TParams = unknown,
    TQuery = unknown,
    TBody = unknown,
    TResponse = unknown,
    TDependencies extends Record<string, unknown> = Record<string, unknown>,
  >(
    path: string,
    config: RouteConfig<TParams, TQuery, TBody, TResponse, TDependencies>,
  ): this {
    return this.registerRoute('DELETE', path, config);
  }

  /**
   * Register a PATCH route
   *
   * @param path - Route path (relative to prefix)
   * @param config - Route configuration
   * @returns this (for method chaining)
   */
  patch<
    TParams = unknown,
    TQuery = unknown,
    TBody = unknown,
    TResponse = unknown,
    TDependencies extends Record<string, unknown> = Record<string, unknown>,
  >(
    path: string,
    config: RouteConfig<TParams, TQuery, TBody, TResponse, TDependencies>,
  ): this {
    return this.registerRoute('PATCH', path, config);
  }

  /**
   * Register a HEAD route
   *
   * @param path - Route path (relative to prefix)
   * @param config - Route configuration
   * @returns this (for method chaining)
   */
  head<
    TParams = unknown,
    TQuery = unknown,
    TBody = unknown,
    TResponse = unknown,
    TDependencies extends Record<string, unknown> = Record<string, unknown>,
  >(
    path: string,
    config: RouteConfig<TParams, TQuery, TBody, TResponse, TDependencies>,
  ): this {
    return this.registerRoute('HEAD', path, config);
  }

  /**
   * Register an OPTIONS route
   *
   * @param path - Route path (relative to prefix)
   * @param config - Route configuration
   * @returns this (for method chaining)
   */
  options<
    TParams = unknown,
    TQuery = unknown,
    TBody = unknown,
    TResponse = unknown,
    TDependencies extends Record<string, unknown> = Record<string, unknown>,
  >(
    path: string,
    config: RouteConfig<TParams, TQuery, TBody, TResponse, TDependencies>,
  ): this {
    return this.registerRoute('OPTIONS', path, config);
  }

  /**
   * Register middleware for this router
   *
   * Middleware registered here applies to all routes in this router
   *
   * @param middleware - Middleware function
   * @param path - Optional path pattern (defaults to router prefix)
   * @returns this (for method chaining)
   */
  use(middleware: Middleware, path?: string): this {
    // Guard clause: validate middleware
    guardMiddleware(middleware);

    // Use router prefix as default path if not provided
    const middlewarePath = path ?? this.prefix;

    // Guard clause: validate path
    guardRoutePath(middlewarePath);

    // Register middleware with router prefix scope
    // MiddlewareRegistry.add() returns a new instance (immutability)
    const newRegistry = this.middlewareRegistry.add(middlewarePath, middleware, {
      priority: 100, // Default priority
    });
    
    // Update internal reference (functional programming: new instance)
    (this as any).middlewareRegistry = newRegistry;

    return this;
  }

  /**
   * Get router prefix
   *
   * @returns Router prefix
   */
  getPrefix(): string {
    return this.prefix;
  }

  /**
   * Get all routes registered in this router
   *
   * @returns Array of routes (immutable copy)
   */
  getRoutes(): readonly Route[] {
    // Return immutable copy (functional programming principle)
    return Object.freeze([...this.routes]);
  }

  /**
   * Internal: Register a route with the router
   *
   * @param method - HTTP method
   * @param path - Route path (relative to prefix)
   * @param config - Route configuration
   * @returns this (for method chaining)
   */
  private registerRoute<
    TParams = unknown,
    TQuery = unknown,
    TBody = unknown,
    TResponse = unknown,
    TDependencies extends Record<string, unknown> = Record<string, unknown>,
  >(
    method: HttpMethod,
    path: string,
    config: RouteConfig<TParams, TQuery, TBody, TResponse, TDependencies>,
  ): this {
    // Guard clauses: validate inputs
    const validatedMethod = guardHttpMethod(method);
    const validatedPath = guardRoutePath(path);
    const validatedConfig = guardRouteConfig(config);

    // Pure function: combine prefix and path
    const fullPath = combinePath(this.prefix, validatedPath);

    // Create route entity (Domain layer)
    const route = new Route(validatedMethod, fullPath, validatedConfig);

    // Register route with RouteRegistry (Application layer)
    // RouteRegistry is singleton and accepts Route<unknown, ...> for type compatibility
    // Use same pattern as SyntroJS.registerRoute()
    // Cast through 'any' to handle generic type compatibility
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.routeRegistry.register(
      route as any as Route<unknown, unknown, unknown, unknown, Record<string, unknown>>,
    );

    // Track route internally (for getRoutes())
    // Cast to Route (without generics) for internal storage
    this.routes.push(route as Route);

    return this;
  }
}

