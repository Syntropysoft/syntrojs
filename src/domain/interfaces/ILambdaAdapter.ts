/**
 * ILambdaAdapter - Domain Interface
 *
 * Responsibility: Contract for Lambda event adapters
 * Pattern: Interface Segregation Principle (ISP)
 * Principles: SOLID (Dependency Inversion), DDD (Domain Interface)
 *
 * This interface allows Lambda adapters to be easily extracted to a separate package
 * while maintaining compatibility with SyntroJS core.
 */

import type { LambdaResponse } from '../../lambda/types';

/**
 * Lambda Adapter Interface
 * All Lambda adapters must implement this interface
 *
 * Principles:
 * - ISP: Small, focused interface
 * - DIP: SyntroJS depends on abstraction, not concrete implementation
 * - OCP: Easy to add new adapters without modifying core
 */
export interface ILambdaAdapter {
  /**
   * Gets the event type this adapter handles
   * Pure function: returns event type identifier
   *
   * @returns Event type identifier
   */
  getEventType(): string;

  /**
   * Checks if this adapter can handle the given event
   * Pure function: analyzes event structure without side effects
   *
   * @param event - Lambda event to check
   * @returns true if adapter can handle this event
   */
  canHandle(event: unknown): boolean;

  /**
   * Handles Lambda event and returns Lambda response
   * Main entry point for processing events
   *
   * @param event - Lambda event
   * @param context - Optional Lambda context
   * @returns Lambda response
   */
  handle(event: unknown, context?: unknown): Promise<LambdaResponse>;
}
