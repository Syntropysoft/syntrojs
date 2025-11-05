/**
 * SyntroJS - Core Facade
 *
 * Responsibility: Public API and orchestration of all layers
 * Pattern: Facade Pattern
 * Principles: SOLID, DDD, Guard Clauses, Clean API
 */

import type { FastifyInstance } from 'fastify';
import { DocsRenderer } from '../application/DocsRenderer';
import { ErrorHandler } from '../application/ErrorHandler';
import { MiddlewareRegistry } from '../application/MiddlewareRegistry';
import type { OpenAPIConfig } from '../application/OpenAPIGenerator';
import { OpenAPIGenerator } from '../application/OpenAPIGenerator';
import { RouteRegistry } from '../application/RouteRegistry';
import { WebSocketRegistry } from '../application/WebSocketRegistry';
import { Route } from '../domain/Route';
import type {
  ExceptionHandler,
  HttpMethod,
  Middleware,
  MiddlewareConfig,
  RouteConfig,
  WebSocketHandler,
} from '../domain/types';
import { BunAdapter } from '../infrastructure/BunAdapter';
import { FastifyAdapter } from '../infrastructure/FastifyAdapter';
import { FluentAdapter } from '../infrastructure/FluentAdapter';
import type { LoggerIntegrationConfig } from '../infrastructure/LoggerIntegration';
import { RuntimeOptimizer } from '../infrastructure/RuntimeOptimizer';
import { UltraFastAdapter } from '../infrastructure/UltraFastAdapter';
import { UltraFastifyAdapter } from '../infrastructure/UltraFastifyAdapter';
import { UltraMinimalAdapter } from '../infrastructure/UltraMinimalAdapter';

/**
 * Route definition for object-based API
 */
export interface RouteDefinition {
  [path: string]: {
    get?: RouteConfig<unknown, unknown, unknown, unknown>;
    post?: RouteConfig<unknown, unknown, unknown, unknown>;
    put?: RouteConfig<unknown, unknown, unknown, unknown>;
    delete?: RouteConfig<unknown, unknown, unknown, unknown>;
    patch?: RouteConfig<unknown, unknown, unknown, unknown>;
    head?: RouteConfig<unknown, unknown, unknown, unknown>;
    options?: RouteConfig<unknown, unknown, unknown, unknown>;
  };
}

/**
 * SyntroJS configuration
 */
export interface SyntroJSConfig {
  /** API title for OpenAPI docs */
  title?: string;

  /** API version */
  version?: string;

  /** API description */
  description?: string;

  /** Enable Fastify built-in logger (legacy) */
  logger?: boolean;

  /** Enable @syntrojs/logger integration with request/response logging */
  syntroLogger?: LoggerIntegrationConfig | boolean;

  /** Routes defined as object (alternative to method chaining) */
  routes?: RouteDefinition;

  /** Use ultra-optimized adapter for maximum performance */
  ultraOptimized?: boolean;

  /** Use ultra-minimal adapter for absolute maximum performance */
  ultraMinimal?: boolean;

  /** Use ultra-fast adapter for maximum performance with features */
  ultraFast?: boolean;

  /** Use fluent adapter for dynamic tree shaking */
  fluent?: boolean;

  /** Fluent adapter configuration */
  fluentConfig?: {
    /** Enable Fastify built-in logger (legacy) */
    logger?: boolean;
    /** Enable @syntrojs/logger integration */
    syntroLogger?: LoggerIntegrationConfig | boolean;
    /** Enable component-level logging (ErrorHandler, BackgroundTasks, etc.) */
    componentLogging?: boolean;
    validation?: boolean;
    errorHandling?: boolean;
    dependencyInjection?: boolean;
    backgroundTasks?: boolean;
    openAPI?: boolean;
    compression?: boolean;
    cors?: boolean;
    helmet?: boolean;
    rateLimit?: boolean;
    middleware?: boolean;
  };

  /** Runtime to use: 'auto', 'node', or 'bun' */
  runtime?: 'auto' | 'node' | 'bun';

  /** Documentation endpoints configuration */
  docs?:
    | boolean
    | {
        /** Enable root landing page (default: true) */
        landingPage?: boolean;
        /** Enable Swagger UI at /docs (default: true) */
        swagger?: boolean;
        /** Enable ReDoc at /redoc (default: true) */
        redoc?: boolean;
        /** Enable OpenAPI JSON at /openapi.json (default: true) */
        openapi?: boolean;
      };
}

