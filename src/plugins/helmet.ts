/**
 * Helmet Plugin - Wrapper for @fastify/helmet
 *
 * Security headers configuration for SyntroJS
 */

import type { FastifyInstance } from 'fastify';

/**
 * Helmet Configuration Options
 *
 * Sets secure HTTP headers to protect against common vulnerabilities
 */
export interface HelmetOptions {
  /**
   * Enable all security headers
   * @default true
   */
  global?: boolean;

  /**
   * Content Security Policy
   */
  contentSecurityPolicy?: boolean | Record<string, unknown>;

  /**
   * Cross-Origin-Embedder-Policy
   */
  crossOriginEmbedderPolicy?: boolean;

  /**
   * Cross-Origin-Opener-Policy
   */
  crossOriginOpenerPolicy?: boolean;

  /**
   * Cross-Origin-Resource-Policy
   */
  crossOriginResourcePolicy?: boolean;

  /**
   * Origin-Agent-Cluster
   */
  originAgentCluster?: boolean;

  /**
   * Referrer-Policy
   */
  referrerPolicy?: boolean | { policy: string | string[] };

  /**
   * Strict-Transport-Security
   */
  hsts?:
    | boolean
    | {
        maxAge?: number;
        includeSubDomains?: boolean;
        preload?: boolean;
      };

  /**
   * X-Content-Type-Options
   */
  noSniff?: boolean;

  /**
   * X-DNS-Prefetch-Control
   */
  dnsPrefetchControl?: boolean;

  /**
   * X-Download-Options
   */
  ieNoOpen?: boolean;

  /**
   * X-Frame-Options
   */
  frameguard?: boolean | { action: string };

  /**
   * X-Permitted-Cross-Domain-Policies
   */
  permittedCrossDomainPolicies?: boolean;

  /**
   * X-XSS-Protection
   */
  xssFilter?: boolean;
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
 * Register Helmet plugin
 * Works with both Fastify (Node.js) and Bun runtimes
 *
 * @param server - Server instance (FastifyInstance for Node.js, any for Bun)
 * @param options - Helmet options
 *
 * @example
 * ```typescript
 * import { registerHelmet } from 'tinyapi/plugins';
 *
 * // With Fastify (Node.js)
 * await registerHelmet(app.getRawServer());
 *
 * // With Bun - Security headers are configured at adapter level
 * // See BunAdapter configuration for security headers support
 * ```
 */
export async function registerHelmet(server: unknown, options: HelmetOptions = {}): Promise<void> {
  // Guard clauses
  if (!server) {
    throw new Error('Server instance is required');
  }

  // Detect runtime
  if (isBunRuntime()) {
    console.warn(
      '⚠️  Helmet plugin: Bun runtime detected. Security headers configuration is handled at the adapter level in Bun.',
    );
    return;
  }

  // Check if it's a Fastify instance
  if (!isFastifyInstance(server)) {
    throw new Error(
      'Helmet plugin: Unsupported server type. Expected FastifyInstance for Node.js runtime.',
    );
  }

  // Dynamic import to keep @fastify/helmet as optional dependency
  let fastifyHelmet: typeof import('@fastify/helmet').default;

  try {
    fastifyHelmet = (await import('@fastify/helmet')).default;
  } catch (_error) {
    throw new Error(
      'Helmet plugin requires @fastify/helmet to be installed. ' + 'Run: pnpm add @fastify/helmet',
    );
  }

  // Pass options directly - Fastify handles undefined values correctly
  await server.register(fastifyHelmet, {
    global: options.global ?? true,
    contentSecurityPolicy: options.contentSecurityPolicy,
    crossOriginEmbedderPolicy: options.crossOriginEmbedderPolicy,
    crossOriginOpenerPolicy: options.crossOriginOpenerPolicy,
    crossOriginResourcePolicy: options.crossOriginResourcePolicy,
    originAgentCluster: options.originAgentCluster,
    referrerPolicy: options.referrerPolicy,
    hsts: options.hsts,
    noSniff: options.noSniff,
    dnsPrefetchControl: options.dnsPrefetchControl,
    ieNoOpen: options.ieNoOpen,
    frameguard: options.frameguard,
    permittedCrossDomainPolicies: options.permittedCrossDomainPolicies,
    xssFilter: options.xssFilter,
  } as any);
}
