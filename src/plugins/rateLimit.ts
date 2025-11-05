/**
 * Rate Limiting Plugin - Wrapper for @fastify/rate-limit
 *
 * Request rate limiting for SyntroJS
 */

import type { FastifyInstance } from 'fastify';

/**
 * Rate Limiting Configuration Options
 */
export interface RateLimitOptions {
  /**
   * Maximum number of requests per time window
   * @default 100
   */
  max?: number | ((request: unknown, key: string) => number | Promise<number>);

  /**
   * Time window in milliseconds
   * @default 60000 (1 minute)
   */
  timeWindow?: number | string;

  /**
   * Cache to store rate limit data
   * @default 10000 (10,000 entries)
   */
  cache?: number;

  /**
   * Allow list of IPs to skip rate limiting
   */
  allowList?: string[] | ((request: unknown, key: string) => boolean);

  /**
   * Custom key generator
   * @default IP address
   */
  keyGenerator?: (request: unknown) => string | Promise<string>;

  /**
   * Skip rate limiting for specific requests
   */
  skip?: (request: unknown) => boolean | Promise<boolean>;

  /**
   * Custom error response
   */
  errorResponseBuilder?: (request: unknown, context: unknown) => Record<string, unknown>;

  /**
   * Add rate limit headers to response
   * @default true
   */
  addHeaders?: {
    'x-ratelimit-limit'?: boolean;
    'x-ratelimit-remaining'?: boolean;
    'x-ratelimit-reset'?: boolean;
    'retry-after'?: boolean;
  };

  /**
   * Enable rate limiting globally
   * @default true
   */
  global?: boolean;

  /**
   * Ban duration in milliseconds (0 = no ban)
   * @default 0
   */
  ban?: number;

  /**
   * Custom hook to run when rate limit is exceeded
   */
  onExceeding?: (request: unknown, key: string) => void;

  /**
   * Custom hook to run when client is banned
   */
  onBanReach?: (request: unknown, key: string) => void;
}

/**
 * Detect if running in Bun runtime
 */
function isBunRuntime(): boolean {
  return typeof (globalThis as { Bun?: unknown }).Bun !== 'undefined';
}

/**
 * Detect if server is Fastify instance
 */
function isFastifyInstance(server: unknown): server is FastifyInstance {
  return (
    server !== null &&
    typeof server === 'object' &&
    'register' in server &&
    typeof (server as { register: unknown }).register === 'function'
  );
}

/**
 * Register Rate Limiting plugin
 * Works with both Fastify (Node.js) and Bun runtimes
 *
 * @param server - Server instance (FastifyInstance for Node.js, any for Bun)
 * @param options - Rate limit options
 *
 * @example
 * ```typescript
 * import { registerRateLimit } from 'tinyapi/plugins';
 *
 * // With Fastify (Node.js)
 * await registerRateLimit(app.getRawServer());
 *
 * // With Bun - Rate limiting is configured at adapter level
 * // See BunAdapter configuration for rate limiting support
 * ```
 */
export async function registerRateLimit(
  server: unknown,
  options: RateLimitOptions = {},
): Promise<void> {
  // Guard clauses
  if (!server) {
    throw new Error('Server instance is required');
  }

  // Detect runtime
  if (isBunRuntime()) {
    console.warn(
      '⚠️  Rate Limiting plugin: Bun runtime detected. Rate limiting is handled at the adapter level in Bun.',
    );
    return;
  }

  // Check if it's a Fastify instance
  if (!isFastifyInstance(server)) {
    throw new Error(
      'Rate Limiting plugin: Unsupported server type. Expected FastifyInstance for Node.js runtime.',
    );
  }

  // Dynamic import to keep @fastify/rate-limit as optional dependency
  let fastifyRateLimit: typeof import('@fastify/rate-limit').default;

  try {
    fastifyRateLimit = (await import('@fastify/rate-limit')).default;
  } catch (_error) {
    throw new Error(
      'Rate Limiting plugin requires @fastify/rate-limit to be installed. ' +
        'Run: pnpm add @fastify/rate-limit',
    );
  }

  // Pass options directly - Fastify handles undefined values correctly
  await server.register(fastifyRateLimit, {
    max: options.max ?? 100,
    timeWindow: options.timeWindow ?? 60000,
    cache: options.cache ?? 10000,
    global: options.global ?? true,
    allowList: options.allowList,
    keyGenerator: options.keyGenerator,
    skip: options.skip,
    errorResponseBuilder: options.errorResponseBuilder,
    addHeaders: options.addHeaders,
    ban: options.ban,
    onExceeding: options.onExceeding,
    onBanReach: options.onBanReach,
  } as any);
}