/**
 * SyntroJS main class
 * Facade that orchestrates all framework layers
 *
 * Principles Applied:
 * - SOLID: Single Responsibility, Open/Closed, Dependency Inversion
 * - DDD: Domain Services, Value Objects, Aggregates
 * - Functional: Pure functions, Immutability, Composition
 * - Guard Clauses: Early validation, Fail Fast
 */
export class SyntroJS {
  private readonly config: SyntroJSConfig;
  private readonly server: unknown; // Generic server (FastifyInstance or Bun Server)
  private readonly adapter:
    | typeof FastifyAdapter
    | typeof UltraFastAdapter
    | typeof UltraFastifyAdapter
    | typeof UltraMinimalAdapter
    | typeof BunAdapter
    | typeof FluentAdapter;
  private readonly runtime: 'node' | 'bun';
  private readonly optimizer: RuntimeOptimizer;
  private middlewareRegistry: MiddlewareRegistry;
  private websocketRegistry: WebSocketRegistry;
  private isStarted = false;
  private openAPIEndpointsRegistered = false;

  constructor(config: SyntroJSConfig = {}) {
    // Guard clause: validate config
    const validatedConfig = this.validateConfig(config);

    // Initialize immutable configuration
    this.config = Object.freeze({
      runtime: 'auto',
      ...validatedConfig,
    });

    // Initialize domain services (DDD)
    this.optimizer = new RuntimeOptimizer();
    this.middlewareRegistry = new MiddlewareRegistry();
    this.websocketRegistry = new WebSocketRegistry();

    // Auto-detect runtime (pure function)
    this.runtime = this.detectRuntime();

    // Choose adapter based on runtime and config (pure function)
    this.adapter = this.selectOptimalAdapter();

    // Create server instance via adapter (composition)
    this.server = this.createServerInstance();

    // Note: OpenAPI endpoints are registered via regular routes
    // No special initialization needed - they use the standard route registration

    // Register routes from config if provided
    if (this.config.routes) {
      this.registerRoutesFromConfig(this.config.routes);
    }
  }

  /**
   * Guard clause: Validate configuration
   *
   * @param config - Configuration to validate
   * @returns Validated configuration
   * @throws Error if configuration is invalid
   */
  private validateConfig(config: SyntroJSConfig): SyntroJSConfig {
    // Guard clause: config must be an object
    if (!config || typeof config !== 'object') {
      throw new Error('Configuration must be a valid object');
    }

    // Guard clause: validate runtime if provided
    if (config.runtime && !['auto', 'node', 'bun'].includes(config.runtime)) {
      throw new Error('Runtime must be "auto", "node", or "bun"');
    }

    // Guard clause: validate fluentConfig if provided
    if (config.fluentConfig && typeof config.fluentConfig !== 'object') {
      throw new Error('fluentConfig must be a valid object');
    }

    // Return validated config (immutable)
    return Object.freeze({ ...config });
  }

  /**
   * Create server instance using composition pattern
   *
   * @returns Configured server instance
   */
  private createServerInstance(): unknown {
    if (this.adapter === FluentAdapter) {
      return this.createFluentAdapter();
    }

    // Create adapter with logger configuration
    if (this.adapter === FastifyAdapter) {
      return FastifyAdapter.create({
        logger: this.config.logger ?? false,
        syntroLogger: this.config.syntroLogger,
      });
    }

    return this.adapter.create();
  }

  /**
   * Create FluentAdapter with configuration
   *
   * @returns Configured FluentAdapter instance
   */
  private createFluentAdapter(): unknown {
    const fluentAdapter = new FluentAdapter();

    // Apply fluent configuration using functional composition
    const configuredAdapter = this.applyFluentConfig(fluentAdapter);

    // Configure middleware registry
    configuredAdapter.withMiddlewareRegistry(this.middlewareRegistry);

    return configuredAdapter.create();
  }

