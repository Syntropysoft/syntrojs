/**
 * AutoOptionsGenerator - Application Service
 *
 * Responsibility: Generate automatic OPTIONS responses based on registered routes
 * Pattern: Functional
 * Principles: SOLID (Single Responsibility), Guard Clauses
 */

import type { RouteRegistry } from './RouteRegistry';
import type { HttpMethod } from '../domain/types';

/**
 * Auto-OPTIONS configuration
 */
export interface AutoOptionsConfig {
  /**
   * Include CORS headers in OPTIONS response
   * @default true
   */
  includeCorsHeaders?: boolean;

  /**
   * Allowed origin for CORS
   * @default '*'
   */
  origin?: string;

  /**
   * Additional headers to include in OPTIONS response
   */
  additionalHeaders?: Record<string, string>;

  /**
   * Max age for preflight cache (in seconds)
   * @default 86400 (24 hours)
   */
  maxAge?: number;
}

/**
 * Generate allowed methods for a path based on registered routes
 * Pure function: no side effects, immutable operations
 *
 * @param registry - Route registry
 * @param path - Path to check
 * @returns Array of allowed HTTP methods (sorted)
 */
export function getAllowedMethods(registry: typeof RouteRegistry, path: string): HttpMethod[] {
  const routes = registry.getAll();

  // Functional: filter routes that match path, map to methods, deduplicate
  const methods = routes
    .filter((route: any) => routePathMatches(route.path, path))
    .map((route: any) => route.method as HttpMethod)
    .concat(['OPTIONS' as HttpMethod]) // Always include OPTIONS
    .filter((method: HttpMethod, index: number, array: HttpMethod[]) => array.indexOf(method) === index) // Deduplicate
    .sort(); // Sort alphabetically

  // Guard clause: return empty array if no routes found (remove OPTIONS)
  return methods.length === 1 && methods[0] === 'OPTIONS' ? [] : methods;
}

/**
 * Check if a route path matches a request path
 * Pure function: handles path parameters like /users/:id
 *
 * @param routePath - Registered route path (may contain :params)
 * @param requestPath - Incoming request path
 * @returns true if paths match
 */
function routePathMatches(routePath: string, requestPath: string): boolean {
  // Guard clause: exact match
  if (routePath === requestPath) {
    return true;
  }

  // Functional: split paths into segments
  const routeSegments = routePath.split('/');
  const requestSegments = requestPath.split('/');

  // Guard clause: different number of segments = no match
  if (routeSegments.length !== requestSegments.length) {
    return false;
  }

  // Functional: check if all segments match (params match anything)
  return routeSegments.every((routeSegment, index) => 
    routeSegment.startsWith(':') || routeSegment === requestSegments[index]
  );
}

/**
 * Generate OPTIONS response headers
 * Pure function: returns new headers object, no mutations
 *
 * @param allowedMethods - Allowed HTTP methods for this path
 * @param config - Auto-OPTIONS configuration
 * @returns Immutable headers object
 */
export function generateOptionsHeaders(
  allowedMethods: HttpMethod[],
  config: AutoOptionsConfig = {},
): Record<string, string> {
  // Base headers (immutable)
  const baseHeaders = {
    Allow: allowedMethods.join(', '),
  };

  // CORS headers (immutable) - functional composition
  const corsHeaders = config.includeCorsHeaders !== false
    ? {
        'Access-Control-Allow-Origin': config.origin ?? '*',
        'Access-Control-Allow-Methods': allowedMethods.join(', '),
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Max-Age': (config.maxAge ?? 86400).toString(),
        // Conditional credential header
        ...(config.origin && config.origin !== '*' 
          ? { 'Access-Control-Allow-Credentials': 'true' } 
          : {}),
      }
    : {};

  // Functional composition: merge all headers immutably
  return Object.freeze({
    ...baseHeaders,
    ...corsHeaders,
    ...(config.additionalHeaders ?? {}),
  });
}

/**
 * Generate complete OPTIONS response
 * Pure function: functional composition, immutable return
 *
 * @param registry - Route registry
 * @param path - Request path
 * @param config - Auto-OPTIONS configuration
 * @returns Immutable OPTIONS response object
 */
export function generateOptionsResponse(
  registry: typeof RouteRegistry,
  path: string,
  config: AutoOptionsConfig = {},
): { status: number; body: object | null; headers: Record<string, string> } {
  // Functional: get allowed methods
  const allowedMethods = getAllowedMethods(registry, path);

  // Guard clause: return 404 if no routes found
  if (allowedMethods.length === 0) {
    return Object.freeze({
      status: 404,
      body: Object.freeze({ error: 'Not Found' }),
      headers: Object.freeze({}),
    });
  }

  // Functional composition: generate headers and build response
  const headers = generateOptionsHeaders(allowedMethods, config);

  // Return immutable 204 No Content (standard for OPTIONS)
  return Object.freeze({
    status: 204,
    body: null,
    headers,
  });
}

