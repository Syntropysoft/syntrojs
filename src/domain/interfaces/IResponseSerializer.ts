/**
 * IResponseSerializer - Response Serialization Contract
 *
 * Domain Layer Interface (Open/Closed Principle)
 * New response types can be added without modifying adapters
 */

/**
 * Response Serializer Interface
 * Defines contract for converting handler results to HTTP responses
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
   * Serialize handler result to HTTP response
   * Guard clause contract: Only called if canSerialize returns true
   *
   * @param result - Handler result
   * @param statusCode - Default status code
   * @returns HTTP response
   */
  serialize(result: any, statusCode: number): Response;
}
