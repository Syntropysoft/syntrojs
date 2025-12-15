/**
 * JsonSerializer - JSON Response Serializer
 *
 * Application Layer Service (Strategy Pattern)
 * Handles serialization of standard JSON responses (default)
 */

import type {
  IResponseSerializer,
  SerializedResponseDTO,
  SerializerNext,
} from '../../domain/interfaces';

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
   * @param request - HTTP Request (for content negotiation)
   * @returns HTTP Response with JSON, or null if client wants another format
   */
  serialize(
    result: any,
    statusCode: number,
    request: Request,
    next?: SerializerNext,
  ): SerializedResponseDTO | null {
    // Content Negotiation: Check if client explicitly wants another format
    const acceptHeader = request.headers.get('accept') || '';

    // If client explicitly requests a non-JSON format, pass to next serializer
    // This allows TOON, XML, etc. to handle their formats first
    if (
      acceptHeader &&
      !acceptHeader.includes('*/*') &&
      !acceptHeader.includes('application/json')
    ) {
      // Client wants a specific format that's not JSON
      // Return null to let other serializers handle it
      return null;
    }

    // Default: Return raw object (adapter will serialize based on runtime)
    // This is more efficient - let Fastify/Bun serialize in their optimal way
    return {
      body: result, // Raw object, not serialized
      statusCode,
      headers: { 'Content-Type': 'application/json' },
    };
  }
}
