/**
 * BunAdapter - Refactored with SOLID + DDD + Dependency Injection
 *
 * Infrastructure Layer (Dependency Inversion Principle)
 * Depends on abstractions (interfaces), not concrete implementations
 */

// Bun types
interface BunServer {
  stop(): void;
  port: number;
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
import { ResponseHandler } from '../application/ResponseHandler';
import { SerializerRegistry } from '../application/SerializerRegistry';
import type { IRequestParser, IValidator } from '../domain/interfaces';
import type { Route } from '../domain/Route';

/**
 * BunAdapter Implementation
 * Uses Dependency Injection for all services
 */
class BunAdapterImpl {
  private server: BunServer | null = null;
  private routes: Map<string, Route> = new Map();
  private middlewareRegistry?: MiddlewareRegistry;
  private responseHandler: ResponseHandler;

  // DEPENDENCY INJECTION: Services injected via constructor
  constructor(
    private requestParser: IRequestParser,
    private validator: IValidator,
    private serializerRegistry: SerializerRegistry,
  ) {
    // Create ResponseHandler with SerializerRegistry (Composition + DI)
    this.responseHandler = new ResponseHandler(serializerRegistry);
  }

  /**
   * Set middleware registry
   */
  setMiddlewareRegistry(registry: MiddlewareRegistry): void {
    this.middlewareRegistry = registry;
  }

  /**
   * Set serializer registry
   */
  setSerializerRegistry(registry: SerializerRegistry): void {
    this.serializerRegistry = registry;
    // Update ResponseHandler with new registry (Composition + DI)
    this.responseHandler = new ResponseHandler(registry);
  }

  /**
   * Create server adapter
   */
  create(): unknown {
    return {
      adapter: 'bun',
      version: '1.0.0',
    };
  }

  /**
   * Register route
   */
  registerRoute(_server: unknown, route: Route): void {
    const routeKey = `${route.method}:${route.path}`;
    this.routes.set(routeKey, route);
  }

  /**
   * Start Bun server
   */
  async listen(server: unknown, port: number, host = '::'): Promise<string> {
    // Guard clauses
    if (!server) throw new Error('Server instance is required');
    if (port < 0 || port > 65535) throw new Error('Valid port number is required (0-65535)');

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

    // Use the actual port assigned by Bun (important when port = 0)
    const actualPort = this.server.port;
    return `http://[${host}]:${actualPort}`;
  }

  /**
   * Handle incoming HTTP request
   * Orchestrates the request pipeline
   *
   * SOLID: Each step delegates to specialized services
   */
  private async handleRequest(request: Request): Promise<Response> {
    let context: any = null;

    try {
      const url = new URL(request.url);
      const method = request.method as string;

      // 1. ROUTING: Find matching route
      const route = this.findRoute(method, url.pathname);
      if (!route) {
        return new Response('Not Found', { status: 404 });
      }

      // 2. CONTEXT BUILDING: Delegate to RequestParser (Dependency Inversion)
      context = await this.requestParser.buildContext(request, url, route);

      // 3. MIDDLEWARE: Execute if available
      await this.executeMiddlewares(route, context);

      // 4. DEPENDENCY INJECTION: Resolve dependencies if specified
      await this.resolveDependencies(route, context);

      // 5. VALIDATION: Delegate to Validator (Dependency Inversion)
      await this.validateRequest(route, request, context);

      // 6. HANDLER: Execute business logic
      const result = await route.handler(context);

      // 6.5. RESPONSE VALIDATION: Validate response against schema if provided
      if (route.config.response) {
        const validatedResult = this.validator.validateOrThrow(route.config.response, result);
        // 7. SERIALIZATION: Delegate to ResponseHandler (Composition + DI)
        return await this.serializeResponse(validatedResult, route.config.status ?? 200, request);
      }

      // 7. SERIALIZATION: Delegate to ResponseHandler (Composition + DI)
      return await this.serializeResponse(result, route.config.status ?? 200, request);
    } catch (error) {
      return await this.handleError(error, context);
    }
  }

  /**
   * Find route by method and path
   * Uses pattern matching for dynamic routes
   */
  private findRoute(method: string, pathname: string): Route | undefined {
    const routeKey = `${method}:${pathname}`;

    // Try exact match first
    const route = this.routes.get(routeKey);
    if (route) return route;

    // Try pattern matching for dynamic routes
    for (const r of this.routes.values()) {
      if (r.method.toLowerCase() !== method.toLowerCase()) continue;

      const pattern = r.path.replace(/:\w+/g, '([^/]+)');
      const regex = new RegExp(`^${pattern}$`);
      if (regex.test(pathname)) {
        return r;
      }
    }

    return undefined;
  }

  /**
   * Execute middlewares
   * Guard clause: Only if middleware registry exists
   */
  private async executeMiddlewares(route: Route, context: any): Promise<void> {
    if (!this.middlewareRegistry) return;

    const middlewares = this.middlewareRegistry.getMiddlewares(route.path, route.method);
    if (middlewares.length > 0) {
      await this.middlewareRegistry.executeMiddlewares(middlewares, context);
    }
  }

