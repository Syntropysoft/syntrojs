/**
 * FastifyAdapter - Infrastructure Layer
 *
 * Responsibility: Adapt Fastify to work with our domain models
 * Pattern: Adapter Pattern
 * Principles: Dependency Inversion (depend on abstractions, not Fastify directly)
 */

import type { Readable } from 'node:stream';
import formbody from '@fastify/formbody';
import multipart from '@fastify/multipart';
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import { BackgroundTasks } from '../application/BackgroundTasks';
import { createAcceptsHelper } from '../application/ContentNegotiator';
import type { DependencyMetadata } from '../application/DependencyInjector';
import { DependencyInjector } from '../application/DependencyInjector';
import { ErrorHandler } from '../application/ErrorHandler';
import type { MiddlewareRegistry } from '../application/MiddlewareRegistry';
import { MultipartParser } from '../application/MultipartParser';
import { SchemaValidator } from '../application/SchemaValidator';
import { StreamingResponseHandler } from '../application/StreamingResponseHandler';
import type { Route } from '../domain/Route';
import type { HttpMethod, RequestContext } from '../domain/types';
import { createFileDownload, isFileDownloadResponse } from './FileDownloadHelper';
import { integrateLogger, type LoggerIntegrationConfig } from './LoggerIntegration';
import { createRedirect, isRedirectResponse } from './RedirectHelper';

/**
 * Fastify adapter configuration
 */
export interface FastifyAdapterConfig {
  /** Enable Fastify built-in logger (legacy) */
  logger?: boolean;
  /** Disable Fastify request logging */
  disableRequestLogging?: boolean;
  /** Enable @syntrojs/logger integration */
  syntroLogger?: LoggerIntegrationConfig | boolean;
}

/**
 * Fastify adapter implementation
 */
class FastifyAdapterImpl {
  private middlewareRegistry?: MiddlewareRegistry;

  /**
   * Creates and configures Fastify instance
   *
   * Each call creates a NEW instance (no singleton at this level)
   *
   * @param config - Adapter configuration
   * @returns Configured Fastify instance
   */
  create(config: FastifyAdapterConfig = {}): FastifyInstance {
    // Create NEW Fastify instance every time
    const instance = Fastify({
      logger: config.logger ?? false,
      disableRequestLogging: config.disableRequestLogging ?? true,
    });

    // Register formbody plugin for application/x-www-form-urlencoded
    instance.register(formbody);

    // Register multipart plugin for file uploads
    instance.register(multipart, {
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB default max file size
        files: 10, // Max 10 files per request
      },
    });

    // Integrate @syntrojs/logger if enabled
    if (config.syntroLogger) {
      const loggerConfig: LoggerIntegrationConfig =
        typeof config.syntroLogger === 'boolean'
          ? { enabled: config.syntroLogger }
          : config.syntroLogger;
      integrateLogger(instance, loggerConfig);
    }

