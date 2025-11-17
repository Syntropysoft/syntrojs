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
   * Replaces an existing adapter
   * Pure function: replaces adapter in registry (immutable operation)
   *
   * @param eventType - Event type identifier
   * @param adapter - Adapter instance
   * @throws Error if adapter is invalid or not registered
   */
  replace(eventType: LambdaEventType, adapter: ILambdaAdapter): void {
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

    // Guard clause: check if adapter exists
    if (!this.adapters.has(eventType)) {
      throw new Error(`Adapter for event type '${eventType}' is not registered`);
    }

    // Happy path: replace adapter
    this.adapters.set(eventType, adapter);
  }

  /**
   * Registers or replaces an adapter
   * Pure function: registers or replaces adapter in registry (immutable operation)
   *
   * @param eventType - Event type identifier
   * @param adapter - Adapter instance
   * @throws Error if adapter is invalid
   */
  registerOrReplace(eventType: LambdaEventType, adapter: ILambdaAdapter): void {
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

    // Happy path: register or replace adapter
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

  /**
   * Gets adapter configuration if available
   * Pure function: returns adapter config or undefined
   *
   * @param eventType - Event type identifier
   * @returns Adapter configuration if available, undefined otherwise
   */
  getAdapterConfig(eventType: LambdaEventType): unknown {
    // Guard clause: validate event type
    if (!eventType) {
      return undefined;
    }

    const adapter = this.adapters.get(eventType);
    if (!adapter) {
      return undefined;
    }

    // Check if adapter has getConfig method
    if (
      'getConfig' in adapter &&
      typeof (adapter as any).getConfig === 'function'
    ) {
      return (adapter as any).getConfig();
    }

    return undefined;
  }

  /**
   * Checks if adapter has a custom handler configured
   * Pure function: returns boolean
   *
   * @param eventType - Event type identifier
   * @returns true if adapter has custom handler
   */
  hasCustomHandler(eventType: LambdaEventType): boolean {
    // Guard clause: validate event type
    if (!eventType) {
      return false;
    }

    const adapter = this.adapters.get(eventType);
    if (!adapter) {
      return false;
    }

    // Check if adapter has hasHandler method
    if (
      'hasHandler' in adapter &&
      typeof (adapter as any).hasHandler === 'function'
    ) {
      return (adapter as any).hasHandler();
    }

    return false;
  }
}

/**
 * Creates a new LambdaAdapterFactory instance
 * Useful for testing or when you need isolated factory instances
 *
 * @returns New LambdaAdapterFactory instance
 */
export function createLambdaAdapterFactory(): LambdaAdapterFactory {
  return new LambdaAdapterFactory();
}

/**
 * Default factory instance (singleton pattern)
 * Can be replaced for testing or custom configurations
 */
export const lambdaAdapterFactory = new LambdaAdapterFactory();

