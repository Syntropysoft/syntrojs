/**
 * RedirectSerializer - HTTP Redirect Response Serializer
 *
 * Application Layer Service (Strategy Pattern)
 * Handles serialization of HTTP redirect responses
 */

import type { IResponseSerializer, SerializedResponseDTO } from '../../domain/interfaces';
import { isRedirectResponse } from '../../infrastructure/RedirectHelper';

/**
 * Redirect Response Serializer
 * Strategy for handling HTTP redirect responses
 *
 * Principles:
 * - Strategy Pattern: One of several response serialization strategies
 * - Single Responsibility: Only handles redirect responses
 * - Guard Clauses: Type checking via canSerialize
 * - Functional: Pure transformation (result -> Response)
 */
export class RedirectSerializer implements IResponseSerializer {
  /**
   * Check if result is a redirect response
   * Guard clause: Type checking
   *
   * @param result - Handler result
   * @returns True if redirect response
   */
  canSerialize(result: any): boolean {
    return isRedirectResponse(result);
  }

  /**
   * Serialize redirect to HTTP response
   * Pure transformation: result -> Response
   *
   * Redirects have:
   * - 3xx status code (301, 302, 303, 307, 308)
   * - Location header
   * - No body (null)
   *
   * @param result - Redirect response
   * @param _statusCode - Ignored (uses result.statusCode)
   * @returns HTTP Response with redirect
   */
  serialize(result: any, _statusCode: number, request: Request): SerializedResponseDTO {
    // Extract headers
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(result.headers)) {
      headers[key] = value as string;
    }

    // Return DTO with redirect (no body)
    return {
      body: null,
      statusCode: result.statusCode,
      headers,
    };
  }
}
