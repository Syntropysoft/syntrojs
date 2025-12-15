/**
 * IResponseSerializer - Response Serialization Contract
 *
 * Domain Layer Interface (Open/Closed Principle)
 * New response types can be added without modifying adapters
 */

/**
 * Serialized response data (DTO)
 * Runtime-agnostic format that adapters convert to their native response
 */
export interface SerializedResponseDTO {
  body: any;
  statusCode: number;
  headers: Record<string, string>;
}

/**
 * Next function for Chain of Responsibility pattern
 * Allows serializers to delegate to the next serializer in the chain
 *
 * @param result - Handler result to serialize
 * @param statusCode - HTTP status code
 * @param request - HTTP Request
 * @returns Serialized DTO from next serializer, or null if chain exhausted
 */
export type SerializerNext = (
  result: any,
  statusCode: number,
  request: Request,
) => SerializedResponseDTO | null;

/**
 * Response Serializer Interface
 * Defines contract for converting handler results to HTTP responses
 *
 * Returns DTO instead of Web Standard Response for runtime-agnosticism
 * Pattern: Chain of Responsibility - serializers can delegate to next()
 *
 * Principles Applied:
 * - SOLID: Open/Closed (extensible via new serializers)
 * - DDD: Domain Interface (contract for serialization)
 * - Chain of Responsibility: next() parameter enables decorator pattern
 */
export interface IResponseSerializer {
  /**
   * Check if this serializer can handle the result
   * Strategy pattern: Multiple serializers, each handles specific types
   *
   * @param result - Handler result
   * @returns True if this serializer can handle it
   */
  canSerialize(result: any): boolean;

  /**
   * Serialize handler result to DTO
   * Guard clause contract: Only called if canSerialize returns true
   *
   * Chain of Responsibility pattern:
   * - Return SerializedResponseDTO to handle the response
   * - Return null to pass to next serializer
   * - Call next() to delegate to next serializer (for decorators/interceptors)
   *
   * @param result - Handler result
   * @param statusCode - Default status code
   * @param request - HTTP Request (for Content Negotiation via Accept header)
   * @param next - Optional next serializer function (Chain of Responsibility)
   * @returns Serialized DTO, or null to pass to next serializer
   */
  serialize(
    result: any,
    statusCode: number,
    request: Request,
    next?: SerializerNext,
  ): SerializedResponseDTO | null;
}
