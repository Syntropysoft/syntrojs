/**
 * Type-Safe Client Factory
 *
 * Application Service: Creates type-safe API clients
 * Principles: SOLID, DDD, Functional Programming, Guard Clauses
 *
 * Functional Approach:
 * - Pure functions for all transformations
 * - Composition over imperative code
 * - Immutable data structures
 * - Higher-order functions for route handling
 */

import type { Route } from '../domain/Route';
import type { SyntroJS } from '../core/SyntroJS';
import { RouteRegistry } from '../application/RouteRegistry';
import type { RequestContext } from '../domain/types';
import { SchemaValidator } from '../application/SchemaValidator';
import { createAcceptsHelper } from '../application/ContentNegotiator';
import { createFileDownload } from '../infrastructure/FileDownloadHelper';
import { createRedirect } from '../infrastructure/RedirectHelper';
import type { ClientConfig, ClientMode, ClientRequestOptions, ClientResponse } from './types';
import { buildUrl, createFetchOptions, parseResponse, resolvePathParams } from './utils';

/**
 * Extract route types from SyntroJS instance
 * Pure type-level function for type inference
 */
export type ExtractRouteTypes<T> = T extends SyntroJS ? ReturnType<T['getRoutes']> : never;

/**
 * Route handler function type
 * Pure function signature for route execution
 */
type RouteHandlerFn = (
  options: ClientRequestOptions,
) => Promise<ClientResponse<unknown>>;

/**
 * Route tree node
 * Immutable structure representing route hierarchy
 */
type RouteTreeNode = {
  readonly [key: string]: RouteTreeNode | RouteHandlerFn | undefined;
};

/**
 * Route map entry
 * Maps route path to handler function
 */
type RouteMapEntry = {
  readonly path: string;
  readonly method: string;
  readonly route: Route;
  readonly handler: RouteHandlerFn;
};

// ===== GUARD CLAUSES =====

/**
 * Guard Clause: Validate SyntroJS app instance
 */
const guardApp = (app: SyntroJS | null | undefined): SyntroJS => {
  if (!app) {
    throw new Error('SyntroJS app instance is required');
  }
  return app;
};

/**
 * Guard Clause: Validate base URL for remote mode
 */
const guardBaseUrl = (baseUrl: string | null | undefined): string => {
  if (!baseUrl) {
    throw new Error('baseUrl is required for remote mode');
  }
  if (typeof baseUrl !== 'string') {
    throw new Error('baseUrl must be a string');
  }
  try {
    new URL(baseUrl);
    return baseUrl;
  } catch {
    throw new Error(`Invalid baseUrl: ${baseUrl}`);
  }
};

// ===== PURE FUNCTIONS =====

/**
 * Pure Function: Extract path segments from route path
 * Functional: map + filter
 *
 * @param path - Route path (e.g., '/users/:id')
 * @returns Array of path segments
 */
const extractPathSegments = (path: string): readonly string[] => {
  return path.split('/').filter(Boolean);
};

/**
 * Pure Function: Create route map from routes
 * Functional: map routes to handler functions
 *
 * @param routes - Array of routes
 * @param createHandler - Function to create handler for each route
 * @returns Array of route map entries
 */
const createRouteMap = (
  routes: ReadonlyArray<Route>,
  createHandler: (route: Route) => RouteHandlerFn,
): readonly RouteMapEntry[] => {
  return routes.map((route) => ({
    path: route.path,
    method: route.method.toLowerCase(),
    route,
    handler: createHandler(route),
  }));
};

/**
 * Pure Function: Build route tree from route map
 * Functional: reduce routes into nested tree structure
 * Handles path parameters (e.g., :id) correctly
 *
 * @param routeMap - Array of route map entries
 * @returns Route tree node
 */
const buildRouteTree = (
  routeMap: readonly RouteMapEntry[],
): RouteTreeNode => {
  // Functional: reduce routes into tree
  return routeMap.reduce((tree, entry) => {
    const segments = extractPathSegments(entry.path);

    // Functional: build tree recursively
    const buildNode = (
      currentTree: RouteTreeNode,
      remainingSegments: readonly string[],
      currentPath: string[] = [],
    ): RouteTreeNode => {
      // Guard clause: no more segments
      if (remainingSegments.length === 0) {
        return currentTree;
      }

      const [segment, ...rest] = remainingSegments;
      const isLast = rest.length === 0;
      const existing = currentTree[segment];

      if (isLast) {
        // Last segment: add method handler
        const existingNode =
          typeof existing === 'object' && existing !== null ? existing : {};
        return {
          ...currentTree,
          [segment]: {
            ...existingNode,
            [entry.method]: entry.handler,
          },
        };
      }

      // Intermediate segment: create or extend node recursively
      const nestedNode =
        typeof existing === 'object' && existing !== null
          ? existing
          : ({} as RouteTreeNode);

      return {
        ...currentTree,
        [segment]: buildNode(nestedNode, rest, [...currentPath, segment]),
      };
    };

    return buildNode(tree, segments);
  }, {} as RouteTreeNode);
};