    return instance;
  }

  /**
   * Set middleware registry for this adapter
   */
  setMiddlewareRegistry(registry: MiddlewareRegistry): void {
    this.middlewareRegistry = registry;
  }

  /**
   * Registers a route with Fastify
   *
   * @param fastify - Fastify instance
   * @param route - Route to register
   */
  registerRoute(fastify: FastifyInstance, route: Route): void {
    // Guard clauses
    if (!fastify) {
      throw new Error('Fastify instance is required');
    }

    if (!route) {
      throw new Error('Route is required');
    }

    // Convert method to lowercase for Fastify
    const method = route.method.toLowerCase() as Lowercase<HttpMethod>;

    // Register route with Fastify
    fastify[method](route.path, async (request: FastifyRequest, reply: FastifyReply) => {
      let cleanup: (() => Promise<void>) | undefined;

      try {
        // Build request context from Fastify request
        const context = this.buildContext(request);

        // Parse multipart form data if present (Dependency Inversion: use service)
        await MultipartParser.parseFastify(request, context);

        // Execute middlewares if registry is available
        if (this.middlewareRegistry) {
          const middlewares = this.middlewareRegistry.getMiddlewares(route.path, route.method);
          if (middlewares.length > 0) {
            await this.middlewareRegistry.executeMiddlewares(middlewares, context);
          }
        }

        // Resolve dependencies if specified
        if (route.config.dependencies) {
          const { resolved, cleanup: cleanupFn } = await DependencyInjector.resolve(
            route.config.dependencies as Record<string, DependencyMetadata<unknown>>,
            context,
          );
          context.dependencies = resolved;
          cleanup = cleanupFn;
        } else {
          // No dependencies, use empty object
          context.dependencies = {};
        }

        // Validate params if schema exists
        if (route.config.params) {
          context.params = SchemaValidator.validateOrThrow(route.config.params, request.params);
        }

        // Validate query if schema exists
        if (route.config.query) {
          context.query = SchemaValidator.validateOrThrow(route.config.query, request.query);
        }

        // Validate body if schema exists
        if (route.config.body) {
          context.body = SchemaValidator.validateOrThrow(route.config.body, request.body);
        }

        // Execute handler
        const result = await route.handler(context);

        // REDIRECT SUPPORT: Check if result is a redirect response
        // Pattern: { statusCode: 301|302|303|307|308, headers: { 'Location': ... }, body: null }
        // Priority: Check FIRST (redirects have no body, exit early)
        if (isRedirectResponse(result)) {
          // Cleanup dependencies before sending
          if (cleanup) {
            await cleanup();
          }

          // Set all headers from redirect response (immutable)
          for (const [key, value] of Object.entries(result.headers)) {
            reply.header(key, value);
          }

          // Send redirect with appropriate status code (body is always null)
          return reply.status(result.statusCode).send();
        }

        // FILE DOWNLOAD SUPPORT: Check if result is a file download response
        // Pattern: { data: Buffer|Stream|string, headers: { 'Content-Disposition': ... } }
        // Priority: Check AFTER redirect but BEFORE Stream/Buffer to allow custom headers
        if (isFileDownloadResponse(result)) {
          // Cleanup dependencies before sending
          if (cleanup) {
            await cleanup();
          }

          // Set all headers from file download response (immutable)
          for (const [key, value] of Object.entries(result.headers)) {
            reply.header(key, value);
          }

          // Send file data with custom status
          return reply.status(result.statusCode).send(result.data);
        }

        // STREAMING SUPPORT: Check if result is a Stream (Node.js Readable)
        if (StreamingResponseHandler.isReadableStream(result)) {
          // Cleanup dependencies before streaming
          if (cleanup) {
            await cleanup();
          }

          // Send stream directly - Fastify handles Transfer-Encoding automatically
          const statusCode = route.config.status ?? 200;
          return reply.status(statusCode).send(result as Readable);
        }

        // BUFFER SUPPORT: Check if result is a Buffer
        if (Buffer.isBuffer(result)) {
          // Cleanup dependencies
          if (cleanup) {
            await cleanup();
          }

          // Send buffer directly - Fastify handles Content-Length automatically
          const statusCode = route.config.status ?? 200;
          return reply.status(statusCode).send(result);
        }

        // Validate response if schema exists
        // Skip validation for streams and buffers (already handled above)
        if (route.config.response) {
          SchemaValidator.validateOrThrow(route.config.response, result);
        }

        // Cleanup dependencies
        if (cleanup) {
          await cleanup();
        }

        // Check if result is a RouteResponse object (has status, body, headers)
        // This allows handlers to return { status, body, headers } for full control
        if (result && typeof result === 'object' && 'status' in result && 'body' in result) {
          const response = result as {
            status: number;
            body: unknown;
            headers?: Record<string, string>;
          };

          // Set content type first if provided
          if (response.headers?.['Content-Type']) {
            reply.type(response.headers['Content-Type']);
          }

          // Set other headers if provided
          if (response.headers) {
            for (const [key, value] of Object.entries(response.headers)) {
              if (key !== 'Content-Type') {
                reply.header(key, value);
              }
            }
          }

          return reply.status(response.status).send(response.body);
        }

        // Send response as-is (string, object, etc.)
        const statusCode = route.config.status ?? 200;
        return reply.status(statusCode).send(result);
      } catch (error) {
        // Cleanup dependencies on error
        if (cleanup) {
          try {
            await cleanup();
          } catch (cleanupError) {
            // Log cleanup error but don't override original error
            console.error('Dependency cleanup failed:', cleanupError);
          }
        }

        // Handle error using ErrorHandler
        const context = this.buildContext(request);
        context.dependencies = {}; // Empty dependencies for error context
        const response = await ErrorHandler.handle(error as Error, context);

        // Send error response
        if (response.headers) {
          for (const [key, value] of Object.entries(response.headers)) {
            reply.header(key, value);
          }
        }

        return reply.status(response.status).send(response.body);
      }
    });
  }

  /**
   * Builds request context from Fastify request
   *
   * Pure function: transforms Fastify request to our context
   *
   * @param request - Fastify request
   * @returns Request context
   */
  private buildContext(request: FastifyRequest): RequestContext {
    return {
      method: request.method as HttpMethod,
      path: request.url,
      params: request.params as any,
      query: request.query as any,
      body: request.body as any,
      headers: request.headers as Record<string, string>,
      cookies: (request as any).cookies ?? {},
      correlationId: (request.headers['x-correlation-id'] as string) ?? this.generateId(),
      timestamp: new Date(),
      // Dependencies will be resolved later if needed
      dependencies: {},
      // Background tasks manager
      background: {
        addTask: (task, options) => BackgroundTasks.addTask(task, options),
      },
      // File download helper (functional)
      download: (data, options) => createFileDownload(data, options),
      // HTTP redirect helper (functional)
      redirect: (url, statusCode) => createRedirect(url, statusCode),
      // Content negotiation helper (functional)
      accepts: createAcceptsHelper(request.headers.accept),
    };
  }

  /**
   * Generates a unique correlation ID
   *
   * Pure function: generates random ID
   *
   * @returns Correlation ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Starts Fastify server
   *
   * @param fastify - Fastify instance
   * @param port - Port to listen on
   * @param host - Host to bind to
   * @returns Server address
   */
  async listen(fastify: FastifyInstance, port: number, host = '0.0.0.0'): Promise<string> {
    // Guard clauses
    if (!fastify) {
      throw new Error('Fastify instance is required');
    }

    if (port < 0 || port > 65535) {
      throw new Error('Valid port number is required (0-65535)');
    }

    // Start server
    const address = await fastify.listen({ port, host });

    return address;
  }

  /**
   * Stops Fastify server
   *
   * @param fastify - Fastify instance
   */
  async close(fastify: FastifyInstance): Promise<void> {
    // Guard clause
    if (!fastify) {
      throw new Error('Fastify instance is required');
    }

    await fastify.close();
  }
}

/**
 * Exported singleton (Module Pattern)
 */
class FastifyAdapterSingleton {
  private static instance: FastifyAdapterImpl = new FastifyAdapterImpl();

  static create(config?: FastifyAdapterConfig): FastifyInstance {
    return FastifyAdapterSingleton.instance.create(config);
  }

  static setMiddlewareRegistry(registry: MiddlewareRegistry): void {
    FastifyAdapterSingleton.instance.setMiddlewareRegistry(registry);
  }

  static registerRoute(fastify: FastifyInstance, route: Route): void {
    FastifyAdapterSingleton.instance.registerRoute(fastify, route);
  }

  static async listen(fastify: FastifyInstance, port: number, host = '0.0.0.0'): Promise<string> {
    return FastifyAdapterSingleton.instance.listen(fastify, port, host);
  }

  static async close(fastify: FastifyInstance): Promise<void> {
    return FastifyAdapterSingleton.instance.close(fastify);
  }
}

export const FastifyAdapter = FastifyAdapterSingleton;

/**
 * Factory for testing
 */
export const createFastifyAdapter = (): FastifyAdapterImpl => new FastifyAdapterImpl();
