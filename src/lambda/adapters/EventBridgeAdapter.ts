/**
 * EventBridgeAdapter - Infrastructure Layer
 *
 * Responsibility: Convert EventBridge events to standardized format and process custom events
 * Pattern: Adapter Pattern
 * Principles: SOLID (Single Responsibility), Guard Clauses, Immutability, Functional Programming
 */

import { ErrorHandler } from '../../application/ErrorHandler';
import type { ILambdaAdapter } from '../../domain/interfaces/ILambdaAdapter';
import type { LambdaResponse } from '../types';
import type { EventBridgeEvent } from '../types';

/**
 * EventBridge Event Handler
 * Pure function: processes an EventBridge event
 */
export type EventBridgeEventHandler = (event: {
  id: string;
  source: string;
  detailType: string;
  detail: Record<string, unknown>;
  time: string;
  region: string;
  account: string;
  resources: string[];
}) => Promise<unknown> | unknown;

/**
 * EventBridge Adapter Configuration
 */
export interface EventBridgeAdapterConfig {
  /** Handler function for processing EventBridge events */
  handler?: EventBridgeEventHandler;
}

/**
 * EventBridge Adapter
 * Converts EventBridge events to standardized format and processes custom events
 *
 * Implements ILambdaAdapter for easy extraction to separate package
 */
export class EventBridgeAdapter implements ILambdaAdapter {
  private readonly handler?: EventBridgeEventHandler;

  constructor(config: EventBridgeAdapterConfig = {}) {
    // Guard clause: validate config
    if (config && typeof config !== 'object') {
      throw new Error('EventBridgeAdapter config must be an object');
    }

    this.handler = config.handler;
  }

  /**
   * Gets the event type this adapter handles
   * Pure function: returns event type identifier
   *
   * @returns Event type identifier
   */
  getEventType(): string {
    return 'eventbridge';
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

    // Check for EventBridge event signature
    // EventBridge events have: version, id, source, detail-type, detail, time
    return (
      'version' in e &&
      'id' in e &&
      'source' in e &&
      'detail-type' in e &&
      'detail' in e &&
      'time' in e &&
      typeof e.source === 'string' &&
      typeof e['detail-type'] === 'string' &&
      typeof e.detail === 'object' &&
      e.detail !== null
    );
  }

  /**
   * Converts EventBridge event to standardized format
   * Pure function: transforms event to standardized format (immutable)
   *
   * @param event - EventBridge event
   * @returns Standardized event object
   */
  private toStandardizedEvent(event: EventBridgeEvent): {
    id: string;
    source: string;
    detailType: string;
    detail: Record<string, unknown>;
    time: string;
    region: string;
    account: string;
    resources: string[];
  } {
    // Guard clause: validate event
    if (!event) {
      throw new Error('EventBridge event is required');
    }

    if (!event.source || !event['detail-type'] || !event.detail) {
      throw new Error('EventBridge event must contain source, detail-type, and detail');
    }

    return {
      id: event.id || '',
      source: event.source,
      detailType: event['detail-type'],
      detail: { ...event.detail },
      time: event.time || new Date().toISOString(),
      region: event.region || '',
      account: event.account || '',
      resources: event.resources ? [...event.resources] : [],
    };
  }

  /**
   * Processes an EventBridge event
   * Pure function: processes event without side effects (handler may have side effects)
   *
   * @param standardizedEvent - Standardized event object
   * @returns Processing result
   */
  private async processEvent(
    standardizedEvent: ReturnType<typeof this.toStandardizedEvent>,
  ): Promise<unknown> {
    // Guard clause: validate event
    if (!standardizedEvent) {
      throw new Error('Event is required');
    }

    // If handler is provided, use it
    if (this.handler) {
      return await this.handler(standardizedEvent);
    }

    // Default: return event as-is
    return standardizedEvent;
  }

  /**
   * Creates success response for EventBridge
   * Pure function: creates immutable response
   *
   * @param result - Processing result
   * @returns Lambda response
   */
  private toLambdaResponse(result: unknown): LambdaResponse {
    // Guard clause: handle null/undefined
    if (result === null || result === undefined) {
      return {
        statusCode: 200,
        body: JSON.stringify({ processed: true }),
        headers: {
          'Content-Type': 'application/json',
        },
      };
    }

    return {
      statusCode: 200,
      body:
        typeof result === 'string' ? result : JSON.stringify(result),
      headers: {
        'Content-Type': 'application/json',
      },
    };
  }

  /**
   * Creates error response for EventBridge
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
   * Orchestrates the event processing pipeline
   *
   * @param event - Lambda event (EventBridge)
   * @param context - Optional Lambda context
   * @returns Lambda response
   */
  async handle(event: unknown, context?: unknown): Promise<LambdaResponse> {
    // Guard clause: validate event
    if (!event) {
      throw new Error('EventBridge event is required');
    }

    // Guard clause: validate event type
    if (!this.canHandle(event)) {
      throw new Error('Event is not an EventBridge event');
    }

    // Type assertion after validation
    const eventBridgeEvent = event as EventBridgeEvent;

    try {
      // Convert to standardized format
      const standardizedEvent = this.toStandardizedEvent(eventBridgeEvent);

      // Process event
      const result = await this.processEvent(standardizedEvent);

      // Return success response
      return this.toLambdaResponse(result);
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

