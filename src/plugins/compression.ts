/**
 * Compression Plugin - Wrapper for @fastify/compress
 *
 * Response compression for SyntroJS (gzip, deflate, brotli)
 */

import type { FastifyInstance } from 'fastify';

/**
 * Compression Configuration Options
 */
export interface CompressionOptions {
  /**
   * Enable/disable compression globally
   * @default true
   */
  global?: boolean;

  /**
   * Compression threshold in bytes
   * Only compress responses larger than this
   * @default 1024 (1KB)
   */
  threshold?: number;

  /**
   * Compression encodings to use
   * @default ['gzip', 'deflate', 'br']
   */
  encodings?: string[];

  /**
   * Custom compression level
   * 0 (no compression) to 9 (maximum compression)
   * @default 6
   */
  zlibOptions?: {
    level?: number;
  };

  /**
   * Brotli compression quality
   * 0 (fastest) to 11 (best compression)
   * @default 4
   */
  brotliOptions?: {
    params?: {
      [key: number]: number;
    };
  };

  /**
   * Custom function to determine if response should be compressed
   */
  customTypes?: RegExp;

  /**
   * Remove Content-Length header when compressing
   * @default true
   */
  removeContentLengthHeader?: boolean;
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
 * Register Compression plugin
 * Works with both Fastify (Node.js) and Bun runtimes
 *
 * @param server - Server instance (FastifyInstance for Node.js, any for Bun)
 * @param options - Compression options
 *
 * @example
 * ```typescript
 * import { registerCompression } from 'tinyapi/plugins';
 *
 * // With Fastify (Node.js)
 * await registerCompression(app.getRawServer());
 *
 * // With Bun - Compression is configured at adapter level
 * // See BunAdapter configuration for compression support
 * ```
 */
export async function registerCompression(
  server: unknown,
  options: CompressionOptions = {},
): Promise<void> {
  // Guard clauses
  if (!server) {
    throw new Error('Server instance is required');
  }

  // Detect runtime
  if (isBunRuntime()) {
    console.warn(
      '⚠️  Compression plugin: Bun runtime detected. Compression is handled at the adapter level in Bun.',
    );
    return;
  }

  // Check if it's a Fastify instance
  if (!isFastifyInstance(server)) {
    throw new Error(
      'Compression plugin: Unsupported server type. Expected FastifyInstance for Node.js runtime.',
    );
  }

  // Dynamic import to keep @fastify/compress as optional dependency
  let fastifyCompress: typeof import('@fastify/compress').default;

  try {
    fastifyCompress = (await import('@fastify/compress')).default;
  } catch (_error) {
    throw new Error(
      'Compression plugin requires @fastify/compress to be installed. ' +
        'Run: pnpm add @fastify/compress',
    );
  }

  // Pass options directly - Fastify handles undefined values correctly
  await server.register(fastifyCompress, {
    global: options.global ?? true,
    threshold: options.threshold ?? 1024,
    removeContentLengthHeader: options.removeContentLengthHeader ?? true,
    encodings: options.encodings,
    zlibOptions: options.zlibOptions,
    brotliOptions: options.brotliOptions,
    customTypes: options.customTypes,
  } as any);
}
