/**
 * BufferSerializer - Buffer Response Serializer
 *
 * Application Layer Service (Strategy Pattern)
 * Handles serialization of binary buffer responses
 */

import type { IResponseSerializer } from '../../domain/interfaces';

/**
 * Buffer Response Serializer
 * Strategy for handling Buffer (binary data)
 */
export class BufferSerializer implements IResponseSerializer {
  /**
   * Check if result is a Buffer
   * Guard clause: Type checking
   *
   * @param result - Handler result
   * @returns True if Buffer
   */
  canSerialize(result: any): boolean {
    return Buffer.isBuffer(result);
  }

  /**
   * Serialize buffer to HTTP response
   * Bun handles buffers natively
   *
   * @param result - Buffer
   * @param statusCode - Default status code
   * @returns HTTP Response with buffer
   */
  serialize(result: any, statusCode: number): Response {
    return new Response(result, {
      status: statusCode,
    });
  }
}

