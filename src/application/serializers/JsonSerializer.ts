/**
 * JsonSerializer - JSON Response Serializer
 *
 * Application Layer Service (Strategy Pattern)
 * Handles serialization of standard JSON responses (default)
 */

import type { IResponseSerializer } from '../../domain/interfaces';

/**
 * JSON Response Serializer
 * Strategy for handling standard object responses
 * This is the default/fallback serializer
 */
export class JsonSerializer implements IResponseSerializer {
  /**
   * Check if result can be serialized as JSON
   * This is the catch-all: always returns true for objects
   *
   * @param result - Handler result
   * @returns Always true (default serializer)
   */
  canSerialize(result: any): boolean {
    // Default serializer: handles everything not handled by others
    return result !== null && typeof result === 'object';
  }

  /**
   * Serialize object to JSON HTTP response
   * Pure transformation: object -> JSON string
   *
   * @param result - Object to serialize
   * @param statusCode - HTTP status code
   * @returns HTTP Response with JSON
   */
  serialize(result: any, statusCode: number): Response {
    return new Response(JSON.stringify(result), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
