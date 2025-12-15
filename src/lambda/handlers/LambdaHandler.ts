/**
 * LambdaHandler - Infrastructure Layer
 *
 * Responsibility: Main Lambda handler that detects event type and delegates to appropriate adapter
 * Pattern: Strategy Pattern + Adapter Pattern
 * Principles: SOLID (Open/Closed, Single Responsibility), Guard Clauses
 */

import { RouteRegistry } from '../../application/RouteRegistry';
import { SchemaValidator } from '../../application/SchemaValidator';
import type { ILambdaAdapter } from '../../domain/interfaces/ILambdaAdapter';
import type { CorsOptions } from '../../plugins/cors';
import { ApiGatewayAdapter } from '../adapters/ApiGatewayAdapter';
import { EventBridgeAdapter, type EventBridgeAdapterConfig } from '../adapters/EventBridgeAdapter';
import {
  createLambdaAdapterFactory,
  type LambdaAdapterFactory,
  lambdaAdapterFactory,
} from '../adapters/LambdaAdapterFactory';
import { S3Adapter, type S3AdapterConfig } from '../adapters/S3Adapter';
import { SQSAdapter, type SQSAdapterConfig } from '../adapters/SQSAdapter';
import type { LambdaEventType, LambdaResponse } from '../types';

/**
 * Lambda Adapters Configuration
 */
export interface LambdaAdaptersConfig {
  /** SQS adapter configuration */
  sqs?: SQSAdapterConfig;
  /** S3 adapter configuration */
  s3?: S3AdapterConfig;
  /** EventBridge adapter configuration */
  eventbridge?: EventBridgeAdapterConfig;
}

/**
 * Lambda Handler Configuration
 */
export interface LambdaHandlerConfig {
  /** Route registry instance */
  routeRegistry?: typeof RouteRegistry;
  /** Schema validator instance */
  validator?: typeof SchemaValidator;
  /** Adapter factory instance (for testing or custom configurations) */
  adapterFactory?: LambdaAdapterFactory;
  /** Lambda adapters configuration */
  adapters?: LambdaAdaptersConfig;
  /** CORS configuration for Lambda responses */
  cors?: boolean | CorsOptions;
}

/**
 * Main Lambda Handler
 * Detects event type and delegates to appropriate adapter using factory
 *
 * Uses LambdaAdapterFactory for adapter management (allows easy extraction)
 */
export class LambdaHandler {
  private readonly adapterFactory: LambdaAdapterFactory;
  private readonly corsConfig?: boolean | CorsOptions;

  constructor(config: LambdaHandlerConfig = {}) {
    // Guard clause: validate config is an object if provided
    if (config !== undefined && config !== null) {
      // Guard clause: validate config is an object
      if (typeof config !== 'object') {
        throw new Error('LambdaHandlerConfig must be an object');
      }
    }

    const routeRegistry = config.routeRegistry || RouteRegistry;
    const validator = config.validator || SchemaValidator;

    // Store CORS configuration
    this.corsConfig = config.cors;

    // Use provided factory or create new instance (for isolation)
    // If no factory provided, use singleton (backward compatibility)
    this.adapterFactory = config.adapterFactory || createLambdaAdapterFactory();

    // Register default adapters with CORS configuration
    // In the future, adapters can be imported from external package
    const apiGatewayAdapter = new ApiGatewayAdapter(routeRegistry, validator, this.corsConfig);
    this.adapterFactory.registerOrReplace('api-gateway', apiGatewayAdapter);

    // Register SQS adapter with optional custom configuration
    const sqsAdapter = new SQSAdapter(config.adapters?.sqs || {});
    this.adapterFactory.registerOrReplace('sqs', sqsAdapter);

    // Register S3 adapter with optional custom configuration
    const s3Adapter = new S3Adapter(config.adapters?.s3 || {});
    this.adapterFactory.registerOrReplace('s3', s3Adapter);

    // Register EventBridge adapter with optional custom configuration
    const eventBridgeAdapter = new EventBridgeAdapter(config.adapters?.eventbridge || {});
    this.adapterFactory.registerOrReplace('eventbridge', eventBridgeAdapter);
  }

  /**
   * Detects Lambda event type using adapter factory
   * Pure function: delegates to adapter canHandle methods
   *
   * @param event - Lambda event
   * @returns Detected event type or 'unknown'
   */
  detectEventType(event: unknown): LambdaEventType {
    // Guard clause: validate event exists
    if (!event) {
      return 'unknown';
    }

    // Guard clause: validate event is an object
    if (typeof event !== 'object') {
      return 'unknown';
    }

    // Guard clause: validate event is not null
    if (event === null) {
      return 'unknown';
    }

    // Use factory to find adapter that can handle this event
    const adapter = this.adapterFactory.findAdapter(event);
    if (adapter) {
      return adapter.getEventType() as LambdaEventType;
    }

    return 'unknown';
  }

  /**
   * Main handler function for AWS Lambda
   * This is the entry point that AWS Lambda calls
   *
   * @param event - Lambda event
   * @param context - Lambda context (optional)
   * @returns Lambda response
   */
  async handler(event: unknown, context?: unknown): Promise<LambdaResponse> {
    // Guard clause: validate event exists
    if (!event) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Invalid event: event is required' }),
        headers: {
          'Content-Type': 'application/json',
        },
      };
    }

    // Find adapter that can handle this event (using factory)
    const adapter = this.adapterFactory.findAdapter(event);

    // Guard clause: no adapter found
    if (!adapter) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Unknown event type',
          eventType: this.detectEventType(event),
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      };
    }

    // Delegate to adapter (DIP: depends on abstraction)
    try {
      return await adapter.handle(event, context);
    } catch (error) {
      // Handle adapter errors
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Adapter error',
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      };
    }
  }
}

/**
 * Creates a Lambda handler function
 * Convenience function for creating handlers
 *
 * @param config - Handler configuration
 * @returns Lambda handler function
 */
export function createLambdaHandler(config?: LambdaHandlerConfig) {
  const handler = new LambdaHandler(config);
  return handler.handler.bind(handler);
}