  /**
   * Apply fluent configuration using functional composition
   *
   * @param adapter - FluentAdapter instance
   * @returns Configured adapter
   */
  private applyFluentConfig(adapter: FluentAdapter): FluentAdapter {
    const fluentConfig = this.config.fluentConfig;

    if (!fluentConfig) {
      // Use syntroLogger from main config if available
      let configuredAdapter = adapter.standard();
      if (this.config.syntroLogger) {
        configuredAdapter = configuredAdapter.withSyntroLogger(
          typeof this.config.syntroLogger === 'boolean'
            ? this.config.syntroLogger
            : this.config.syntroLogger,
        );
      }
      return configuredAdapter;
    }

    // Apply configuration using functional composition
    let configuredAdapter = Object.entries(fluentConfig).reduce((acc, [key, value]) => {
      // Skip syntroLogger and componentLogging - they need special handling
      if (key === 'syntroLogger' || key === 'componentLogging') {
        return acc;
      }

      if (value !== undefined) {
        const methodName =
          `with${key.charAt(0).toUpperCase()}${key.slice(1)}` as keyof FluentAdapter;
        if (typeof acc[methodName] === 'function') {
          // Type-safe call: most with* methods accept boolean, but we allow unknown for flexibility
          // TypeScript will validate the actual call at runtime
          return (acc[methodName] as (value: unknown) => FluentAdapter)(value);
        }
      }
      return acc;
    }, adapter);

    // Handle syntroLogger separately (from fluentConfig or main config)
    const syntroLogger = fluentConfig.syntroLogger ?? this.config.syntroLogger;
    if (syntroLogger !== undefined) {
      configuredAdapter = configuredAdapter.withSyntroLogger(syntroLogger);
    }

    // Handle componentLogging separately (from fluentConfig or main config)
    const componentLogging = fluentConfig.componentLogging;
    if (componentLogging !== undefined) {
      configuredAdapter = configuredAdapter.withComponentLogging(componentLogging);
    }

    return configuredAdapter;
  }

  /**
   * Auto-detect runtime (Bun or Node.js) - Pure function
   *
   * @returns Detected runtime
   */
  private detectRuntime(): 'node' | 'bun' {
    // If runtime is explicitly set, use it
    if (this.config.runtime === 'bun') return 'bun';
    if (this.config.runtime === 'node') return 'node';

    // Auto-detect: Check if we're in Bun
    if (typeof (globalThis as { Bun?: unknown }).Bun !== 'undefined') {
      return 'bun';
    }
    return 'node';
  }

  /**
   * Select optimal adapter based on runtime and configuration
   */
  private selectOptimalAdapter():
    | typeof FastifyAdapter
    | typeof UltraFastAdapter
    | typeof UltraFastifyAdapter
    | typeof UltraMinimalAdapter
    | typeof BunAdapter
    | typeof FluentAdapter {
    // Force specific adapter if configured
    if (this.config.fluent) return FluentAdapter;
    if (this.config.ultraMinimal) return UltraMinimalAdapter;
    if (this.config.ultraFast) return UltraFastAdapter;
    if (this.config.ultraOptimized) return UltraFastifyAdapter;

    // Runtime-specific optimal adapter selection
    if (this.runtime === 'bun') {
      // Use BunAdapter for maximum Bun performance
      return BunAdapter;
    }

    // Node.js: Use FluentAdapter as default (tree shaking enabled)
    return FluentAdapter;
  }

  /**
   * Registers a GET route
   *
   * @param path - Route path
   * @param config - Route configuration
   * @returns this (for chaining)
   */
  get<TParams = unknown, TQuery = unknown, TBody = unknown, TResponse = unknown>(
    path: string,
    config: RouteConfig<TParams, TQuery, TBody, TResponse>,
  ): this {
    return this.registerRoute('GET', path, config);
  }

  /**
   * Registers a POST route
   *
   * @param path - Route path
   * @param config - Route configuration
   * @returns this (for chaining)
   */
  post<TParams = unknown, TQuery = unknown, TBody = unknown, TResponse = unknown>(
    path: string,
    config: RouteConfig<TParams, TQuery, TBody, TResponse>,
  ): this {
    return this.registerRoute('POST', path, config);
  }

  /**
   * Registers a PUT route
   *
   * @param path - Route path
   * @param config - Route configuration
   * @returns this (for chaining)
   */
  put<TParams = unknown, TQuery = unknown, TBody = unknown, TResponse = unknown>(
    path: string,
    config: RouteConfig<TParams, TQuery, TBody, TResponse>,
  ): this {
    return this.registerRoute('PUT', path, config);
  }

