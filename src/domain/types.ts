/**
 * Core types for Hyper framework
 * Domain layer - no external dependencies
 */

import type { Readable } from 'node:stream';
import type { ZodSchema } from 'zod';

/**
 * HTTP methods supported by Hyper
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

/**
 * HTTP status codes
 */
export type HttpStatusCode = number;

/**
 * Generic record type for headers, query params, etc.
 */
export type StringRecord = Record<string, string>;

/**
 * Uploaded file from multipart form data
 */
export interface UploadedFile {
  /** Original filename from client */
  filename: string;

  /** MIME type (e.g., 'image/png', 'application/pdf') */
  mimetype: string;

  /** File encoding (e.g., '7bit', 'base64') */
  encoding: string;

  /** File size in bytes */
  size: number;

  /** Field name from form */
  fieldname: string;

  /** Readable stream of file data */
  data: Readable;

  /** Save file to disk */
  toBuffer(): Promise<Buffer>;
}

/**
 * Request context passed to route handlers
 */
export interface RequestContext<
  TParams = unknown,
  TQuery = unknown,
  TBody = unknown,
  THeaders = StringRecord,
  TDependencies = Record<string, unknown>,
> {
  /** HTTP method */
  method: HttpMethod;

  /** Request path */
  path: string;

  /** Path parameters (validated) */
  params: TParams;

  /** Query parameters (validated) */
  query: TQuery;

  /** Request body (validated) */
  body: TBody;

  /** Request headers */
  headers: THeaders;

  /** Cookies */
  cookies: StringRecord;

  /** Correlation ID for tracing */
  correlationId: string;

  /** Request timestamp */
  timestamp: Date;

  /** Resolved dependencies (injected) */
  dependencies: TDependencies;

  /** Background tasks manager */
  background: {
    addTask: (
      task: () => void | Promise<void>,
      options?: {
        name?: string;
        timeout?: number;
        onComplete?: () => void;
        onError?: (error: unknown) => void;
      },
    ) => void;
  };

  /** File download helper */
  download: (
    data: Buffer | Readable | string,
    options: {
      filename: string;
      mimeType?: string;
      disposition?: 'attachment' | 'inline';
    },
  ) => {
    data: Buffer | Readable | string;
    headers: Record<string, string>;
    statusCode: number;
  };

  /** HTTP redirect helper */
  redirect: (
    url: string,
    statusCode?: 301 | 302 | 303 | 307 | 308,
  ) => {
    statusCode: 301 | 302 | 303 | 307 | 308;
    headers: Record<string, string>;
    body: null;
  };

  /** Content negotiation helper */
  accepts: {
    /** Check if client accepts JSON */
    json: () => boolean;
    /** Check if client accepts HTML */
    html: () => boolean;
    /** Check if client accepts XML */
    xml: () => boolean;
    /** Check if client accepts plain text */
    text: () => boolean;
    /** Check if client accepts TOON format */
    toon: () => boolean;
    /** Negotiate best type from array */
    type: (types: string[]) => string | false;
  };

  /** Uploaded files (multipart/form-data only) */
  files?: UploadedFile[];

  /** Form fields (multipart/form-data only) */
  fields?: StringRecord;
}

/**
 * Response returned by handlers
 */
export interface RouteResponse<TData = unknown> {
  /** Response status code */
  status: HttpStatusCode;

  /** Response body data */
  body: TData;

  /** Response headers */
  headers?: StringRecord;
}

/**
 * Route configuration schema
 */
export interface RouteConfig<
  TParams = unknown,
  TQuery = unknown,
  TBody = unknown,
  TResponse = unknown,
  TDependencies = Record<string, unknown>,
> {
  /** Zod schema for path parameters */
  params?: ZodSchema<TParams>;

  /** Zod schema for query parameters */
  query?: ZodSchema<TQuery>;

  /** Zod schema for request body */
  body?: ZodSchema<TBody>;

  /** Zod schema for response validation */
  response?: ZodSchema<TResponse>;

  /** Default status code for successful responses */
  status?: HttpStatusCode;

  /** Dependency injection configuration */
  dependencies?: TDependencies;

  /** Route handler function */
  handler: RouteHandler<TParams, TQuery, TBody, TResponse, TDependencies>;

  /** OpenAPI metadata */
  tags?: string[];
  summary?: string;
  description?: string;
  operationId?: string;
  deprecated?: boolean;
}

/**
 * Route handler function type
 *
 * Supports multiple response types:
 * - TResponse: JSON objects, strings, numbers, etc. (validated by Zod if schema provided)
 * - Readable: Node.js streams for large files or streaming data
 * - Buffer: Binary data (images, PDFs, etc.)
 * - RouteResponse: Full control with status, body, headers
 */
export type RouteHandler<
  TParams = unknown,
  TQuery = unknown,
  TBody = unknown,
  TResponse = unknown,
  TDependencies = Record<string, unknown>,
> = (
  context: RequestContext<TParams, TQuery, TBody, StringRecord, TDependencies>,
) => TResponse | Promise<TResponse> | Readable | Buffer | RouteResponse<TResponse>;

/**
 * Exception handler function type
 */
export type ExceptionHandler<E extends Error = Error> = (
  context: RequestContext,
  error: E,
) => RouteResponse | Promise<RouteResponse>;

