/**
 * CustomResponseSerializer - Custom Response Object Serializer
 *
 * Application Layer Service (Strategy Pattern)
 * Handles responses with custom status, headers, and body
 * Pattern: { status?: number, headers?: Record<string, string>, body: any }
 */

import type { IResponseSerializer } from '../../domain/interfaces';

/**
 * Custom Response Serializer
 * Handles objects with custom status/headers/body structure
 */
export class CustomResponseSerializer implements IResponseSerializer {
  /**
   * Check if result is a custom response object
   *
   * @param result - Handler result
   * @returns True if has status AND/OR headers (specific pattern)
   */
  canSerialize(result: any): boolean {
    // Guard clause: Must be an object
    if (!result || typeof result !== 'object') {
      return false;
    }

    // Detect custom response pattern: must have BOTH status AND headers
    // or JUST headers (for HEAD requests with custom headers)
    // Note: having ONLY "body" is not enough (normal objects have data)
    const hasStatus = 'status' in result && typeof result.status === 'number';
    const hasHeaders = 'headers' in result && typeof result.headers === 'object';

    return hasHeaders || (hasStatus && 'body' in result);
  }

  /**
   * Serialize custom response object
   *
   * @param result - Custom response object
   * @param defaultStatus - Default HTTP status code
   * @returns HTTP Response with custom status/headers
   */
  serialize(result: any, defaultStatus: number): Response {
    // Extract custom fields
    const status = result.status ?? defaultStatus;
    const customHeaders = result.headers ?? {};
    const body = result.body ?? result; // If no body field, use entire object

    // Build headers (merge custom with defaults)
    const headers = new Headers({
      'Content-Type': 'application/json',
      ...customHeaders,
    });

    // Serialize body
    const bodyToSend = body !== null && body !== undefined ? JSON.stringify(body) : null;

    return new Response(bodyToSend, {
      status,
      headers,
    });
  }
}