  /**
   * Registers a DELETE route
   *
   * @param path - Route path
   * @param config - Route configuration
   * @returns this (for chaining)
   */
  delete<TParams = unknown, TQuery = unknown, TBody = unknown, TResponse = unknown>(
    path: string,
    config: RouteConfig<TParams, TQuery, TBody, TResponse>,
  ): this {
    return this.registerRoute('DELETE', path, config);
  }

  /**
   * Registers a PATCH route
   *
   * @param path - Route path
   * @param config - Route configuration
   * @returns this (for chaining)
   */
  patch<TParams = unknown, TQuery = unknown, TBody = unknown, TResponse = unknown>(
    path: string,
    config: RouteConfig<TParams, TQuery, TBody, TResponse>,
  ): this {
    return this.registerRoute('PATCH', path, config);
  }

  /**
   * Registers a HEAD route
   *
   * HEAD is identical to GET but only returns headers (no body).
   * Useful for checking if a resource exists or getting metadata without downloading the full response.
   *
   * @param path - Route path
   * @param config - Route configuration
   * @returns this (for chaining)
   *
   * @example
   * ```typescript
   * app.head('/users/:id', {
   *   params: z.object({ id: z.string() }),
   *   handler: ({ params }) => ({ exists: true })
   * });
   * ```
   */
  head<TParams = unknown, TQuery = unknown, TBody = unknown, TResponse = unknown>(
    path: string,
    config: RouteConfig<TParams, TQuery, TBody, TResponse>,
  ): this {
    return this.registerRoute('HEAD', path, config);
  }

  /**
   * Registers an OPTIONS route
   *
   * OPTIONS returns the allowed HTTP methods for a resource.
   * Primarily used for CORS preflight requests.
   *
   * @param path - Route path
   * @param config - Route configuration
   * @returns this (for chaining)
   *
   * @example
   * ```typescript
   * app.options('/users/:id', {
   *   handler: () => ({
   *     allow: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']
   *   })
   * });
   * ```
   */
  options<TParams = unknown, TQuery = unknown, TBody = unknown, TResponse = unknown>(
    path: string,
    config: RouteConfig<TParams, TQuery, TBody, TResponse>,
  ): this {
    return this.registerRoute('OPTIONS', path, config);
  }

  /**
   * Sets the API title for OpenAPI documentation
   *
   * @param title - API title
   * @returns this (for chaining)
   */
  title(title: string): this {
    // Guard clause
    if (!title) {
      throw new Error('Title is required');
    }

    this.config.title = title;
    return this;
  }

  /**
   * Sets the API version for OpenAPI documentation
   *
   * @param version - API version
   * @returns this (for chaining)
   */
  version(version: string): this {
    // Guard clause
    if (!version) {
      throw new Error('Version is required');
    }

    this.config.version = version;
    return this;
  }

  /**
   * Sets the API description for OpenAPI documentation
   *
   * @param description - API description
   * @returns this (for chaining)
   */
  description(description: string): this {
    // Guard clause
    if (!description) {
      throw new Error('Description is required');
    }

    this.config.description = description;
    return this;
  }

  /**
   * Enables or disables logging
   *
   * @param enabled - Whether to enable logging
   * @returns this (for chaining)
   */
  logging(enabled: boolean): this {
    this.config.logger = enabled;
    return this;
  }

  /**
   * Registers a custom exception handler
   *
   * @param errorClass - Error class to handle
   * @param handler - Handler function
   * @returns this (for chaining)
   */
  exceptionHandler<E extends Error>(
    errorClass: new (...args: unknown[]) => E,
    handler: ExceptionHandler<E>,
  ): this {
    // Guard clauses
    if (!errorClass) {
      throw new Error('Error class is required');
    }

    if (!handler) {
      throw new Error('Handler function is required');
    }

    // Register with ErrorHandler service
    ErrorHandler.register(errorClass, handler);

    return this;
  }

