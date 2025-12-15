/**
 * ResponseHandler - Centralized Response Serialization
 *
 * Responsibility: Handle response serialization with content negotiation
 * Pattern: Strategy Pattern + Dependency Injection
 * Principles: SOLID (Single Responsibility, Open/Closed, Dependency Inversion)
 *
 * This component is runtime-agnostic and used by all adapters (Fastify, Bun, etc.)
 * through composition, not inheritance or duplication.
 */

import type { SerializedResponseDTO, SerializerNext } from '../domain/interfaces';
import type { SerializerRegistry } from './SerializerRegistry';

/**
 * ResponseHandler handles response serialization for all adapters
 *
 * Design:
 * - Runtime-agnostic (works with Node.js, Bun, any platform)
 * - Uses SerializerRegistry by composition (Dependency Injection)
 * - Centralizes content negotiation logic
 * - Eliminates code duplication across adapters
 * - O(1) performance for content-type based serialization
 * - Returns simple DTO (no Web Standard Response conversion overhead)
 */
export class ResponseHandler {
  constructor(private readonly serializerRegistry: SerializerRegistry) {}

  /**
   * Serialize a handler result (O(1) for content-type based)
   *
   * Optimized flow:
   * 1. Find serializer via registry (O(1) for content-type, O(k) for type-based)
   * 2. Serialize (may return null for content negotiation)
   * 3. If null, try remaining serializers in order
   * 4. Fallback to JSON if needed
   *
   * @param result - Handler result to serialize
   * @param statusCode - HTTP status code
   * @param acceptHeader - Accept header value (for content negotiation)
   * @returns SerializedResponseDTO (simple, runtime-agnostic)
   */
  async serialize(
    result: any,
    statusCode: number,
    acceptHeader?: string,
  ): Promise<SerializedResponseDTO> {
    // Guard clause: null/undefined result
    if (result === null || result === undefined) {
      return { body: null, statusCode, headers: {} };
    }

    // Create minimal standard Request for serializers (they expect Request interface)
    const request = new Request('http://localhost', {
      headers: acceptHeader ? { Accept: acceptHeader } : {},
    });

    // O(1) optimization: Find serializer via registry
    const serializer = this.serializerRegistry.findSerializer(result, request);

    if (!serializer) {
      // Fallback to JSON (raw object - adapter will serialize)
      return {
        body: result,
        statusCode,
        headers: { 'Content-Type': 'application/json' },
      };
    }

    // Create next function for Chain of Responsibility
    const next: SerializerNext = (nextResult, nextStatusCode, nextRequest) => {
      return this.tryRemainingSerializers(nextResult, nextStatusCode, nextRequest, serializer);
    };

    // Try primary serializer with next() function (Chain of Responsibility)
    const dto = serializer.serialize(result, statusCode, request, next);

    if (dto !== null) {
      return dto;
    }

    // Primary serializer declined - try remaining serializers
    const fallbackDTO = this.tryRemainingSerializers(result, statusCode, request, serializer);

    if (fallbackDTO) {
      return fallbackDTO;
    }

    // Ultimate fallback: JSON (raw object)
    return {
      body: result,
      statusCode,
      headers: { 'Content-Type': 'application/json' },
    };
  }

  /**
   * Try remaining serializers in order (used when primary serializer returns null)
   * Pure function: Creates next function for Chain of Responsibility
   *
   * @param result - Handler result
   * @param statusCode - HTTP status code
   * @param request - HTTP Request
   * @param usedSerializer - Serializer that already tried (skip it)
   * @returns Serialized DTO or null if no serializer can handle it
   */
  private tryRemainingSerializers(
    result: any,
    statusCode: number,
    request: Request,
    usedSerializer: any,
  ): SerializedResponseDTO | null {
    const serializers = this.serializerRegistry.getAll();
    const remainingSerializers = serializers.filter((s) => s !== usedSerializer);

    // Create next function for each serializer in chain
    for (let i = 0; i < remainingSerializers.length; i++) {
      const serializer = remainingSerializers[i];
      const nextSerializers = remainingSerializers.slice(i + 1);

      // Create next function that tries remaining serializers
      const next: SerializerNext = (nextResult, nextStatusCode, nextRequest) => {
        if (nextSerializers.length === 0) {
          return null; // End of chain
        }

        // Try next serializer in chain
        for (const nextSerializer of nextSerializers) {
          if (nextSerializer.canSerialize(nextResult)) {
            const nextNext: SerializerNext = (nResult, nStatusCode, nRequest) => {
              const remaining = nextSerializers.filter((s) => s !== nextSerializer);
              if (remaining.length === 0) return null;

              for (const remSerializer of remaining) {
                if (remSerializer.canSerialize(nResult)) {
                  return remSerializer.serialize(nResult, nStatusCode, nRequest);
                }
              }
              return null;
            };

            const dto = nextSerializer.serialize(nextResult, nextStatusCode, nextRequest, nextNext);
            if (dto !== null) {
              return dto;
            }
          }
        }
        return null;
      };

      if (serializer.canSerialize(result)) {
        const dto = serializer.serialize(result, statusCode, request, next);
        if (dto !== null) {
          return dto;
        }
      }
    }

    return null;
  }
}