  /**
   * Resolve dependencies
   * Guard clause: Only if route has dependencies
   */
  private async resolveDependencies(route: Route, context: any): Promise<void> {
    if (route.config.dependencies) {
      const { resolved } = await DependencyInjector.resolve(
        route.config.dependencies as Record<string, DependencyMetadata<unknown>>,
        context,
      );
      context.dependencies = resolved;
    } else {
      context.dependencies = {};
    }
  }

  /**
   * Validate request
   * Delegates to Validator service (Dependency Inversion)
   */
  private async validateRequest(route: Route, request: Request, context: any): Promise<void> {
    // Validate params
    if (route.config.params) {
      context.params = this.validator.validateOrThrow(route.config.params, context.params);
    }

    // Validate query
    if (route.config.query) {
      context.query = this.validator.validateOrThrow(route.config.query, context.query);
    }

    // Parse multipart form data
    await MultipartParser.parseBun(request, context);

    // Parse body for POST/PUT/PATCH (ALWAYS parse, validate only if schema exists)
    // Single Responsibility: Parsing and validation are separate concerns
    if (!context.files && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
      const contentType = request.headers.get('content-type') || '';
      const parsedBody = await this.requestParser.parseBody(request, contentType);

      // Validate body if schema is provided
      if (route.config.body) {
        context.body = this.validator.validateOrThrow(route.config.body, parsedBody);
      } else {
        // No validation: use parsed body as-is
        context.body = parsedBody;
      }
    }
  }

  /**
   * Serialize response using ResponseHandler (SOLID: Composition over Duplication)
   *
   * Optimized: Uses ResponseHandler DTO approach
   * Bun-friendly: Returns Web Standard Response directly
   */
  private async serializeResponse(
    result: any,
    defaultStatus: number,
    request: Request,
  ): Promise<Response> {
    // Extract Accept header for content negotiation
    const acceptHeader = request.headers.get('accept') ?? undefined;

    // Use ResponseHandler for serialization (Composition + DI)
    const serialized = await this.responseHandler.serialize(result, defaultStatus, acceptHeader);

    // Convert DTO to Web Standard Response (Bun native format)
    return new Response(serialized.body, {
      status: serialized.statusCode,
      headers: serialized.headers,
    });
  }

  /**
   * Handle errors
   */
  private async handleError(error: unknown, context?: any): Promise<Response> {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    const httpException = await ErrorHandler.handle(errorObj, context || ({} as any));

    return new Response(JSON.stringify(httpException.body), {
      status: httpException.status,
      headers: { 'Content-Type': 'application/json', ...httpException.headers },
    });
  }

  /**
   * Stop Bun server
   */
  async close(server: unknown): Promise<void> {
    if (!server) throw new Error('Server instance is required');

    if (this.server) {
      this.server.stop();
      this.server = null;
    }
  }
}

/**
 * BunAdapter Factory
 * Creates BunAdapter with default dependencies
 */
export class BunAdapter {
  private static instance: BunAdapterImpl | null = null;

  /**
   * Create BunAdapter with dependency injection
   * Factory Method Pattern
   */
  static createWithDependencies(
    requestParser: IRequestParser,
    validator: IValidator,
    serializerRegistry: SerializerRegistry,
  ): BunAdapterImpl {
    return new BunAdapterImpl(requestParser, validator, serializerRegistry);
  }

  /**
   * Get or create default instance
   * Uses default dependencies
   */
  private static getInstance(): BunAdapterImpl {
    if (!BunAdapter.instance) {
      // Import default implementations
      const { BunRequestParser } = require('../application/BunRequestParser');
      const { SchemaValidator } = require('../application/SchemaValidator');
      const {
        RedirectSerializer,
        FileDownloadSerializer,
        StreamSerializer,
        BufferSerializer,
        CustomResponseSerializer,
        JsonSerializer,
      } = require('../application/serializers');

      // Create serializer registry with defaults
      const registry = new SerializerRegistry();
      registry
        .register(new CustomResponseSerializer(), 'CustomResponse')
        .register(new RedirectSerializer(), 'Redirect')
        .register(new FileDownloadSerializer(), 'FileDownload')
        .register(new StreamSerializer(), 'Stream')
        .register(new BufferSerializer(), 'Buffer')
        .register(new JsonSerializer(), 'Json'); // Last: default fallback

      // Create with default dependencies
      BunAdapter.instance = new BunAdapterImpl(
        new BunRequestParser(),
        SchemaValidator, // Singleton
        registry,
      );
    }
    return BunAdapter.instance;
  }

  // Static methods for backward compatibility
  static setMiddlewareRegistry(registry: any): void {
    BunAdapter.getInstance().setMiddlewareRegistry(registry);
  }

  static setSerializerRegistry(registry: SerializerRegistry): void {
    BunAdapter.getInstance().setSerializerRegistry(registry);
  }

  static create(): unknown {
    return BunAdapter.getInstance().create();
  }

  static registerRoute(server: unknown, route: any): void {
    BunAdapter.getInstance().registerRoute(server, route);
  }

  static async listen(server: unknown, port: number, host = '::'): Promise<string> {
    return BunAdapter.getInstance().listen(server, port, host);
  }

  static async close(server: unknown): Promise<void> {
    return BunAdapter.getInstance().close(server);
  }

  /**
   * Clear singleton instance (for testing only)
   * Allows tests to start with a fresh adapter
   */
  static clearInstance(): void {
    BunAdapter.instance = null;
  }
}
