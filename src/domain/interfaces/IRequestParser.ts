/**
 * IRequestParser - Request Parsing Contract
 *
 * Domain Layer Interface (Dependency Inversion Principle)
 * Infrastructure components depend on this abstraction, not concrete implementations
 */

import type { RequestContext } from '../types';
import type { Route } from '../Route';

/**
 * Request Parser Interface
 * Defines contract for parsing HTTP requests into application context
 */
export interface IRequestParser {
  /**
   * Parse path parameters from URL
   * Pure function contract: pathname + pattern -> params
   *
   * @param pathname - Actual request path (e.g., /users/123)
   * @param routePath - Route pattern (e.g., /users/:id)
   * @returns Extracted parameters
   */
  parsePathParams(pathname: string, routePath: string): Record<string, string>;

  /**
   * Parse request body based on Content-Type
   * Guard clause contract: Different parsers for different content types
   *
   * @param request - HTTP request
   * @param contentType - Content-Type header
   * @returns Parsed body
   */
  parseBody(request: any, contentType: string): Promise<any>;

  /**
   * Build request context from HTTP request
   * Orchestrates all parsing operations
   *
   * @param request - HTTP request
   * @param url - Parsed URL
   * @param route - Matched route
   * @returns Request context for handler
   */
  buildContext(request: any, url: URL, route: Route): Promise<RequestContext>;
}

