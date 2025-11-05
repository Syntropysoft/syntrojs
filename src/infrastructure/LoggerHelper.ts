/**
 * Logger Helper for SyntroJS Components
 *
 * Provides safe access to logger with AsyncContext support
 * Can be disabled via configuration
 *
 * Pattern: Service Locator (stateless, functional approach)
 * Principles: SOLID, DDD, Functional Programming, Guard Clauses
 */

import type { Logger } from '@syntrojs/logger';
import { AsyncContext, JsonTransport } from '@syntrojs/logger';
import { getLogger } from '@syntrojs/logger/registry';
import { createNoOpLogger } from './NoOpLogger';

/**
 * Logger helper configuration
 */
export interface LoggerHelperConfig {
  /** Enable component-level logging */
  enabled?: boolean;
  /** Logger name */
  name?: string;
}

/**
 * Component logging state
 * Encapsulated state (not global) - follows DDD and functional principles
 */
class ComponentLoggingState {
  private enabled = true;

  /**
   * Sets whether component-level logging is enabled
   * Pure function (modifies internal state but returns void for interface)
   *
   * @param enabled - Whether to enable logging
   */
  setEnabled(enabled: boolean): void {
    // Guard clause: validate boolean
    if (typeof enabled !== 'boolean') {
      throw new Error('Component logging enabled must be a boolean');
    }

    this.enabled = enabled;
  }

  /**
   * Checks if component logging is enabled
   * Pure getter (no side effects)
   *
   * @returns true if enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

/**
 * Singleton instance (encapsulated, not global mutable variable)
 * Follows DDD: Domain service pattern
 */
const componentLoggingState = new ComponentLoggingState();

/**
 * Sets whether component-level logging is enabled
 * Functional interface for state management
 *
 * @param enabled - Whether to enable logging
 */
export function setComponentLoggingEnabled(enabled: boolean): void {
  componentLoggingState.setEnabled(enabled);
}

/**
 * Gets the logger for a component
 * Pure function: no side effects, deterministic based on config
 *
 * @param componentName - Component name (e.g., 'error-handler', 'background-tasks')
 * @param config - Logger configuration
 * @returns Logger instance or no-op logger
 */
export function getComponentLogger(componentName: string, config: LoggerHelperConfig = {}): Logger {
  // Guard clauses
  if (!componentName || typeof componentName !== 'string') {
    throw new Error('Component name must be a non-empty string');
  }

  // Guard clause: logging disabled (functional check)
  const isEnabled = componentLoggingState.isEnabled() && config.enabled !== false;
  if (!isEnabled) {
    return createNoOpLogger();
  }

  // Functional approach: immutable defaults
  const loggerName = config.name ?? 'syntrojs';

  // Get logger from registry (pure function)
  const logger = getLogger(loggerName, {
    level: 'info',
    transport: new JsonTransport(),
  });

  // Functional approach: extract context data
  const store = AsyncContext.getStore();
  const correlationId = store?.get('correlationId') as string | undefined;

  // Functional composition: build logger with context
  // Immutable: each method returns new logger instance
  const contextLogger = correlationId
    ? logger.withSource(componentName).withTransactionId(correlationId)
    : logger.withSource(componentName);

  return contextLogger;
}
