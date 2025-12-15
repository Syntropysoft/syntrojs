/**
 * Type-Safe Client Module
 *
 * Exports for creating type-safe API clients
 * Principles: SOLID, DDD, Functional Programming
 */

export { createClient } from './createClient';
export type { ExtractRouteTypes } from './createClient';
export type {
  ClientConfig,
  ClientMode,
  ClientRequestOptions,
  ClientResponse,
} from './types';

