/**
 * Logger Integration for SyntroJS
 *
 * Integrates @syntrojs/logger with SyntroJS framework
 * Provides automatic request/response logging with correlation IDs
 */

import { AsyncContext, JsonTransport } from '@syntrojs/logger';
import { getLogger } from '@syntrojs/logger/registry';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { setComponentLoggingEnabled } from './LoggerHelper';
import { getLogLevelForStatusCode } from './LogLevelMapper';

/**
 * Logger integration configuration
 */
export interface LoggerIntegrationConfig {
  /** Enable request/response logging */
  enabled?: boolean;
  /** Enable component-level logging (ErrorHandler, BackgroundTasks, etc.) */
  componentLogging?: boolean;
  /** Logger name */
  name?: string;
  /** Log level */
  level?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'silent';
  /** Include request body in logs */
  logRequestBody?: boolean;
  /** Include response body in logs */
  logResponseBody?: boolean;
  /** Log request/response headers */
  logHeaders?: boolean;
}

/**
 * Integrates @syntrojs/logger with Fastify instance
 *
 * @param fastify - Fastify instance
 * @param config - Logger configuration
 */
export function integrateLogger(
  fastify: FastifyInstance,
  config: LoggerIntegrationConfig = {},
): void {
  // Guard clause: Logger disabled
  if (config.enabled === false) {
    return;
  }

  const loggerName = config.name || 'syntrojs';
  const logger = getLogger(loggerName, {
    level: config.level || 'info',
    transport: new JsonTransport(), // JSON for production
  });

  // Configure component-level logging
  setComponentLoggingEnabled(config.componentLogging !== false);

  /**
   * Generates a correlation ID for request tracking
   * Pure function: no side effects, deterministic
   *
   * @returns Correlation ID string
   */
  const generateCorrelationId = (): string => {
    // Guard clause: use native UUID if available (Node.js 18+, Bun)
    // biome-ignore lint/suspicious/noExplicitAny: globalThis.crypto needs explicit any for type compatibility
    const globalCrypto = (globalThis as any).crypto;
    if (globalCrypto && typeof globalCrypto.randomUUID === 'function') {
      return globalCrypto.randomUUID();
    }

    // Fallback for older Node.js versions (functional approach)
    // Immutable: generates new ID each time
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  };

  // Add request ID to context
  fastify.addHook('onRequest', async (request: FastifyRequest, _reply: FastifyReply) => {
    // Generate or use existing correlation ID
    const correlationId =
      (request.headers['x-correlation-id'] as string) || generateCorrelationId();

    // Store in request for later access
    (request as FastifyRequest & { correlationId?: string }).correlationId = correlationId;

    // Set correlation ID in async context for this request
    // Functional approach: run within context with initial data
    AsyncContext.runAsync(
      async () => {
        // Store reference in request for hooks that don't have context
        (request as FastifyRequest & { correlationId?: string }).correlationId = correlationId;

        // Log incoming request
        const requestLogger = logger.withTransactionId(correlationId).withSource('http-request');

        const requestData: Record<string, unknown> = {
          method: request.method,
          url: request.url,
          ip: request.ip,
          userAgent: request.headers['user-agent'],
        };

        if (config.logHeaders) {
          requestData.headers = request.headers;
        }

        if (config.logRequestBody && request.body) {
          requestData.body = request.body;
        }

        requestLogger.info(requestData, `${request.method} ${request.url}`);
      },
      { correlationId },
    );
  });

  // Log response
  fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    // Functional approach: extract correlation ID with fallback
    const requestWithId = request as FastifyRequest & { correlationId?: string };
    const correlationId =
      requestWithId.correlationId ??
      (request.headers['x-correlation-id'] as string | undefined) ??
      'unknown';

    // Functional composition: build logger with context
    const responseLogger = logger.withTransactionId(correlationId).withSource('http-response');

    // Functional approach: build response data immutably
    const responseData: Record<string, unknown> = {
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      responseTime: reply.getResponseTime(),
    };

    // Conditional data addition (functional: new object if condition met)
    // Note: FastifyReply doesn't expose body directly, it's sent via reply.send()
    // Response body logging would need to be done via a hook or serializer

    // Strategy Pattern: use dictionary instead of ternary
    const level = getLogLevelForStatusCode(reply.statusCode);

    // Functional: call logger method based on level
    // Use type-safe method calls instead of indexing
    switch (level) {
      case 'error':
        responseLogger.error(
          responseData,
          `${request.method} ${request.url} - ${reply.statusCode}`,
        );
        break;
      case 'warn':
        responseLogger.warn(responseData, `${request.method} ${request.url} - ${reply.statusCode}`);
        break;
      default:
        responseLogger.info(responseData, `${request.method} ${request.url} - ${reply.statusCode}`);
    }
  });

  // Log errors
  fastify.addHook('onError', async (request: FastifyRequest, reply: FastifyReply, error: Error) => {
    // Guard clause: validate error
    if (!error) {
      return;
    }

    // Functional approach: extract correlation ID with fallback
    const requestWithId = request as FastifyRequest & { correlationId?: string };
    const correlationId =
      requestWithId.correlationId ??
      (request.headers['x-correlation-id'] as string | undefined) ??
      'unknown';

    // Functional composition: build logger with context
    const errorLogger = logger.withTransactionId(correlationId).withSource('http-error');

    // Functional approach: build error data immutably
    const errorData: Record<string, unknown> = {
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode ?? 500,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
    };

    errorLogger.error(errorData, `Error in ${request.method} ${request.url}`);
  });

  // Log server startup
  fastify.addHook('onReady', async () => {
    logger.info({ name: loggerName }, 'SyntroJS server started');
  });

  // Log server shutdown
  fastify.addHook('onClose', async () => {
    logger.info({ name: loggerName }, 'SyntroJS server shutting down');
  });
}