/**
 * Simple middleware function - pure function
 */
export type Middleware = (context: RequestContext) => Promise<void> | void;

/**
 * Simple middleware configuration
 */
export interface MiddlewareConfig {
  /** Path pattern to match (e.g., '/api', '/users') */
  path?: string;
  /** HTTP method to match */
  method?: HttpMethod;
  /** Execution priority (lower = earlier) */
  priority?: number;
}

/**
 * Registered middleware entry
 */
export interface MiddlewareEntry {
  middleware: Middleware;
  config: MiddlewareConfig;
  id: string;
}

/**
 * WebSocket connection interface
 */
export interface WebSocketConnection {
  /** Send message to client */
  send(data: string | object): void;

  /** Send message to specific room */
  to(room: string): WebSocketConnection;

  /** Broadcast to room */
  broadcast(room: string, event: string, data: any): void;

  /** Join a room */
  join(room: string): void;

  /** Leave a room */
  leave(room: string): void;

  /** Event listeners */
  on(event: 'message', handler: (data: any) => void): void;
  on(event: 'disconnect', handler: () => void): void;

  /** Close connection */
  close(): void;
}

/**
 * WebSocket handler function
 */
export type WebSocketHandler = (
  ws: WebSocketConnection,
  context: RequestContext,
) => Promise<void> | void;

/**
 * Lifecycle hook types
 */
export type OnRequestHook = (context: RequestContext) => void | Promise<void>;
export type OnResponseHook = (
  context: RequestContext,
  response: RouteResponse,
) => void | Promise<void>;
export type OnErrorHook = (context: RequestContext, error: Error) => void | Promise<void>;

/**
 * SOLID PRINCIPLES INTERFACES
 * Interface Segregation Principle - Smaller, focused interfaces
 */

/**
 * Route handler interface (ISP)
 */
export interface RouteHandlerInterface<TResponse = unknown> {
  handler: (context: RequestContext) => TResponse | Promise<TResponse>;
}

/**
 * Route validation interface (ISP)
 */
export interface RouteValidationInterface<TParams = unknown, TQuery = unknown, TBody = unknown> {
  params?: ZodSchema<TParams>;
  query?: ZodSchema<TQuery>;
  body?: ZodSchema<TBody>;
}

/**
 * Route response interface (ISP)
 */
export interface RouteResponseInterface<TResponse = unknown> {
  response?: ZodSchema<TResponse>;
  statusCode?: HttpStatusCode;
}

/**
 * Route error handling interface (ISP)
 */
export interface RouteErrorHandlingInterface {
  errorHandler?: ExceptionHandler;
}

/**
 * Route documentation interface (ISP)
 */
export interface RouteDocumentationInterface {
  summary?: string;
  description?: string;
  tags?: string[];
  operationId?: string;
  deprecated?: boolean;
}

/**
 * DEPENDENCY INVERSION PRINCIPLE INTERFACES
 * Depend on abstractions, not concretions
 */

/**
 * HTTP Adapter interface (DIP)
 */
export interface HttpAdapter {
  create(config?: Record<string, unknown>): unknown;
  registerRoute(server: unknown, route: unknown): Promise<void>;
  listen(server: unknown, port: number, host?: string): Promise<string>;
  close(server: unknown): Promise<void>;
}

/**
 * Validation Adapter interface (DIP)
 */
export interface ValidationAdapter {
  validate<T>(schema: ZodSchema<T>, data: unknown): T;
  validateOrThrow<T>(schema: ZodSchema<T>, data: unknown): T;
}

/**
 * Serialization Adapter interface (DIP)
 */
export interface SerializationAdapter {
  serialize(data: unknown): string;
  deserialize<T>(data: string): T;
}

/**
 * FUNCTIONAL PROGRAMMING TYPES
 * Result/Either pattern for error handling
 */

export type Result<T, E = Error> = Success<T> | Failure<E>;

export class Success<T> {
  constructor(public readonly value: T) {}

  isSuccess(): this is Success<T> {
    return true;
  }

  isFailure(): this is Failure<never> {
    return false;
  }
}

export class Failure<E> {
  constructor(public readonly error: E) {}

  isSuccess(): this is Success<never> {
    return false;
  }

  isFailure(): this is Failure<E> {
    return true;
  }
}

/**
 * VALUE OBJECTS
 * Domain-driven design value objects
 */

export class Port {
  private readonly value: number;

  constructor(value: number) {
    if (value < 0 || value > 65535) {
      throw new Error('Port must be between 0 and 65535');
    }
    this.value = value;
  }

  getValue(): number {
    return this.value;
  }

  equals(other: Port): boolean {
    return this.value === other.value;
  }
}

export class Host {
  private readonly value: string;

  constructor(value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('Host is required');
    }
    this.value = value.trim();
  }

  getValue(): string {
    return this.value;
  }

  equals(other: Host): boolean {
    return this.value === other.value;
  }
}

export class ServerAddress {
  constructor(
    private readonly host: Host,
    private readonly port: Port,
  ) {}

  toString(): string {
    return `http://[${this.host.getValue()}]:${this.port.getValue()}`;
  }

  equals(other: ServerAddress): boolean {
    return this.host.equals(other.host) && this.port.equals(other.port);
  }
}

// Export factories
export * from './factories';
