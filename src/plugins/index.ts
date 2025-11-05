/**
 * SyntroJS Plugins
 *
 * Optional plugins for common use cases
 * All plugins are wrappers around Fastify plugins
 */

export { registerCompression } from './compression';
export { registerCors } from './cors';
export { registerHelmet } from './helmet';
export { registerRateLimit } from './rateLimit';

// Export unified types
export type { CompressionOptions, CorsOptions, RateLimitOptions, SecurityOptions } from './types';