  /**
   * Validates production configuration and shows warnings
   */
  private validateProductionConfig(): void {
    const isProduction = process.env.NODE_ENV === 'production';
    if (!isProduction) return;

    const docsConfig = this.config.docs;
    const docsEnabled = docsConfig !== false; // true or undefined = enabled

    if (docsEnabled) {
      // "Escandaloso" warning in red background
      console.error('\n');
      console.error(
        '\x1b[41m\x1b[37m%s\x1b[0m',
        '╔════════════════════════════════════════════════════════════════╗',
      );
      console.error(
        '\x1b[41m\x1b[37m%s\x1b[0m',
        '║                                                                ║',
      );
      console.error(
        '\x1b[41m\x1b[37m%s\x1b[0m',
        '║         ⚠️   SECURITY WARNING   ⚠️                             ║',
      );
      console.error(
        '\x1b[41m\x1b[37m%s\x1b[0m',
        '║                                                                ║',
      );
      console.error(
        '\x1b[41m\x1b[37m%s\x1b[0m',
        '╠════════════════════════════════════════════════════════════════╣',
      );
      console.error(
        '\x1b[41m\x1b[37m%s\x1b[0m',
        '║  DOCUMENTATION IS ENABLED IN PRODUCTION!                       ║',
      );
      console.error(
        '\x1b[41m\x1b[37m%s\x1b[0m',
        '║                                                                ║',
      );
      console.error(
        '\x1b[41m\x1b[37m%s\x1b[0m',
        '║  This exposes your entire API structure to potential attackers!║',
      );
      console.error(
        '\x1b[41m\x1b[37m%s\x1b[0m',
        '║                                                                ║',
      );
      console.error(
        '\x1b[41m\x1b[37m%s\x1b[0m',
        '║  🔒 TO FIX: Add docs: false to your configuration              ║',
      );
      console.error(
        '\x1b[41m\x1b[37m%s\x1b[0m',
        '║                                                                ║',
      );
      console.error(
        '\x1b[41m\x1b[37m%s\x1b[0m',
        '║  const app = new SyntroJS({ docs: false });                    ║',
      );
      console.error(
        '\x1b[41m\x1b[37m%s\x1b[0m',
        '║                                                                ║',
      );
      console.error(
        '\x1b[41m\x1b[37m%s\x1b[0m',
        '╚════════════════════════════════════════════════════════════════╝',
      );
      console.error('\n');
    }
  }

  /**
   * Starts the server
   *
   * @param port - Port to listen on
   * @param host - Host to bind to
   * @returns Server address
   */
  async listen(port: number, host = '::'): Promise<string> {
    // Guard clauses
    if (port < 0 || port > 65535) {
      throw new Error('Valid port number is required (0-65535)');
    }

    if (this.isStarted) {
      throw new Error('Server is already started');
    }

    // Validate production configuration
    this.validateProductionConfig();

    // Register OpenAPI endpoints only once
    if (!this.openAPIEndpointsRegistered) {
      await this.registerOpenAPIEndpoints();
      this.openAPIEndpointsRegistered = true;
    }

    // Register all routes
    this.registerAllRoutes();

    // Start server via adapter
    const address = await this.getAdapterListenMethod()(this.server, port, host);

    this.isStarted = true;

    // Show runtime information
    this.showRuntimeInfo(address);

    return address;
  }

  /**
   * Gets the appropriate listen method based on adapter
   *
   * @returns Listen method
   */
  private getAdapterListenMethod(): (
    server: unknown,
    port: number,
    host: string,
  ) => Promise<string> {
    if (this.adapter === BunAdapter) {
      return async (server, port, host) => BunAdapter.listen(server, port, host);
    }
    if (this.adapter === FluentAdapter) {
      return async (server, port, host) =>
        FluentAdapter.listen(server as FastifyInstance, port, host);
    }
    // FastifyAdapter or other Fastify-based adapters
    return async (server, port, host) =>
      FastifyAdapter.listen(server as FastifyInstance, port, host);
  }

  /**
   * Show runtime information
   */
  private showRuntimeInfo(address: string): void {
    // Use RuntimeOptimizer for detailed runtime information
    this.optimizer.logRuntimeInfo();

    console.log(`Server running at ${address}\n`);
    console.log('📖 Interactive Documentation:');
    console.log(`   Swagger UI: ${address}/docs`);
    console.log(`   ReDoc:      ${address}/redoc\n`);
    console.log('🔗 Available Endpoints:');
    console.log(`   GET    ${address}/hello\n`);
    console.log('💡 Try this example:');
    console.log(`   curl ${address}/hello\n`);
  }

