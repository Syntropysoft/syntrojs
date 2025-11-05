/**
 * StreamSerializer - Stream Response Serializer
 *
 * Application Layer Service (Strategy Pattern)
 * Handles serialization of streaming responses
 */

import type { IResponseSerializer } from '../../domain/interfaces';
import { StreamingResponseHandler } from '../StreamingResponseHandler';

/**
 * Stream Response Serializer
 * Strategy for handling Node.js Readable streams
 */
export class StreamSerializer implements IResponseSerializer {
  /**
   * Check if result is a stream
   * Guard clause: Type checking
   *
   * @param result - Handler result
   * @returns True if stream
   */
  canSerialize(result: any): boolean {
    return StreamingResponseHandler.isReadableStream(result);
  }

  /**
   * Serialize stream to HTTP response
   * Bun handles streams natively
   *
   * @param result - Stream
   * @param statusCode - Default status code
   * @returns HTTP Response with stream
   */
  serialize(result: any, statusCode: number): Response {
    return new Response(result as any, {
      status: statusCode,
    });
  }
}
