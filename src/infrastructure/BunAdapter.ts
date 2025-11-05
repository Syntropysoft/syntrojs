// Bun types are only available when running in Bun runtime
// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface BunServer {
  stop(): void;
}

interface Bun {
  serve(options: {
    port: number;
    hostname: string;
    fetch(request: Request): Promise<Response>;
  }): BunServer;
}

import type { DependencyMetadata } from '../application/DependencyInjector';
import { DependencyInjector } from '../application/DependencyInjector';
import { ErrorHandler } from '../application/ErrorHandler';
import type { MiddlewareRegistry } from '../application/MiddlewareRegistry';
import { MultipartParser } from '../application/MultipartParser';
import { SchemaValidator } from '../application/SchemaValidator';
import { StreamingResponseHandler } from '../application/StreamingResponseHandler';
import type { Route } from '../domain/Route';
import type { RequestContext } from '../domain/types';

/**
 * Bun-specific adapter for maximum performance
 * Uses Bun's native HTTP server instead of Fastify
 */

class BunAdapterImpl {
  private server: BunServer | null = null;
  private routes: Map<string, Route> = new Map();
  private middlewareRegistry?: MiddlewareRegistry;

  /**
   * Set middleware registry for this adapter
   */
  setMiddlewareRegistry(registry: MiddlewareRegistry): void {
    this.middlewareRegistry = registry;
  }

  /**
   * Creates a Bun native server adapter
   *
   * @returns Server adapter instance
   */
  create(): unknown {
    // Bun adapter doesn't create server until listen() is called
    return {
      type: 'bun',
      routes: this.routes,
    };
  }

  /**
   * Registers a route with Bun server
   *
   * @param server - Server instance
   * @param route - Route to register
   */
  registerRoute(_server: unknown, route: Route): void {
    // Store route for later use
    const key = `${route.method}:${route.path}`;
    this.routes.set(key, route);
  }

  /**
   * Starts Bun native HTTP server
   *
   * @param server - Server instance
   * @param port - Port to listen on
   * @param host - Host to bind to
   * @returns Server address
   */
  async listen(server: unknown, port: number, host = '::'): Promise<string> {
    // Guard clauses
    if (!server) {
      throw new Error('Server instance is required');
    }

    if (port < 0 || port > 65535) {
      throw new Error('Valid port number is required (0-65535)');
    }

    // Check if we're in Bun runtime
    if (typeof (globalThis as { Bun?: unknown }).Bun === 'undefined') {
      throw new Error('BunAdapter requires Bun runtime');
    }

    // Create Bun native server
    const self = this;
    const bun = (globalThis as { Bun?: Bun }).Bun!;
    this.server = bun.serve({
      port,
      hostname: host,
      async fetch(request: Request): Promise<Response> {
        return await self.handleRequest(request);
      },
    });

    this.isRunning = true;

    return `http://[${host}]:${port}`;
  }