  /**
   * Stops the server
   */
  async close(): Promise<void> {
    // Guard clause
    if (!this.isStarted) {
      throw new Error('Server is not started');
    }

    await this.getAdapterCloseMethod()(this.server);

    this.isStarted = false;
  }

  /**
   * Gets the appropriate close method based on adapter
   *
   * @returns Close method
   */
  private getAdapterCloseMethod(): (server: unknown) => Promise<void> {
    if (this.adapter === BunAdapter) {
      return async (server) => BunAdapter.close(server);
    }
    if (this.adapter === FluentAdapter) {
      return async (server) => FluentAdapter.close(server as FastifyInstance);
    }
    // FastifyAdapter or other Fastify-based adapters
    return async (server) => FastifyAdapter.close(server as FastifyInstance);
  }

  /**
   * Gets the underlying server instance
   * Use with caution - breaks abstraction
   *
   * @returns Server instance (FastifyInstance for Fastify adapters, Server for Bun)
   */
  getRawServer(): unknown {
    return this.server;
  }

  /**
   * Gets the underlying Fastify instance (deprecated, use getRawServer)
   * Use with caution - breaks abstraction
   *
   * @returns Fastify instance
   */
  getRawFastify(): FastifyInstance {
    return this.server as FastifyInstance;
  }

  /**
   * Registers a route internally
   *
   * @param method - HTTP method
   * @param path - Route path
   * @param config - Route configuration
   * @returns this (for chaining)
   */
  private registerRoute<TParams = unknown, TQuery = unknown, TBody = unknown, TResponse = unknown>(
    method: HttpMethod,
    path: string,
    config: RouteConfig<TParams, TQuery, TBody, TResponse>,
  ): this {
    // Guard clauses
    if (!method) {
      throw new Error('Method is required');
    }

    if (!path) {
      throw new Error('Path is required');
    }

    if (!config) {
      throw new Error('Config is required');
    }

    // Create route entity
    const route = new Route(method, path, config);

    // Register with RouteRegistry
    RouteRegistry.register(
      route as Route<unknown, unknown, unknown, unknown, Record<string, unknown>>,
    );

    return this;
  }

  /**
   * Registers all routes from RouteRegistry with the appropriate adapter
   */
  private registerAllRoutes(): void {
    // Configure middleware registry for adapters that support it
    if (this.adapter === BunAdapter) {
      (BunAdapter as any).setMiddlewareRegistry(this.middlewareRegistry);
    } else if (this.adapter === FastifyAdapter) {
      FastifyAdapter.setMiddlewareRegistry(this.middlewareRegistry);
    }

    const routes = RouteRegistry.getAll();

    // Functional: forEach for side effects (registration)
    for (const route of routes) {
      if (this.adapter === BunAdapter) {
        BunAdapter.registerRoute(this.server, route);
      } else if (this.adapter === FluentAdapter) {
        // FluentAdapter handles its own registration during listen
        FluentAdapter.registerRoute(this.server as FastifyInstance, route);
      } else {
        // FastifyAdapter or other Fastify-based adapters
        FastifyAdapter.registerRoute(this.server as FastifyInstance, route);
      }
    }
  }

  /**
   * Helper to check if docs endpoint should be enabled
   */
  private shouldEnableDocsEndpoint(
    endpoint: 'landingPage' | 'swagger' | 'redoc' | 'openapi',
  ): boolean {
    const docsConfig = this.config.docs;

    // If docs is false, disable everything
    if (docsConfig === false) {
      return false;
    }

    // If docs is true or undefined, enable everything by default
    if (docsConfig === true || docsConfig === undefined) {
      return true;
    }

    // If docs is an object, check the specific endpoint
    return docsConfig[endpoint] !== false;
  }

  /**
   * Registers OpenAPI and docs endpoints after server starts
   */
  /**
   * Detects if local documentation assets are installed
   * Used to determine if we should serve from local or CDN
   *
   * Strategy:
   * - By default: Use CDN (for 99% of users with internet)
   * - If optionalDependencies installed: Auto-detect and serve locally (for air-gapped environments)
   *
   * @returns Object with detection results
   */
  private async detectLocalAssets(): Promise<{
    swaggerInstalled: boolean;
    redocInstalled: boolean;
  }> {
    let swaggerInstalled = false;
    let redocInstalled = false;

    try {
      // Try to dynamically import package - will fail if not installed
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error - Package might not be installed
      await import('swagger-ui-dist');
      swaggerInstalled = true;
    } catch {
      swaggerInstalled = false;
    }

    try {
      // Try to dynamically import package - will fail if not installed
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error - Package might not be installed
      await import('redoc');
      redocInstalled = true;
    } catch {
      redocInstalled = false;
    }

    return { swaggerInstalled, redocInstalled };
  }

