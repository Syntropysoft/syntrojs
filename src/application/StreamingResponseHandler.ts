/**
 * StreamingResponseHandler - Application Service
 *
 * Responsibility: Detect and classify streaming/buffer responses
 * Pattern: Singleton (Module Pattern)
 * Principles: SOLID (Single Responsibility), Guard Clauses, Functional Programming
 */

import type { Readable } from 'node:stream';

/**
 * Response type classification
 */
export type ResponseType = 'stream' | 'buffer' | 'object';

/**
 * Response classification result
 */
export interface ResponseClassification {
  /** Type of response */
  type: ResponseType;

  /** Original value */
  value: unknown;

  /** Is this a streaming response? */
  isStreaming: boolean;
}

/**
 * Streaming response handler implementation
 */
class StreamingResponseHandlerImpl {
  /**
   * Classify response type
   *
   * Pure function: Only analyzes, doesn't modify
   * Guard clauses: Validates input
   *
   * @param value - Response value to classify
   * @returns Classification result
   */
  classify(value: unknown): ResponseClassification {
    // Guard clause: null/undefined
    if (value === null || value === undefined) {
      return {
        type: 'object',
        value,
        isStreaming: false,
      };
    }

    // Check if Readable stream (priority order matters)
    if (this.isReadableStream(value)) {
      return {
        type: 'stream',
        value,
        isStreaming: true,
      };
    }

    // Check if Buffer
    if (Buffer.isBuffer(value)) {
      return {
        type: 'buffer',
        value,
        isStreaming: false, // Buffers are not streams
      };
    }

    // Default: treat as object (JSON, string, etc.)
    return {
      type: 'object',
      value,
      isStreaming: false,
    };
  }

  /**
   * Check if value is a Node.js Readable stream
   *
   * Pure function: Type checking only, no side effects
   * Guard clauses: Validates structure
   *
   * @param value - Value to check
   * @returns True if value is a Readable stream
   */
  isReadableStream(value: unknown): value is Readable {
    // Guard clause: Must be an object
    if (!value || typeof value !== 'object') {
      return false;
    }

    // Guard clause: Must have stream methods
    const hasStreamMethods =
      typeof (value as any).pipe === 'function' &&
      typeof (value as any).on === 'function' &&
      typeof (value as any).read === 'function';

    return hasStreamMethods;
  }

  /**
   * Check if value is a Buffer
   *
   * Pure function: Type checking only
   *
   * @param value - Value to check
   * @returns True if value is a Buffer
   */
  isBuffer(value: unknown): value is Buffer {
    return Buffer.isBuffer(value);
  }

  /**
   * Determine if response should skip validation
   *
   * Pure function: Decision logic
   *
   * Streams and Buffers cannot be validated by Zod schemas
   *
   * @param value - Response value
   * @returns True if validation should be skipped
   */
  shouldSkipValidation(value: unknown): boolean {
    const classification = this.classify(value);
    return classification.type === 'stream' || classification.type === 'buffer';
  }
}

/**
 * Exported singleton (Module Pattern)
 */
class StreamingResponseHandlerSingleton {
  private static instance: StreamingResponseHandlerImpl = new StreamingResponseHandlerImpl();

  static classify(value: unknown): ResponseClassification {
    return StreamingResponseHandlerSingleton.instance.classify(value);
  }

  static isReadableStream(value: unknown): value is Readable {
    return StreamingResponseHandlerSingleton.instance.isReadableStream(value);
  }

  static isBuffer(value: unknown): value is Buffer {
    return StreamingResponseHandlerSingleton.instance.isBuffer(value);
  }

  static shouldSkipValidation(value: unknown): boolean {
    return StreamingResponseHandlerSingleton.instance.shouldSkipValidation(value);
  }
}

export const StreamingResponseHandler = StreamingResponseHandlerSingleton;
