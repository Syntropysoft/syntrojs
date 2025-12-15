/**
 * S3Adapter - Infrastructure Layer
 *
 * Responsibility: Convert S3 events to standardized format and process object operations
 * Pattern: Adapter Pattern
 * Principles: SOLID (Single Responsibility), Guard Clauses, Immutability, Functional Programming
 */

import { ErrorHandler } from '../../application/ErrorHandler';
import type { ILambdaAdapter } from '../../domain/interfaces/ILambdaAdapter';
import type { LambdaResponse, S3Event, S3EventRecord } from '../types';

/**
 * S3 Object Handler
 * Pure function: processes a single S3 object event
 */
export type S3ObjectHandler = (object: {
  bucket: string;
  key: string;
  size: number;
  eTag: string;
  eventName: string;
  eventTime: string;
  awsRegion: string;
}) => Promise<unknown> | unknown;

/**
 * S3 Adapter Configuration
 */
export interface S3AdapterConfig {
  /** Handler function for processing S3 object events */
  handler?: S3ObjectHandler;
}

/**
 * S3 Adapter
 * Converts S3 events to standardized format and processes object operations
 *
 * Implements ILambdaAdapter for easy extraction to separate package
 */
export class S3Adapter implements ILambdaAdapter {
  private readonly handler?: S3ObjectHandler;

  constructor(config: S3AdapterConfig = {}) {
    // Guard clause: validate config
    if (config && typeof config !== 'object') {
      throw new Error('S3Adapter config must be an object');
    }

    this.handler = config.handler;
  }

  /**
   * Checks if adapter has a custom handler configured
   * Pure function: returns boolean
   *
   * @returns true if handler is configured
   */
  hasHandler(): boolean {
    return this.handler !== undefined;
  }

  /**
   * Gets adapter configuration
   * Pure function: returns immutable config object
   *
   * @returns Adapter configuration
   */
  getConfig(): S3AdapterConfig {
    return {
      handler: this.handler,
    };
  }

  /**
   * Gets the event type this adapter handles
   * Pure function: returns event type identifier
   *
   * @returns Event type identifier
   */
  getEventType(): string {
    return 's3';
  }

  /**
   * Checks if this adapter can handle the given event
   * Pure function: analyzes event structure without side effects
   *
   * @param event - Lambda event to check
   * @returns true if adapter can handle this event
   */
  canHandle(event: unknown): boolean {
    // Guard clause: validate event
    if (!event || typeof event !== 'object') {
      return false;
    }

    const e = event as Record<string, unknown>;

    // Check for S3 event signature
    if (!('Records' in e) || !Array.isArray(e.Records)) {
      return false;
    }

    // Check if at least one record is from S3
    const records = e.Records as unknown[];
    if (records.length === 0) {
      return false;
    }

    const firstRecord = records[0] as Record<string, unknown>;
    return (
      'eventSource' in firstRecord &&
      firstRecord.eventSource === 'aws:s3' &&
      's3' in firstRecord &&
      typeof firstRecord.s3 === 'object' &&
      firstRecord.s3 !== null
    );
  }

  /**
   * Converts S3 record to standardized object format
   * Pure function: transforms record to object (immutable)
   *
   * @param record - S3 event record
   * @returns Standardized object information
   */
  private toObject(record: S3EventRecord): {
    bucket: string;
    key: string;
    size: number;
    eTag: string;
    eventName: string;
    eventTime: string;
    awsRegion: string;
  } {
    // Guard clause: validate record
    if (!record) {
      throw new Error('S3 record is required');
    }

    if (!record.s3) {
      throw new Error('S3 record must contain s3 object');
    }

    if (!record.s3.bucket || !record.s3.object) {
      throw new Error('S3 record must contain bucket and object');
    }

    // Decode URL-encoded key
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

    return {
      bucket: record.s3.bucket.name,
      key,
      size: record.s3.object.size || 0,
      eTag: record.s3.object.eTag || '',
      eventName: record.eventName,
      eventTime: record.eventTime,
      awsRegion: record.awsRegion,
    };
  }

  /**
   * Processes a single S3 object event
   * Pure function: processes object without side effects (handler may have side effects)
   *
   * @param object - Standardized object information
   * @returns Processing result
   */
  private async processObject(object: ReturnType<typeof this.toObject>): Promise<unknown> {
    // Guard clause: validate object
    if (!object) {
      throw new Error('Object is required');
    }

    // If handler is provided, use it
    if (this.handler) {
      return await this.handler(object);
    }

    // Default: return object info as-is
    return object;
  }

  /**
   * Creates success response for S3
   * Pure function: creates immutable response
   *
   * @param results - Processing results
   * @returns Lambda response
   */
  private toLambdaResponse(results: unknown[]): LambdaResponse {
    // Guard clause: validate results
    if (!Array.isArray(results)) {
      return {
        statusCode: 200,
        body: JSON.stringify({ processed: 0, results: [] }),
        headers: {
          'Content-Type': 'application/json',
        },
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        processed: results.length,
        results,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    };
  }

  /**
   * Creates error response for S3
   * Pure function: creates immutable error response
   *
   * @param error - Error message
   * @param statusCode - HTTP status code
   * @returns Lambda error response
   */
  private createErrorResponse(error: string, statusCode = 500): LambdaResponse {
    // Guard clause: validate error
    if (!error) {
      return {
        statusCode,
        body: JSON.stringify({ error: 'Unknown error' }),
        headers: {
          'Content-Type': 'application/json',
        },
      };
    }

    return {
      statusCode,
      body: JSON.stringify({ error }),
      headers: {
        'Content-Type': 'application/json',
      },
    };
  }

  /**
   * Handles Lambda event and returns Lambda response
   * Implements ILambdaAdapter interface
   * Orchestrates the object processing pipeline
   *
   * @param event - Lambda event (S3)
   * @param context - Optional Lambda context
   * @returns Lambda response
   */
  async handle(event: unknown, context?: unknown): Promise<LambdaResponse> {
    // Guard clause: validate event
    if (!event) {
      throw new Error('S3 event is required');
    }

    // Guard clause: validate event type
    if (!this.canHandle(event)) {
      throw new Error('Event is not an S3 event');
    }

    // Type assertion after validation
    const s3Event = event as S3Event;

    try {
      // Guard clause: validate records
      if (!s3Event.Records || s3Event.Records.length === 0) {
        return this.createErrorResponse('No records in S3 event', 400);
      }

      // Process objects
      const objects = s3Event.Records.map((record) => this.toObject(record));
      const results = await Promise.all(objects.map((object) => this.processObject(object)));

      // Return success response
      return this.toLambdaResponse(results);
    } catch (error) {
      // Handle errors using ErrorHandler
      return await this.handleError(error as Error);
    }
  }

  /**
   * Handles errors using ErrorHandler
   * Delegates error handling to domain service
   *
   * @param error - Error to handle
   * @returns Lambda error response
   */
  private async handleError(error: Error): Promise<LambdaResponse> {
    // Guard clause: validate error
    if (!error) {
      return this.createErrorResponse('Internal Server Error', 500);
    }

    // Delegate to ErrorHandler (domain service)
    const errorResponse = await ErrorHandler.handle(error, {} as any);
    return {
      statusCode: errorResponse.status,
      body:
        typeof errorResponse.body === 'string'
          ? errorResponse.body
          : JSON.stringify(errorResponse.body),
      headers: {
        'Content-Type': 'application/json',
      },
    };
  }
}