  private async registerOpenAPIEndpoints(): Promise<void> {
    // Detect if local assets are installed (for air-gapped environments)
    // By default, we use CDN for all users
    // Only if the user explicitly installs optionalDependencies, we serve locally
    const { swaggerInstalled: _swaggerInstalled, redocInstalled: _redocInstalled } =
      await this.detectLocalAssets();
    // NOTE: Temporarily forcing CDN since we haven't implemented asset serving routes yet
    const useLocalAssets = false; // _swaggerInstalled || _redocInstalled;

    // Register root endpoint with welcome page
    if (this.shouldEnableDocsEndpoint('landingPage') && !RouteRegistry.has('GET', '/')) {
      this.registerRoute('GET', '/', {
        handler: async () => {
          return {
            status: 200,
            body: await this.renderWelcomePage(),
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          };
        },
      });
    }

    // Register /openapi.json endpoint only if not already registered
    if (this.shouldEnableDocsEndpoint('openapi') && !RouteRegistry.has('GET', '/openapi.json')) {
      this.registerRoute('GET', '/openapi.json', {
        handler: async () => {
          return this.getOpenAPISpec();
        },
      });
    }

    // Register /docs endpoint (Swagger UI) only if not already registered
    if (this.shouldEnableDocsEndpoint('swagger') && !RouteRegistry.has('GET', '/docs')) {
      this.registerRoute('GET', '/docs', {
        handler: async () => {
          const html = DocsRenderer.renderSwaggerUI({
            openApiUrl: '/openapi.json',
            title: this.config.title,
            assetMode: useLocalAssets ? 'local' : 'cdn',
            assetsUrl: '/docs-assets',
          });
          // Return object with headers to set content-type
          return {
            status: 200,
            body: html,
            headers: { 'Content-Type': 'text/html' },
          };
        },
      });
    }

    // Register /redoc endpoint only if not already registered
    if (this.shouldEnableDocsEndpoint('redoc') && !RouteRegistry.has('GET', '/redoc')) {
      this.registerRoute('GET', '/redoc', {
        handler: async () => {
          const html = DocsRenderer.renderReDoc({
            openApiUrl: '/openapi.json',
            title: this.config.title,
            assetMode: useLocalAssets ? 'local' : 'cdn',
            assetsUrl: '/docs-assets',
          });
          // Return object with headers to set content-type
          return {
            status: 200,
            body: html,
            headers: { 'Content-Type': 'text/html' },
          };
        },
      });
    }
  }

  /**
   * Gets OpenAPI specification
   *
   * @returns OpenAPI 3.1 spec
   */
  getOpenAPISpec() {
    const routes = RouteRegistry.getAll();

    const openApiConfig: OpenAPIConfig = {
      title: this.config.title ?? 'SyntroJS Application',
      version: this.config.version ?? '1.0.0',
      description: this.config.description,
    };

    return OpenAPIGenerator.generate(routes, openApiConfig);
  }

