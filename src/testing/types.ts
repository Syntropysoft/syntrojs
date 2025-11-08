/**
 * Testing types - shared across test utilities
 */

/**
 * Test request configuration options
 */
export interface TestRequestOptions {
  headers?: Record<string, string>;
  body?: unknown;
  query?: Record<string, string>;
  params?: Record<string, string>;
}

/**
 * Test response structure
 */
export interface TestResponse<T = unknown> {
  status: number;
  body: T;
  headers: Record<string, string>;
  text: () => Promise<string>;
  json: () => Promise<T>;
}