/**
 * Pure Function: Find route by method and path
 * Functional: find route matching criteria
 *
 * @param routes - Array of routes
 * @param method - HTTP method
 * @param path - Route path
 * @returns Route if found, undefined otherwise
 */
const findRoute = (
  routes: ReadonlyArray<Route>,
  method: string,
  path: string,
): Route | undefined => {
  return routes.find(
    (route) =>
      route.method.toLowerCase() === method.toLowerCase() &&
      route.path === path,
  );
};

/**
 * Pure Function: Create mock request context
 * Functional: creates RequestContext from options
 *
 * @param route - Route entity
 * @param options - Client request options
 * @returns Request context
 */
const createMockContext = (
  route: Route,
  options: ClientRequestOptions,
): RequestContext => {
  // Functional: compose context object
  const headers = options.headers || {};
  const correlationId = `client-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  return {
    method: route.method,
    path: route.path,
    params: (options.params || {}) as Record<string, string>,
    query: (options.query || {}) as Record<string, string>,
    body: options.body,
    headers,
    cookies: {},
    correlationId,
    timestamp: new Date(),
    dependencies: route.config.dependencies || {},
    background: {
      addTask: () => {
        // No-op for client mode
      },
    },
    download: (data, downloadOptions) => createFileDownload(data, downloadOptions),
    redirect: (url, statusCode) => createRedirect(url, statusCode),
    accepts: createAcceptsHelper(headers.accept),
  };
};

/**
 * Pure Function: Execute route handler locally
 * Functional: executes handler with proper context
 *
 * @param route - Route entity
 * @param options - Client request options
 * @returns Response data
 */
const executeLocalHandler = async (
  route: Route,
  options: ClientRequestOptions,
): Promise<unknown> => {
  // Validate request BEFORE creating context (guard clauses)
  if (route.config.params && options.params) {
    const paramsResult = SchemaValidator.validate(route.config.params, options.params);
    if (!paramsResult.success) {
      throw new Error(`Invalid params: ${paramsResult.errors.map((e) => e.message).join(', ')}`);
    }
  }
  
  let validatedQuery: Record<string, unknown> | undefined = options.query as Record<string, unknown> | undefined;
  if (route.config.query && options.query) {
    // Validate and transform query params
    const queryResult = SchemaValidator.validate(route.config.query, options.query);
    if (!queryResult.success) {
      throw new Error(`Invalid query: ${queryResult.errors.map((e) => e.message).join(', ')}`);
    }
    validatedQuery = queryResult.data as Record<string, unknown>;
  }
  
  if (route.config.body && options.body) {
    const bodyResult = SchemaValidator.validate(route.config.body, options.body);
    if (!bodyResult.success) {
      throw new Error(`Invalid body: ${bodyResult.errors.map((e) => e.message).join(', ')}`);
    }
  }

  // Create context with validated data
  const context = createMockContext(route, { ...options, query: validatedQuery });

  // Execute handler
  const result = await route.handler(context);

  // Validate response (if schema provided)
  if (route.config.response && result) {
    const responseResult = SchemaValidator.validate(route.config.response, result);
    if (!responseResult.success) {
      throw new Error(`Invalid response: ${responseResult.errors.map((e) => e.message).join(', ')}`);
    }
  }

  return result;
};

/**
 * Pure Function: Create local endpoint handler
 * Higher-order function: returns handler function for route
 *
 * @param routes - Array of routes
 * @param method - HTTP method
 * @param path - Route path
 * @returns Handler function
 */
const createLocalEndpointHandler = (
  routes: ReadonlyArray<Route>,
  method: string,
  path: string,
): RouteHandlerFn => {
  return async <T = unknown>(
    options: ClientRequestOptions = {},
  ): Promise<ClientResponse<T>> => {
    // Find route
    const route = findRoute(routes, method, path);
    if (!route) {
      throw new Error(`Route ${method.toUpperCase()} ${path} not found`);
    }

    // Execute handler
    const result = await executeLocalHandler(route, options);

    // Return response
    return {
      data: result as T,
      status: route.config.status || 200,
      headers: { 'Content-Type': 'application/json' },
    };
  };
};

/**
 * Pure Function: Create remote endpoint handler
 * Higher-order function: returns handler function for HTTP requests
 *
 * @param baseUrl - Base URL for requests
 * @param method - HTTP method
 * @param path - Route path
 * @param config - Client configuration
 * @returns Handler function
 */
const createRemoteEndpointHandler = (
  baseUrl: string,
  method: string,
  path: string,
  config: ClientConfig,
): RouteHandlerFn => {
  return async <T = unknown>(
    options: ClientRequestOptions = {},
  ): Promise<ClientResponse<T>> => {
    // Build URL functionally
    const resolvedPath = resolvePathParams(path, options.params);
    const url = buildUrl(baseUrl, resolvedPath, undefined, options.query);

    // Create fetch options functionally
    const fetchOptions = createFetchOptions(method.toUpperCase() as any, options);

    // Merge default headers functionally
    const headers = {
      ...config.defaultHeaders,
      ...fetchOptions.headers,
    };

    // Make request
    const response = await fetch(url, { ...fetchOptions, headers });

    // Parse response functionally
    return parseResponse<T>(response);
  };
};

/**
 * Pure Function: Create route handler factory
 * Higher-order function: creates handler based on mode
 *
 * @param mode - Client mode
 * @param routes - Array of routes
 * @param baseUrl - Base URL (for remote mode)
 * @param config - Client configuration
 * @returns Function that creates handlers
 */
const createHandlerFactory = (
  mode: ClientMode,
  routes: ReadonlyArray<Route>,
  baseUrl?: string,
  config?: ClientConfig,
): ((method: string, path: string) => RouteHandlerFn) => {
  return (method: string, path: string) => {
    return mode === 'local'
      ? createLocalEndpointHandler(routes, method, path)
      : createRemoteEndpointHandler(guardBaseUrl(baseUrl), method, path, config || {});
  };
};

/**
 * Pure Function: Create local client
 * Functional: composes client from route tree
 *
 * @param app - SyntroJS app instance
 * @param config - Client configuration
 * @returns Client object
 */
const createLocalClient = <TApp extends SyntroJS>(
  app: TApp,
  config: ClientConfig = {},
): unknown => {
  // Guard clause
  const validatedApp = guardApp(app);

  // Get routes functionally
  const routes = validatedApp.getRoutes();

  // Create handler factory
  const createHandler = createHandlerFactory('local', routes);

  // Create route map functionally
  const routeMap = createRouteMap(routes, (route) =>
    createHandler(route.method.toLowerCase(), route.path),
  );

  // Build route tree functionally
  const routeTree = buildRouteTree(routeMap);

  // Return tree (will be used with Proxy for navigation)
  return routeTree;
};

/**
 * Pure Function: Create remote client
 * Functional: composes client from route tree
 *
 * @param app - SyntroJS app instance
 * @param config - Client configuration
 * @returns Client object
 */
const createRemoteClient = <TApp extends SyntroJS>(
  app: TApp,
  config: ClientConfig,
): unknown => {
  // Guard clauses
  const validatedApp = guardApp(app);
  const validatedBaseUrl = guardBaseUrl(config.baseUrl);

  // Get routes functionally
  const routes = validatedApp.getRoutes();

  // Create handler factory
  const createHandler = createHandlerFactory('remote', routes, validatedBaseUrl, config);

  // Create route map functionally
  const routeMap = createRouteMap(routes, (route) =>
    createHandler(route.method.toLowerCase(), route.path),
  );

  // Build route tree functionally
  const routeTree = buildRouteTree(routeMap);

  // Return tree (will be used with Proxy for navigation)
  return routeTree;
};

/**
 * Pure Function: Create proxy for route tree navigation
 * Functional: enables dot notation access to routes
 *
 * @param tree - Route tree node
 * @returns Proxy object
 */
const createRouteProxy = (tree: RouteTreeNode): unknown => {
  return new Proxy(tree, {
    get(target, prop) {
      const value = target[prop as string];
      
      // Guard clause: property doesn't exist
      if (value === undefined) {
        // Return a proxy that throws error on HTTP method access
        const httpMethods = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'];
        return new Proxy(
          {},
          {
            get(_, innerProp) {
              if (httpMethods.includes(innerProp as string)) {
                throw new Error(`Route not found: ${String(prop)}`);
              }
              // For non-HTTP methods, return undefined
              return undefined;
            },
          },
        );
      }
      
      if (typeof value === 'function') {
        // HTTP method handler
        return value;
      }
      if (typeof value === 'object' && value !== null) {
        // Nested route node - create recursive proxy
        return createRouteProxy(value);
      }
      return value;
    },
  });
};

/**
 * Create type-safe client
 * Factory function: creates client based on mode
 *
 * Principles Applied:
 * - SOLID: Single Responsibility (factory function)
 * - DDD: Application Service
 * - Functional: Pure functions, composition
 * - Guard Clauses: Early validation
 *
 * @param app - SyntroJS app instance
 * @param config - Client configuration
 * @returns Type-safe client
 */
export const createClient = <TApp extends SyntroJS>(
  app: TApp,
  config: ClientConfig = {},
): unknown => {
  // Guard clause
  const validatedApp = guardApp(app);

  // Determine mode functionally
  const mode: ClientMode = config.mode || 'local';

  // Create client functionally based on mode
  const routeTree =
    mode === 'local'
      ? createLocalClient(validatedApp, config)
      : createRemoteClient(validatedApp, { ...config, mode: 'remote' });

  // Create proxy for navigation
  return createRouteProxy(routeTree as RouteTreeNode);
};