  /**
   * Renders welcome page for root route
   */
  private async renderWelcomePage(): Promise<string> {
    const title = this.config.title || 'SyntroJS API';
    const version = this.config.version || '1.0.0';

    // Check if we need to use CDN (local assets not available)
    let swaggerInstalled = false;
    try {
      // Try to dynamically import package - will fail if not installed
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error - Package might not be installed
      await import('swagger-ui-dist');
      swaggerInstalled = true;
    } catch {
      swaggerInstalled = false;
    }

    return `<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      background: white;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    h1 {
      margin: 0 0 16px 0;
      color: #1a1a1a;
      font-size: 32px;
      font-weight: 600;
    }
    .subtitle {
      color: #666;
      font-size: 18px;
      margin-bottom: 16px;
      line-height: 1.5;
    }
    .warning {
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 24px;
      color: #856404;
      font-size: 14px;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 14px 28px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      transition: transform 0.2s, box-shadow 0.2s;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
    .button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
    }
    .version {
      color: #999;
      font-size: 14px;
      margin-top: 24px;
    }
    .links {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${title}</h1>
    <div class="subtitle">
      API is running successfully. Explore the interactive API documentation.
    </div>
    ${
      !swaggerInstalled
        ? `<div class="warning">
      ⚠️ Documentation requires internet access for CDN assets. Air-gapped environments are not currently supported.
    </div>`
        : ''
    }
    <div class="links">
      <a href="/docs" class="button">📖 Swagger UI</a>
      <a href="/redoc" class="button">📚 ReDoc</a>
      <a href="/openapi.json" class="button">🔗 OpenAPI Spec</a>
    </div>
    <div class="version">
      Powered by SyntroJS ${version} • "FastAPI for Node.js"
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Registers routes from configuration object
   *
   * @param routes - Routes definition object
   */
  private registerRoutesFromConfig(routes: RouteDefinition): void {
    // Guard clause
    if (!routes) {
      throw new Error('Routes configuration is required');
    }

    // Iterate through each path and its methods
    for (const [path, methods] of Object.entries(routes)) {
      // Guard clause
      if (!path) {
        throw new Error('Route path cannot be empty');
      }

      if (!methods) {
        throw new Error(`Route methods for path '${path}' are required`);
      }

      // Register each HTTP method for this path
      for (const [method, config] of Object.entries(methods)) {
        // Guard clause
        if (!config) {
          continue; // Skip undefined methods
        }

        // Validate method is supported
        const httpMethod = method.toUpperCase() as HttpMethod;
        if (!['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(httpMethod)) {
          throw new Error(`Unsupported HTTP method: ${method}`);
        }

        // Register the route
        this.registerRoute(httpMethod, path, config);
      }
    }
  }

  /**
   * Add middleware - simple functional API
   * Principio: Inmutabilidad funcional - actualiza referencia interna
   */
  use(middleware: Middleware): this;
  use(middleware: Middleware, config: MiddlewareConfig): this;
  use(path: string, middleware: Middleware): this;
  use(path: string, middleware: Middleware, config: MiddlewareConfig): this;
  use(
    middlewareOrPath: Middleware | string,
    middlewareOrConfig?: Middleware | MiddlewareConfig,
    config?: MiddlewareConfig,
  ): this {
    // Guard Clause: Validar parámetros
    if (!middlewareOrPath) {
      throw new Error('Middleware or path is required');
    }

    // Actualizar referencia interna con nueva instancia inmutable
    if (typeof middlewareOrPath === 'string') {
      // app.use('/path', middleware, config?)
      if (config) {
        this.middlewareRegistry = this.middlewareRegistry.add(
          middlewareOrPath,
          middlewareOrConfig as Middleware,
          config,
        );
      } else {
        this.middlewareRegistry = this.middlewareRegistry.add(
          middlewareOrPath,
          middlewareOrConfig as Middleware,
        );
      }
    } else {
      // app.use(middleware, config?)
      if (middlewareOrConfig) {
        this.middlewareRegistry = this.middlewareRegistry.add(
          middlewareOrPath,
          middlewareOrConfig as MiddlewareConfig,
        );
      } else {
        this.middlewareRegistry = this.middlewareRegistry.add(middlewareOrPath);
      }
    }
    return this;
  }

  /**
   * Get middleware registry (for internal use)
   */
  getMiddlewareRegistry(): MiddlewareRegistry {
    return this.middlewareRegistry;
  }

  /**
   * Add WebSocket handler - simple functional API
   * Principio: Inmutabilidad funcional - actualiza referencia interna
   */
  ws(path: string, handler: WebSocketHandler): this {
    // Guard Clause: Validar parámetros
    if (!path || typeof path !== 'string') {
      throw new Error('Path is required and must be a valid string');
    }
    if (!handler || typeof handler !== 'function') {
      throw new Error('Handler is required and must be a valid function');
    }

    // Actualizar referencia interna con nueva instancia inmutable
    this.websocketRegistry = this.websocketRegistry.add(path, handler);
    return this;
  }

  /**
   * Get websocket registry (for internal use)
   */
  getWebSocketRegistry(): WebSocketRegistry {
    return this.websocketRegistry;
  }
}