  /**
   * Handles incoming HTTP requests
   *
   * @param request - Incoming request
   * @returns Response
   */
  private async handleRequest(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const method = request.method as string;
      const routeKey = `${method}:${url.pathname}`;

      // Find matching route
      let route = this.routes.get(routeKey);

      // Try to match with params (e.g., /users/:id)
      if (!route) {
        route = this.findRouteByPattern(method, url.pathname);
      }

      if (!route) {
        return new Response('Not Found', { status: 404 });
      }

      // Build request context
      const context = await this.buildContext(request, url);

      // Execute middlewares if registry is available
      if (this.middlewareRegistry) {
        const middlewares = this.middlewareRegistry.getMiddlewares(route.path, route.method);
        if (middlewares.length > 0) {
          await this.middlewareRegistry.executeMiddlewares(middlewares, context);
        }
      }

      // Resolve dependencies if specified
      if (route.config.dependencies) {
        const { resolved } = await DependencyInjector.resolve(
          route.config.dependencies as Record<string, DependencyMetadata<unknown>>,
          context,
        );
        context.dependencies = resolved;
      } else {
        context.dependencies = {};
      }

      // Validate params, query, body if schemas exist
      if (route.config.params) {
        context.params = SchemaValidator.validateOrThrow(route.config.params, context.params);
      }
      if (route.config.query) {
        context.query = SchemaValidator.validateOrThrow(route.config.query, context.query);
      }

      // Parse multipart form data if present (Dependency Inversion: use service)
      await MultipartParser.parseBun(request, context);

      // Parse JSON body if not multipart
      if (!context.files && route.config.body && ['POST', 'PUT', 'PATCH'].includes(method)) {
        const body = await request.json();
        context.body = SchemaValidator.validateOrThrow(route.config.body, body);
      }

      // Execute handler
      const result = await route.handler(context);

      // STREAMING SUPPORT: Check if result is a Stream (Node.js Readable)
      if (StreamingResponseHandler.isReadableStream(result)) {
        // Bun supports streaming via Response with stream body
        // Convert Node.js Readable to Web Streams API ReadableStream
        return new Response(result as any, {
          status: route.config.status ?? 200,
        });
      }

      // BUFFER SUPPORT: Check if result is a Buffer
      if (Buffer.isBuffer(result)) {
        // Bun handles buffers natively
        return new Response(result, {
          status: route.config.status ?? 200,
        });
      }

      // Return JSON response
      return new Response(JSON.stringify(result), {
        status: route.config.status ?? 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      // Handle errors
      return await this.handleError(error);
    }
  }

  /**
   * Finds route by pattern matching
   *
   * @param method - HTTP method
   * @param pathname - Request path
   * @returns Matching route or undefined
   */
  private findRouteByPattern(method: string, pathname: string): Route | undefined {
    for (const route of this.routes.values()) {
      if (route.method.toLowerCase() !== method.toLowerCase()) {
        continue;
      }

      // Simple pattern matching (e.g., /users/:id)
      const pattern = route.path.replace(/:\w+/g, '([^/]+)');
      const regex = new RegExp(`^${pattern}$`);
      if (regex.test(pathname)) {
        return route;
      }
    }
    return undefined;
  }

  /**
   * Builds request context from Bun request
   *
   * @param request - Bun request
   * @param url - Request URL
   * @returns Request context
   */
  private async buildContext(request: Request, url: URL): Promise<RequestContext> {
    // Parse path params (simple implementation)
    const params: Record<string, string> = {};
    const _pathSegments = url.pathname.split('/').filter(Boolean);

    // Extract query params
    const query: Record<string, string> = {};
    for (const [key, value] of url.searchParams.entries()) {
      query[key] = value;
    }

    // Extract headers
    const headers: Record<string, string> = {};
    for (const [key, value] of request.headers.entries()) {
      headers[key] = value;
    }

    return {
      method: request.method as any,
      path: url.pathname,
      params,
      query,
      body: {},
      headers,
      cookies: {},
      correlationId: headers['x-correlation-id'] || this.generateId(),
      timestamp: new Date(),
      dependencies: {},
      background: {
        addTask: (task) => setImmediate(task),
      },
    };
  }

  /**
   * Handles errors
   *
   * @param error - Error to handle
   * @returns Error response
   */
  private async handleError(error: unknown): Promise<Response> {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    const httpException = await ErrorHandler.handle(errorObj, {} as any);

    return new Response(JSON.stringify(httpException.body), {
      status: httpException.status,
      headers: { 'Content-Type': 'application/json', ...httpException.headers },
    });
  }

  /**
   * Generates a unique correlation ID
   *
   * @returns Correlation ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Stops Bun server
   *
   * @param server - Server instance
   */
  async close(server: unknown): Promise<void> {
    // Guard clause
    if (!server) {
      throw new Error('Server instance is required');
    }

    if (this.server) {
      this.server.stop();
      this.server = null;
      this.isRunning = false;
    }
  }
}

/**
 * Exported class (static methods for compatibility)
 */
export class BunAdapter {
  private static instance: BunAdapterImpl = new BunAdapterImpl();

  static setMiddlewareRegistry(registry: any): void {
    BunAdapter.instance.setMiddlewareRegistry(registry);
  }

  static create(): unknown {
    return BunAdapter.instance.create();
  }

  static registerRoute(server: unknown, route: any): void {
    BunAdapter.instance.registerRoute(server, route);
  }

  static async listen(server: unknown, port: number, host = '::'): Promise<string> {
    return BunAdapter.instance.listen(server, port, host);
  }

  static async close(server: unknown): Promise<void> {
    return BunAdapter.instance.close(server);
  }
}
