/**
 * LambdaHandler - Infrastructure Layer
 *
 * Responsibility: Main Lambda handler that detects event type and delegates to appropriate adapter
 * Pattern: Strategy Pattern + Adapter Pattern
 * Principles: SOLID (Open/Closed, Single Responsibility), Guard Clauses
 */

import { RouteRegistry } from '../../application/RouteRegistry';
import { SchemaValidator } from '../../application/SchemaValidator';
import { ApiGatewayAdapter } from '../adapters/ApiGatewayAdapter';
import { SQSAdapter } from '../adapters/SQSAdapter';
import { S3Adapter } from '../adapters/S3Adapter';
import { EventBridgeAdapter } from '../adapters/EventBridgeAdapter';
import { lambdaAdapterFactory } from '../adapters/LambdaAdapterFactory';
import type { LambdaResponse, LambdaEventType } from '../types';
import type { ILambdaAdapter } from '../../domain/interfaces/ILambdaAdapter';

/**
 * Lambda Handler Configuration
 */
export interface LambdaHandlerConfig {
  /** Route registry instance */
  routeRegistry?: typeof RouteRegistry;
  /** Schema validator instance */
  validator?: typeof SchemaValidator;
}

/**
 * Main Lambda Handler
 * Detects event type and delegates to appropriate adapter using factory
 *
 * Uses LambdaAdapterFactory for adapter management (allows easy extraction)
 */
export class LambdaHandler {
  private readonly adapterFactory: typeof lambdaAdapterFactory;

  constructor(config: LambdaHandlerConfig = {}) {
    const routeRegistry = config.routeRegistry || RouteRegistry;
    const validator = config.validator || SchemaValidator;

    // Use factory instance (can be replaced for testing)
    this.adapterFactory = lambdaAdapterFactory;

    // Register default adapters
    // In the future, adapters can be imported from external package
    const apiGatewayAdapter = new ApiGatewayAdapter(routeRegistry, validator);
    this.adapterFactory.register('api-gateway', apiGatewayAdapter);

    // Register SQS adapter (no handler by default, users can configure)
    const sqsAdapter = new SQSAdapter();
    this.adapterFactory.register('sqs', sqsAdapter);

    // Register S3 adapter (no handler by default, users can configure)
    const s3Adapter = new S3Adapter();
    this.adapterFactory.register('s3', s3Adapter);

    // Register EventBridge adapter (no handler by default, users can configure)
    const eventBridgeAdapter = new EventBridgeAdapter();
    this.adapterFactory.register('eventbridge', eventBridgeAdapter);
  }

  /**
   * Detects Lambda event type using adapter factory
   * Pure function: delegates to adapter canHandle methods
   *
   * @param event - Lambda event
   * @returns Detected event type or 'unknown'
   */
  detectEventType(event: unknown): LambdaEventType {
    // Guard clause: validate event
    if (!event || typeof event !== 'object') {
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
  async handler(
    event: unknown,
    context?: unknown,
  ): Promise<LambdaResponse> {
    // Guard clause: validate event
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

