/**
 * CORS Plugin - Wrapper for @fastify/cors
 *
 * Cross-Origin Resource Sharing configuration for SyntroJS
 */

import type { FastifyInstance } from 'fastify';

/**
 * CORS Configuration Options
 */
export interface CorsOptions {
  /**
   * Allowed origins
   * @default '*'
   */
  origin?:
    | string
    | boolean
    | RegExp
    | Array<string | RegExp>
    | ((origin: string, callback: (err: Error | null, allow?: boolean) => void) => void);

  /**
   * Allowed methods
   * @default 'GET,HEAD,PUT,PATCH,POST,DELETE'
   */
  methods?: string | string[];

  /**
   * Allowed headers
   */
  allowedHeaders?: string | string[];

  /**
   * Exposed headers
   */
  exposedHeaders?: string | string[];

  /**
   * Allow credentials
   * @default false
   */
  credentials?: boolean;

  /**
   * Max age for preflight cache
   */
  maxAge?: number;

  /**
   * Preflight continue
   */
  preflightContinue?: boolean;

  /**
   * Strict preflight
   */
  strictPreflight?: boolean;
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
 * Register CORS plugin
 * Works with both Fastify (Node.js) and Bun runtimes
 *
 * @param server - Server instance (FastifyInstance for Node.js, any for Bun)
 * @param options - CORS options
 *
 * @example
 * ```typescript
 * import { registerCors } from 'tinyapi/plugins';
 *
 * // With Fastify (Node.js)
 * await registerCors(app.getRawServer(), { origin: '*' });
 *
 * // With Bun - CORS is configured at adapter level
 * // See BunAdapter configuration for CORS support
 * ```
 */
export async function registerCors(server: unknown, options: CorsOptions = {}): Promise<void> {
  // Guard clauses
  if (!server) {
    throw new Error('Server instance is required');
  }

  // Detect runtime
  if (isBunRuntime()) {
    console.warn(
      '⚠️  CORS plugin: Bun runtime detected. CORS configuration is handled at the adapter level in Bun. ' +
        'Use BunAdapter configuration to set CORS headers.',
    );
    return;
  }

  // Check if it's a Fastify instance
  if (!isFastifyInstance(server)) {
    throw new Error(
      'CORS plugin: Unsupported server type. Expected FastifyInstance for Node.js runtime.',
    );
  }

  // Dynamic import to keep @fastify/cors as optional dependency
  let fastifyCors: typeof import('@fastify/cors').default;

  try {
    fastifyCors = (await import('@fastify/cors')).default;
  } catch (_error) {
    throw new Error(
      'CORS plugin requires @fastify/cors to be installed. ' + 'Run: pnpm add @fastify/cors',
    );
  }

  // Pass options directly - Fastify handles undefined values correctly
  await server.register(fastifyCors, {
    origin: options.origin ?? true,
    credentials: options.credentials ?? false,
    methods: options.methods,
    allowedHeaders: options.allowedHeaders,
    exposedHeaders: options.exposedHeaders,
    maxAge: options.maxAge,
    preflightContinue: options.preflightContinue,
    strictPreflight: options.strictPreflight,
  } as any);
}
