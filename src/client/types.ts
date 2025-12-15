/**
 * Type-Safe Client Types
 *
 * Domain Layer Types
 * Defines types for type-safe API client generation
 *
 * Principles Applied:
 * - SOLID: Interface Segregation, Dependency Inversion
 * - DDD: Domain Types (no dependencies on infrastructure)
 * - Functional: Pure types, no side effects
 */

import type { HttpMethod } from '../domain/types';

/**
 * Extract route paths from SyntroJS app type
 * Maps paths to HTTP methods and their configurations
 */
export type ExtractRoutes<T> = T extends { getRoutes: () => infer R }
  ? R extends ReadonlyArray<infer Route>
    ? Route extends { method: infer M; path: infer P; config: infer C }
      ? M extends HttpMethod
        ? P extends string
          ? Record<P, Record<Lowercase<M>, C>>
          : never
        : never
      : never
    : never
  : never;

/**
 * Flatten routes into a single record
 * Combines all routes into path -> method -> config mapping
 */
export type FlattenRoutes<T> = T extends Record<string, Record<string, infer C>>
  ? {
      [K in keyof T]: T[K];
    }
  : never;

/**
 * Client request options
 * Pure data structure for request configuration
 */
export interface ClientRequestOptions {
  /** Query parameters */
  query?: Record<string, unknown>;
  /** Request body */
  body?: unknown;
  /** Request headers */
  headers?: Record<string, string>;
  /** Path parameters */
  params?: Record<string, string>;
}

/**
 * Client response
 * Pure data structure for response
 */
export interface ClientResponse<T = unknown> {
  /** Response data */
  data: T;
  /** HTTP status code */
  status: number;
  /** Response headers */
  headers: Record<string, string>;
}

/**
 * Client mode: local (testing) or remote (HTTP)
 */
export type ClientMode = 'local' | 'remote';

/**
 * Client configuration
 * Pure data structure
 */
export interface ClientConfig {
  /** Base URL for remote mode */
  baseUrl?: string;
  /** Client mode */
  mode?: ClientMode;
  /** Default headers */
  defaultHeaders?: Record<string, string>;
}

