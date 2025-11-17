/**
 * LambdaAdapterFactory - Application Service
 *
 * Responsibility: Factory for creating and managing Lambda adapters
 * Pattern: Factory Pattern + Registry Pattern
 * Principles: SOLID (Open/Closed, Dependency Inversion), DDD, Guard Clauses
 *
 * This factory allows easy registration and retrieval of adapters,
 * making it simple to extract adapters to a separate package in the future.
 */

import type { ILambdaAdapter } from '../../domain/interfaces/ILambdaAdapter';
import type { LambdaEventType } from '../types';

/**
 * Lambda Adapter Factory
 * Manages adapter registration and retrieval
 *
 * Principles Applied:
 * - OCP: Open for extension (new adapters), closed for modification
 * - DIP: Depends on ILambdaAdapter interface, not concrete implementations
 * - SRP: Single responsibility - adapter management only
 */
export class LambdaAdapterFactory {
  private readonly adapters = new Map<LambdaEventType, ILambdaAdapter>();

  /**
   * Registers a Lambda adapter
   * Pure function: adds adapter to registry (immutable operation)
   *
   * @param eventType - Event type identifier
   * @param adapter - Adapter instance
   * @throws Error if adapter is invalid or already registered
   */
  register(eventType: LambdaEventType, adapter: ILambdaAdapter): void {
    // Guard clause: validate adapter
    if (!adapter) {
      throw new Error('Adapter is required');
    }

    // Guard clause: validate adapter implements interface
    if (typeof adapter.getEventType !== 'function') {
      throw new Error('Adapter must implement ILambdaAdapter interface');
    }

    if (typeof adapter.canHandle !== 'function') {
      throw new Error('Adapter must implement canHandle method');
    }

    if (typeof adapter.handle !== 'function') {
      throw new Error('Adapter must implement handle method');
    }

    // Guard clause: validate event type matches adapter
    if (adapter.getEventType() !== eventType) {
      throw new Error(
        `Adapter event type (${adapter.getEventType()}) does not match registration type (${eventType})`,
      );
    }

    // Guard clause: check for duplicates
    if (this.adapters.has(eventType)) {
      throw new Error(`Adapter for event type '${eventType}' is already registered`);
    }

    // Happy path: register adapter
    this.adapters.set(eventType, adapter);
  }

  /**
   * Gets adapter for event type
   * Pure function: returns adapter or undefined
   *
   * @param eventType - Event type identifier
   * @returns Adapter if found, undefined otherwise
   */
  get(eventType: LambdaEventType): ILambdaAdapter | undefined {
    // Guard clause: validate event type
    if (!eventType) {
      return undefined;
    }

    return this.adapters.get(eventType);
  }

  /**
   * Finds adapter that can handle the given event
   * Pure function: analyzes event and returns matching adapter
   *
   * @param event - Lambda event
   * @returns Adapter if found, undefined otherwise
   */
  findAdapter(event: unknown): ILambdaAdapter | undefined {
    // Guard clause: validate event
    if (!event || typeof event !== 'object') {
      return undefined;
    }

    // Functional: find adapter that can handle event
    for (const adapter of this.adapters.values()) {
      if (adapter.canHandle(event)) {
        return adapter;
      }
    }

    return undefined;
  }

  /**
   * Gets all registered adapters
   * Pure function: returns immutable array
   *
   * @returns Array of registered adapters
   */
  getAll(): ReadonlyArray<ILambdaAdapter> {
    return [...this.adapters.values()];
  }

  /**
   * Gets all registered event types
   * Pure function: returns immutable array
   *
   * @returns Array of event type identifiers
   */
  getEventTypes(): ReadonlyArray<LambdaEventType> {
    return [...this.adapters.keys()];
  }

  /**
   * Checks if adapter is registered for event type
   * Pure function: returns boolean
   *
   * @param eventType - Event type identifier
   * @returns true if adapter is registered
   */
  has(eventType: LambdaEventType): boolean {
    // Guard clause: validate event type
    if (!eventType) {
      return false;
    }

    return this.adapters.has(eventType);
  }

  /**
   * Clears all registered adapters
   * Useful for testing
   */
  clear(): void {
    this.adapters.clear();
  }
}

/**
 * Default factory instance (singleton pattern)
 * Can be replaced for testing or custom configurations
 */
export const lambdaAdapterFactory = new LambdaAdapterFactory();

