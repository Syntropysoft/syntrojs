/**
 * SQSAdapter - Infrastructure Layer
 *
 * Responsibility: Convert SQS events to standardized format and process messages
 * Pattern: Adapter Pattern
 * Principles: SOLID (Single Responsibility), Guard Clauses, Immutability, Functional Programming
 */

import { ErrorHandler } from '../../application/ErrorHandler';
import type { ILambdaAdapter } from '../../domain/interfaces/ILambdaAdapter';
import type { LambdaResponse } from '../types';
import type { SQSEvent, SQSEventRecord } from '../types';

/**
 * SQS Message Handler
 * Pure function: processes a single SQS message
 */
export type SQSMessageHandler = (message: {
  messageId: string;
  body: unknown;
  attributes: Record<string, string>;
  messageAttributes: Record<string, unknown>;
  receiptHandle: string;
  eventSourceARN: string;
  awsRegion: string;
}) => Promise<unknown> | unknown;

/**
 * SQS Adapter Configuration
 */
export interface SQSAdapterConfig {
  /** Handler function for processing SQS messages */
  handler?: SQSMessageHandler;
  /** Whether to process messages in batch or individually */
  batchProcessing?: boolean;
}

/**
 * SQS Adapter
 * Converts SQS events to standardized format and processes messages
 *
 * Implements ILambdaAdapter for easy extraction to separate package
 */
export class SQSAdapter implements ILambdaAdapter {
  private readonly handler?: SQSMessageHandler;
  private readonly batchProcessing: boolean;

  constructor(config: SQSAdapterConfig = {}) {
    // Guard clause: validate config
    if (config && typeof config !== 'object') {
      throw new Error('SQSAdapter config must be an object');
    }

    this.handler = config.handler;
    this.batchProcessing = config.batchProcessing ?? false;
  }

  /**
   * Gets the event type this adapter handles
   * Pure function: returns event type identifier
   *
   * @returns Event type identifier
   */
  getEventType(): string {
    return 'sqs';
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

    // Check for SQS event signature
    if (!('Records' in e) || !Array.isArray(e.Records)) {
      return false;
    }

    // Check if at least one record is from SQS
    const records = e.Records as unknown[];
    if (records.length === 0) {
      return false;
    }

    const firstRecord = records[0] as Record<string, unknown>;
    return (
      'eventSource' in firstRecord &&
      firstRecord.eventSource === 'aws:sqs' &&
      'body' in firstRecord &&
      'messageId' in firstRecord
    );
  }

  /**
   * Parses SQS message body
   * Pure function: parses JSON body (immutable)
   *
   * @param body - Raw message body string
   * @returns Parsed body or original string if parsing fails
   */
  private parseMessageBody(body: string): unknown {
    // Guard clause: validate body
    if (!body || typeof body !== 'string') {
      return {};
    }

    try {
      return JSON.parse(body);
    } catch {
      // If parsing fails, return original string (immutable)
      return body;
    }
  }

  /**
   * Converts SQS record to standardized message format
   * Pure function: transforms record to message (immutable)
   *
   * @param record - SQS event record
   * @returns Standardized message object
   */
  private toMessage(record: SQSEventRecord): {
    messageId: string;
    body: unknown;
    attributes: Record<string, string>;
    messageAttributes: Record<string, unknown>;
    receiptHandle: string;
    eventSourceARN: string;
    awsRegion: string;
  } {
    // Guard clause: validate record
    if (!record) {
      throw new Error('SQS record is required');
    }

    return {
      messageId: record.messageId,
      body: this.parseMessageBody(record.body),
      attributes: { ...record.attributes },
      messageAttributes: { ...record.messageAttributes },
      receiptHandle: record.receiptHandle,
      eventSourceARN: record.eventSourceARN,
      awsRegion: record.awsRegion,
    };
  }

  /**
   * Processes a single SQS message
   * Pure function: processes message without side effects (handler may have side effects)
   *
   * @param message - Standardized message object
   * @returns Processing result
   */
  private async processMessage(
    message: ReturnType<typeof this.toMessage>,
  ): Promise<unknown> {
    // Guard clause: validate message
    if (!message) {
      throw new Error('Message is required');
    }

    // If handler is provided, use it
    if (this.handler) {
      return await this.handler(message);
    }

    // Default: return message as-is
    return message;
  }

  /**
   * Creates success response for SQS
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
   * Creates error response for SQS
   * Pure function: creates immutable error response
   *
   * @param error - Error message
   * @param statusCode - HTTP status code
   * @returns Lambda error response
   */
  private createErrorResponse(
    error: string,
    statusCode = 500,
  ): LambdaResponse {
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
   * Orchestrates the message processing pipeline
   *
   * @param event - Lambda event (SQS)
   * @param context - Optional Lambda context
   * @returns Lambda response
   */
  async handle(event: unknown, context?: unknown): Promise<LambdaResponse> {
    // Guard clause: validate event
    if (!event) {
      throw new Error('SQS event is required');
    }

    // Guard clause: validate event type
    if (!this.canHandle(event)) {
      throw new Error('Event is not an SQS event');
    }

    // Type assertion after validation
    const sqsEvent = event as SQSEvent;

    try {
      // Guard clause: validate records
      if (!sqsEvent.Records || sqsEvent.Records.length === 0) {
        return this.createErrorResponse('No records in SQS event', 400);
      }

      // Process messages
      const messages = sqsEvent.Records.map((record) => this.toMessage(record));
      const results = await Promise.all(
        messages.map((message) => this.processMessage(message)),
      );

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

