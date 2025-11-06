/**
 * BunRequestParser - Bun-specific Request Parser Implementation
 *
 * Application Layer Service (Single Responsibility Principle)
 * Implements IRequestParser contract using Bun's Web Standards API
 */

import type { IRequestParser } from '../domain/interfaces';
import type { Route } from '../domain/Route';
import type { RequestContext } from '../domain/types';
import { createFileDownload } from '../infrastructure/FileDownloadHelper';
import { createRedirect } from '../infrastructure/RedirectHelper';
import { createAcceptsHelper } from './ContentNegotiator';

/**
 * Bun Request Parser
 * Uses native Web Standards API (Request, FormData, etc.)
 */
export class BunRequestParser implements IRequestParser {
  /**
   * Parse path parameters from URL
   * Pure function: No side effects
   *
   * @param pathname - Actual path (e.g., /users/123)
   * @param routePath - Route pattern (e.g., /users/:id)
   * @returns Extracted parameters
   */
  parsePathParams(pathname: string, routePath: string): Record<string, string> {
    const params: Record<string, string> = {};

    // Guard clause: No params in route
    if (!routePath.includes(':')) {
      return params;
    }

    // Extract param names from route pattern
    const paramNames: string[] = [];
    const pattern = routePath.replace(/:(\w+)/g, (_, name) => {
      paramNames.push(name);
      return '([^/]+)';
    });

    // Match pathname against pattern
    const regex = new RegExp(`^${pattern}$`);
    const match = pathname.match(regex);

    // Guard clause: No match
    if (!match) {
      return params;
    }

    // Extract values (skip first element which is the full match)
    for (let i = 0; i < paramNames.length; i++) {
      params[paramNames[i]] = match[i + 1];
    }

    return params;
  }

  /**
   * Parse URL-encoded string to plain object
   * Pure function: No side effects
   *
   * @param text - URL-encoded string (e.g., "key=value&foo=bar")
   * @returns Plain object
   */
  private parseUrlEncoded(text: string): Record<string, any> {
    // Guard clause: Empty text
    if (!text) {
      return {};
    }

    const body: Record<string, any> = {};
    const params = new URLSearchParams(text);

    for (const [key, value] of params.entries()) {
      // Guard clause: Handle arrays (e.g., tags[]=value1&tags[]=value2)
      if (key.endsWith('[]')) {
        const cleanKey = key.slice(0, -2);
        if (!body[cleanKey]) {
          body[cleanKey] = [];
        }
        body[cleanKey].push(value);
        continue;
      }

      // Handle duplicate keys as arrays (e.g., tags=a&tags=b)
      if (body[key]) {
        // Convert to array if not already
        if (!Array.isArray(body[key])) {
          body[key] = [body[key]];
        }
        body[key].push(value);
        continue;
      }

      // Default: Simple key-value
      body[key] = value;
    }

    return body;
  }

  /**
   * Parse FormData to plain object
   * Pure function: No side effects
   *
   * @param formData - FormData instance
   * @returns Plain object
   */
  private parseFormData(formData: FormData): Record<string, any> {
    const body: Record<string, any> = {};

    for (const [key, value] of formData.entries()) {
      // Guard clause: Handle arrays (e.g., tags[]=value1&tags[]=value2)
      if (key.endsWith('[]')) {
        const cleanKey = key.slice(0, -2);
        if (!body[cleanKey]) {
          body[cleanKey] = [];
        }
        body[cleanKey].push(value);
        continue;
      }

      // Default: Simple key-value
      body[key] = value;
    }

    return body;
  }

  /**
   * Parse request body based on Content-Type
   * Guard clauses for different content types
   *
   * @param request - Web Request
   * @param contentType - Content-Type header
   * @returns Parsed body
   */
  async parseBody(request: Request, contentType: string): Promise<any> {
    // Guard clause: Empty content type
    if (!contentType) {
      return {};
    }

    // Guard clause: application/x-www-form-urlencoded
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const text = await request.text();
      return this.parseUrlEncoded(text);
    }

    // Guard clause: application/json (default)
    if (contentType.includes('application/json')) {
      return await request.json();
    }

    // Guard clause: text/plain
    if (contentType.includes('text/plain')) {
      return await request.text();
    }

    // Default: Try JSON
    try {
      return await request.json();
    } catch {
      return {};
    }
  }

  /**
   * Build request context from Bun request
   * Orchestrates all parsing operations
   *
   * @param request - Web Request
   * @param url - Parsed URL
   * @param route - Matched route
   * @returns Request context
   */
  async buildContext(request: Request, url: URL, route: Route): Promise<RequestContext> {
    // Extract path params using pure function
    const params = this.parsePathParams(url.pathname, route.path);

    // Extract query params (functional)
    const query: Record<string, string> = {};
    for (const [key, value] of url.searchParams.entries()) {
      query[key] = value;
    }

    // Extract headers (functional)
    const headers: Record<string, string> = {};
    for (const [key, value] of request.headers.entries()) {
      headers[key] = value;
    }

    // Generate correlation ID
    const correlationId =
      headers['x-correlation-id'] || `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Return immutable context object
    return {
      method: request.method as any,
      path: url.pathname,
      params,
      query,
      body: {},
      headers,
      cookies: {},
      correlationId,
      timestamp: new Date(),
      dependencies: {},
      background: {
        addTask: (task) => setImmediate(task),
      },
      // File download helper (functional)
      download: (data, options) => createFileDownload(data, options),
      // HTTP redirect helper (functional)
      redirect: (url, statusCode) => createRedirect(url, statusCode),
      // Content negotiation helper (functional)
      accepts: createAcceptsHelper(headers.accept),
    };
  }
}
