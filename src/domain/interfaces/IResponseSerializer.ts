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
 * Response Serializer Interface
 * Defines contract for converting handler results to HTTP responses
 * 
 * Returns DTO instead of Web Standard Response for runtime-agnosticism
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
   * @param result - Handler result
   * @param statusCode - Default status code
   * @param request - HTTP Request (for Content Negotiation via Accept header)
   * @returns Serialized DTO, or null to pass to next serializer
   */
  serialize(result: any, statusCode: number, request: Request): SerializedResponseDTO | null;
}
