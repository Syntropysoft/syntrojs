/**
 * ApiGatewayAdapter - Infrastructure Layer
 *
 * Responsibility: Convert API Gateway events to RequestDTO
 * Pattern: Adapter Pattern
 * Principles: SOLID (Single Responsibility), Guard Clauses, Immutability
 */

import { RouteRegistry } from '../../application/RouteRegistry';
import { SchemaValidator } from '../../application/SchemaValidator';
import { ErrorHandler } from '../../application/ErrorHandler';
import type { ILambdaAdapter } from '../../domain/interfaces/ILambdaAdapter';
import type { Route } from '../../domain/Route';
import type { RequestContext } from '../../domain/types';
import type { RequestDTO, LambdaResponse } from '../types';
import type { CorsOptions } from '../../plugins/cors';

/**
 * API Gateway Proxy Event (v1)
 * Compatible with AWS API Gateway REST API
 */
export interface APIGatewayProxyEvent {
  httpMethod: string;
  path: string;
  pathParameters: Record<string, string> | null;
  queryStringParameters: Record<string, string> | null;
  multiValueQueryStringParameters: Record<string, string[]> | null;
  headers: Record<string, string> | undefined;
  multiValueHeaders: Record<string, string[]> | undefined;
  body: string | null;
  isBase64Encoded: boolean;
  requestContext: {
    requestId: string;
    stage: string;
    resourceId: string;
    resourcePath: string;
    httpMethod: string;
    requestTime: string;
    requestTimeEpoch: number;
    identity: {
      sourceIp: string;
      userAgent: string;
    };
    authorizer?: {
      claims?: Record<string, unknown>;
    };
  };
}

/**
 * API Gateway Adapter
 * Converts API Gateway events to SyntroJS RequestDTO and executes handlers
 *
 * Implements ILambdaAdapter for easy extraction to separate package
 */
export class ApiGatewayAdapter implements ILambdaAdapter {
  private readonly corsConfig?: boolean | CorsOptions;

  constructor(
    private readonly routeRegistry: typeof RouteRegistry,
    private readonly validator: typeof SchemaValidator,
    corsConfig?: boolean | CorsOptions,
  ) {
    // Guard clause: validate dependencies
    if (!routeRegistry) {
      throw new Error('RouteRegistry is required');
    }
    if (!validator) {
      throw new Error('SchemaValidator is required');
    }

    // Store CORS configuration
    this.corsConfig = corsConfig;
  }

  /**
   * Gets the event type this adapter handles
   * Pure function: returns event type identifier
   *
   * @returns Event type identifier
   */
  getEventType(): string {
    return 'api-gateway';
  }

  /**
   * Checks if this adapter can handle the given event
   * Pure function: analyzes event structure without side effects
   *
   * @param event - Lambda event to check
   * @returns true if adapter can handle this event
   */
  canHandle(event: unknown): boolean {
    // Guard clause: validate event
    if (!event || typeof event !== 'object') {
      return false;
    }

    const e = event as Record<string, unknown>;

    // Check for API Gateway v1 (REST API) signature
    return (
      'httpMethod' in e &&
      'path' in e &&
      'requestContext' in e &&
      typeof e.httpMethod === 'string' &&
      typeof e.path === 'string'
    );
  }

  /**
   * Check if a key exists in an object (case-insensitive) - Pure predicate function
   * Functional: no side effects, deterministic output
   * 
   * @param obj - Object to check
   * @param key - Key to find (case-insensitive)
   * @returns true if key exists (case-insensitive), false otherwise
   */
  private hasKeyCaseInsensitive(
    obj: Record<string, string>,
    key: string,
  ): boolean {
    // Guard clause: empty object
    if (!obj || Object.keys(obj).length === 0) {
      return false;
    }

    // Guard clause: empty key
    if (!key) {
      return false;
    }

    // Functional: use Array.some for pure predicate
    return Object.keys(obj).some((k) => k.toLowerCase() === key.toLowerCase());
  }

  /**
   * Merge headers from both headers and multiValueHeaders (pure function)
   * API Gateway can send headers in either format, so we need to handle both
   * 
   * Principles:
   * - Functional: Pure function, no side effects, immutable return
   * - Guard Clauses: Early validation
   * - DDD: Value Object transformation (event headers -> merged headers)
   * 
   * Headers are case-insensitive, so we need to check for existing keys
   * in a case-insensitive way when merging.
   * 
   * @param headers - Regular headers object
   * @param multiValueHeaders - Multi-value headers object
   * @returns Merged headers object (immutable)
   */
  private mergeHeaders(
    headers: Record<string, string> | undefined,
    multiValueHeaders: Record<string, string[]> | undefined,
  ): Record<string, string> {
    // Guard clause: both undefined, return empty object
    if (!headers && !multiValueHeaders) {
      return {};
    }

    // Functional: create new object (immutability)
    const merged: Record<string, string> = {};

    // First, add regular headers (pure transformation)
    if (headers) {
      for (const [key, value] of Object.entries(headers)) {
        // Guard clause: skip undefined/null values
        if (value !== undefined && value !== null) {
          merged[key] = value;
        }
      }
    }

    // Then, add multi-value headers (take first value if not already present)
    // This ensures regular headers take precedence (functional composition)
    if (multiValueHeaders) {
      for (const [key, values] of Object.entries(multiValueHeaders)) {
        // Guard clause: validate values array
        if (!Array.isArray(values) || values.length === 0) {
          continue;
        }

        // Guard clause: skip if key already exists (case-insensitive)
        // This ensures regular headers take precedence
        if (this.hasKeyCaseInsensitive(merged, key)) {
          continue;
        }

        // Functional: take first value (pure transformation)
        merged[key] = values[0];
      }
    }

    // Return immutable object (functional: no mutations after return)
    return merged;
  }

  /**
   * Adapts API Gateway event to RequestDTO
   * Pure function: transforms event to DTO (immutable)
   *
   * @param event - API Gateway event
   * @returns RequestDTO
   */
  toRequestDTO(event: APIGatewayProxyEvent): RequestDTO {
    // Guard clause: validate event
    if (!event) {
      throw new Error('API Gateway event is required');
    }

    if (!event.httpMethod || !event.path) {
      throw new Error('Invalid API Gateway event: missing httpMethod or path');
    }

    // Merge headers from both headers and multiValueHeaders
    // API Gateway can send headers in either format, so we need to handle both
    const mergedHeaders = this.mergeHeaders(event.headers, event.multiValueHeaders);

    // Extract query parameters (pure function)
    const queryParams = this.extractQueryParameters(event);

    // Parse body (pure function)
    const body = this.parseBody(event);

    // Extract cookies from merged headers (pure function)
    const cookies = this.extractCookies(mergedHeaders);

    // Build RequestDTO (immutable)
    return {
      method: event.httpMethod,
      path: event.path,
      pathParams: event.pathParameters || {},
      queryParams,
      body,
      headers: mergedHeaders,
      cookies,
      correlationId: event.requestContext.requestId,
      timestamp: new Date(event.requestContext.requestTimeEpoch),
    };
  }

  /**
   * Extract origin from headers (pure function)
   * API Gateway headers are case-insensitive, so we need to normalize
   * 
   * @param headers - Request headers (may contain undefined values)
   * @returns Origin header value or undefined
   */
  private extractOrigin(
    headers: Record<string, string | undefined> | undefined,
  ): string | undefined {
    // Guard clause: no headers
    if (!headers) {
      return undefined;
    }

    // API Gateway headers are case-insensitive
    // Try common variations: Origin, origin, ORIGIN
    const originKey = Object.keys(headers).find(
      (key) => key.toLowerCase() === 'origin',
    );
    
    if (!originKey) {
      return undefined;
    }

    const originValue = headers[originKey];
    return originValue || undefined;
  }

  /**
   * Build CORS headers from configuration (pure function)
   * Functional: no side effects, deterministic output
   *
   * @param origin - Request origin (from event headers)
   * @returns CORS headers object
   */
  private buildCorsHeaders(origin?: string): Record<string, string> {
    // Guard clause: CORS not configured or explicitly disabled
    const corsConfig = this.corsConfig;
    if (corsConfig === false || corsConfig === undefined || corsConfig === null) {
      return {};
    }

    // Build CORS headers based on configuration
    const corsOptions =
      typeof corsConfig === 'boolean'
        ? {
            origin: true,
            credentials: false,
            methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
          }
        : corsConfig;

    // Determine allowed origin (pure function)
    const allowedOrigin = this.determineAllowedOrigin(corsOptions.origin, origin);

    // Build headers immutably (functional composition)
    const headers: Record<string, string> = {
      'Access-Control-Allow-Origin': allowedOrigin,
    };

    // Add methods header
    if (corsOptions.methods) {
      const methods = Array.isArray(corsOptions.methods)
        ? corsOptions.methods.join(', ')
        : corsOptions.methods;
      headers['Access-Control-Allow-Methods'] = methods;
    }

    // Add allowed headers
    if (corsOptions.allowedHeaders) {
      const allowedHeaders = Array.isArray(corsOptions.allowedHeaders)
        ? corsOptions.allowedHeaders.join(', ')
        : corsOptions.allowedHeaders;
      headers['Access-Control-Allow-Headers'] = allowedHeaders;
    }

    // Add exposed headers
    if (corsOptions.exposedHeaders) {
      const exposedHeaders = Array.isArray(corsOptions.exposedHeaders)
        ? corsOptions.exposedHeaders.join(', ')
        : corsOptions.exposedHeaders;
      headers['Access-Control-Expose-Headers'] = exposedHeaders;
    }

    // Add max age
    if (corsOptions.maxAge) {
      headers['Access-Control-Max-Age'] = corsOptions.maxAge.toString();
    }

    // Add credentials header (only if origin is not '*')
    if (corsOptions.credentials && allowedOrigin !== '*') {
      headers['Access-Control-Allow-Credentials'] = 'true';
    }

    return headers;
  }

  /**
   * Determine allowed origin from CORS config (pure function)
   * Functional: no side effects, deterministic output
   *
   * @param originConfig - CORS origin configuration
   * @param requestOrigin - Request origin header
   * @returns Allowed origin string
   */
  private determineAllowedOrigin(
    originConfig: CorsOptions['origin'],
    requestOrigin?: string,
  ): string {
    // Guard clause: no origin config
    if (!originConfig) {
      return '*';
    }

    // Handle boolean (true = allow all)
    if (originConfig === true) {
      return requestOrigin || '*';
    }

    // Note: originConfig cannot be false based on CorsOptions type
    // This check is for type safety only

    // Handle string
    if (typeof originConfig === 'string') {
      return originConfig;
    }

    // Handle array (check if request origin matches)
    if (Array.isArray(originConfig)) {
      if (requestOrigin && originConfig.some((o) => o === requestOrigin)) {
        return requestOrigin;
      }
      return '*';
    }

    // Handle RegExp
    if (originConfig instanceof RegExp) {
      if (requestOrigin && originConfig.test(requestOrigin)) {
        return requestOrigin || '*';
      }
      return '*';
    }

    // Handle function (synchronous check only - Lambda doesn't support async callbacks)
    if (typeof originConfig === 'function') {
      // For Lambda, we can't use async callbacks, so default to request origin or '*'
      return requestOrigin || '*';
    }

    // Default: allow all
    return '*';
  }

  /**
   * Converts handler result to Lambda response format
   * Pure function: transforms result to LambdaResponse (immutable)
   *
   * @param result - Handler result
   * @param statusCode - HTTP status code
   * @param requestOrigin - Request origin header (for CORS)
   * @returns LambdaResponse
   */
  toLambdaResponse(
    result: unknown,
    statusCode = 200,
    requestOrigin?: string,
  ): LambdaResponse {
    // Build CORS headers (pure function) - applies to ALL responses
    const corsHeaders = this.buildCorsHeaders(requestOrigin);

    // Guard clause: handle null/undefined
    if (result === null || result === undefined) {
      return {
        statusCode,
        body: '',
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      };
    }

    // Handle redirect responses
    if (
      typeof result === 'object' &&
      result !== null &&
      'statusCode' in result &&
      'headers' in result &&
      'body' in result
    ) {
      const redirect = result as {
        statusCode: number;
        headers: Record<string, string>;
        body: null;
      };
      if (redirect.statusCode >= 300 && redirect.statusCode < 400) {
        return {
          statusCode: redirect.statusCode,
          headers: {
            ...redirect.headers,
            ...corsHeaders,
          },
          body: '',
        };
      }
    }

    // Handle custom response objects
    if (
      typeof result === 'object' &&
      result !== null &&
      'status' in result &&
      'body' in result
    ) {
      const customResponse = result as {
        status: number;
        body: unknown;
        headers?: Record<string, string>;
      };
      return {
        statusCode: customResponse.status,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
          ...customResponse.headers,
        },
        body: typeof customResponse.body === 'string'
          ? customResponse.body
          : JSON.stringify(customResponse.body),
      };
    }

    // Default: serialize to JSON with CORS headers
    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
      body: typeof result === 'string' ? result : JSON.stringify(result),
    };
  }

  /**
   * Handles Lambda event and returns Lambda response
   * Implements ILambdaAdapter interface
   * Orchestrates the request pipeline: routing → validation → execution
   *
   * @param event - Lambda event (API Gateway)
   * @param context - Optional Lambda context (not used for API Gateway)
   * @returns Lambda response
   */
  async handle(event: unknown, context?: unknown): Promise<LambdaResponse> {
    // Guard clause: validate event
    if (!event) {
      throw new Error('API Gateway event is required');
    }

    // Guard clause: validate event type
    if (!this.canHandle(event)) {
      throw new Error('Event is not an API Gateway event');
    }

    // Type assertion after validation
    const apiGatewayEvent = event as APIGatewayProxyEvent;

    try {
      // Step 1: Convert event to RequestDTO (pure transformation)
      const requestDTO = this.toRequestDTO(apiGatewayEvent);

      // Extract origin from headers (case-insensitive) - do this once at the start
      // Use merged headers from requestDTO (which includes multiValueHeaders)
      const requestOrigin = this.extractOrigin(requestDTO.headers);

      // Step 1.5: Handle OPTIONS preflight requests (CORS)
      if (requestDTO.method === 'OPTIONS') {
        return this.handleOptionsRequest(requestDTO);
      }

      // Step 2: Find route (routing logic)
      const route = this.findRoute(requestDTO);
      if (!route) {
        return this.createNotFoundResponse(requestDTO.path, requestOrigin);
      }

      // Step 3: Extract path parameters (pure function)
      const pathParams = this.extractPathParameters(route, requestDTO);

      // Step 4: Validate request and get validated data (validation logic)
      const validationResult = await this.validateAndGetData(
        route,
        requestDTO,
        pathParams,
        requestOrigin,
      );
      if (!validationResult.success) {
        return validationResult.error;
      }

      // Step 5: Build context with validated data (pure function)
      const context = this.buildRequestContext(
        requestDTO,
        validationResult.validatedParams,
        validationResult.validatedBody,
        validationResult.validatedQuery,
      );

      // Step 6: Execute handler
      const result = await route.handler(context);

      // Step 7: Convert to Lambda response with CORS headers (pure transformation)
      return this.toLambdaResponse(result, route.config.status || 200, requestOrigin);
    } catch (error) {
      // Handle errors using ErrorHandler (error handling logic)
      // Merge headers first (to include multiValueHeaders), then extract origin
      const mergedHeaders = this.mergeHeaders(apiGatewayEvent.headers, apiGatewayEvent.multiValueHeaders);
      const requestOrigin = this.extractOrigin(mergedHeaders);
      return await this.handleError(error as Error, requestOrigin);
    }
  }

  /**
   * Finds route for request
   * Pure function: routing logic only
   *
   * @param requestDTO - Request DTO
   * @returns Route if found, undefined otherwise
   */
  private findRoute(requestDTO: RequestDTO): Route | undefined {
    // Guard clause: validate requestDTO
    if (!requestDTO || !requestDTO.method || !requestDTO.path) {
      return undefined;
    }

    return this.routeRegistry.find(
      requestDTO.method as any,
      requestDTO.path,
    );
  }

  /**
   * Extracts path parameters from route
   * Pure function: no side effects, returns new object
   *
   * @param route - Matched route
   * @param requestDTO - Request DTO
   * @returns Path parameters object
   */
  private extractPathParameters(
    route: Route,
    requestDTO: RequestDTO,
  ): Record<string, string> {
    // Guard clause: validate inputs
    if (!route || !requestDTO) {
      return {};
    }

    // If route path matches exactly, use pathParams from event
    if (route.path === requestDTO.path) {
      return requestDTO.pathParams;
    }

    // Otherwise, extract from pattern matching
    return this.routeRegistry.extractPathParams(route.path, requestDTO.path);
  }

  /**
   * Validates request and returns validated data (pure function)
   * Functional: validation logic, returns validated data or error
   * Railway pattern: success or failure with data
   * 
   * Principles:
   * - Functional: Pure function (except for validator calls which are necessary)
   * - Guard Clauses: Early validation
   * - DDD: Domain Service delegation (SchemaValidator)
   * - Railway Pattern: Returns success or failure, never throws
   *
   * @param route - Route with schemas
   * @param requestDTO - Request DTO
   * @param pathParams - Extracted path parameters
   * @param requestOrigin - Request origin (for CORS headers in error responses)
   * @returns Validation result with validated data or error response
   */
  private async validateAndGetData(
    route: Route,
    requestDTO: RequestDTO,
    pathParams: Record<string, string>,
    requestOrigin?: string,
  ): Promise<
    | {
        success: true;
        validatedBody: unknown;
        validatedParams: Record<string, string>;
        validatedQuery: Record<string, string | string[] | undefined>;
      }
    | { success: false; error: LambdaResponse }
  > {
    // Guard clause: validate inputs
    if (!route || !requestDTO) {
      return {
        success: false,
        error: {
          statusCode: 400,
          body: JSON.stringify({ error: 'Invalid request' }),
          headers: { 'Content-Type': 'application/json' },
        },
      };
    }

    let validatedBody = requestDTO.body;
    let validatedParams = pathParams;
    let validatedQuery = requestDTO.queryParams;

    // Validate body if schema provided
    if (route.config.body) {
      const validationResult = this.validator.validate(
        route.config.body,
        requestDTO.body,
      );
      if (!validationResult.success) {
        return {
          success: false,
          error: this.createValidationErrorResponse(validationResult.errors, requestOrigin),
        };
      }
      validatedBody = validationResult.data;
    }

    // Validate params if schema provided
    if (route.config.params) {
      const validationResult = this.validator.validate(
        route.config.params,
        pathParams,
      );
      if (!validationResult.success) {
        return {
          success: false,
          error: this.createValidationErrorResponse(validationResult.errors, requestOrigin),
        };
      }
      validatedParams = validationResult.data as Record<string, string>;
    }

    // Validate query if schema provided
    if (route.config.query) {
      const validationResult = this.validator.validate(
        route.config.query,
        requestDTO.queryParams,
      );
      if (!validationResult.success) {
        return {
          success: false,
          error: this.createValidationErrorResponse(validationResult.errors, requestOrigin),
        };
      }
      validatedQuery = validationResult.data as Record<string, string | string[] | undefined>;
    }

    // Happy path: all validations passed, return validated data
    return {
      success: true,
      validatedBody,
      validatedParams,
      validatedQuery,
    };
  }

  /**
   * Handle OPTIONS preflight request (pure function)
   * Functional: creates CORS preflight response
   *
   * @param requestDTO - Request DTO
   * @returns Lambda response with CORS headers
   */
  private handleOptionsRequest(requestDTO: RequestDTO): LambdaResponse {
    // Guard clause: CORS not configured or explicitly disabled
    const corsConfig = this.corsConfig;
    if (corsConfig === false || corsConfig === undefined || corsConfig === null) {
      return {
        statusCode: 204,
        body: '',
        headers: {
          'Content-Type': 'application/json',
        },
      };
    }

    // Extract origin from headers (case-insensitive)
    const requestOrigin = this.extractOrigin(requestDTO.headers);

    // Build CORS headers (pure function)
    const corsHeaders = this.buildCorsHeaders(requestOrigin);

    // Find route to determine allowed methods
    const route = this.findRoute(requestDTO);
    const allowedMethods = route
      ? [route.method]
      : ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];

    // Build response with CORS headers
    return {
      statusCode: 204,
      body: '',
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Methods': allowedMethods.join(', '),
      },
    };
  }

  /**
   * Creates validation error response
   * Pure function: creates immutable error response
   *
   * @param errors - Validation errors
   * @param requestOrigin - Request origin header (for CORS)
   * @returns Lambda error response
   */
  private createValidationErrorResponse(
    errors: Array<{ field: string; message: string }>,
    requestOrigin?: string,
  ): LambdaResponse {
    // Build CORS headers (pure function)
    const corsHeaders = this.buildCorsHeaders(requestOrigin);

    // Guard clause: validate errors
    if (!errors || errors.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Validation Error' }),
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      };
    }

    return {
      statusCode: 400,
      body: JSON.stringify({
        error: 'Validation Error',
        details: errors,
      }),
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    };
  }

  /**
   * Creates not found response
   * Pure function: creates immutable error response
   *
   * @param path - Request path
   * @param requestOrigin - Request origin header (for CORS)
   * @returns Lambda error response
   */
  private createNotFoundResponse(path: string, requestOrigin?: string): LambdaResponse {
    // Build CORS headers (pure function)
    const corsHeaders = this.buildCorsHeaders(requestOrigin);

    // Guard clause: validate path
    if (!path) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Not Found' }),
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      };
    }

    return {
      statusCode: 404,
      body: JSON.stringify({
        message: `Route ${path} not found`,
        error: 'Not Found',
        statusCode: 404,
      }),
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    };
  }

  /**
   * Handles errors using ErrorHandler
   * Delegates error handling to domain service
   *
   * @param error - Error to handle
   * @param requestOrigin - Request origin header (for CORS)
   * @returns Lambda error response
   */
  private async handleError(error: Error, requestOrigin?: string): Promise<LambdaResponse> {
    // Guard clause: validate error
    if (!error) {
      const corsHeaders = this.buildCorsHeaders(requestOrigin);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Internal Server Error' }),
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      };
    }

    // Delegate to ErrorHandler (domain service)
    const errorResponse = await ErrorHandler.handle(error, {} as any);
    return this.toLambdaResponse(errorResponse.body, errorResponse.status, requestOrigin);
  }

  /**
   * Extracts query parameters from API Gateway event (pure function)
   * Functional: no side effects, returns new object
   * 
   * Principles:
   * - Functional: Pure function, immutable return
   * - Guard Clauses: Early validation
   * - DDD: Value Object transformation (event -> query params)
   *
   * @param event - API Gateway event
   * @returns Query parameters object (immutable)
   */
  private extractQueryParameters(
    event: APIGatewayProxyEvent,
  ): Record<string, string | string[] | undefined> {
    // Guard clause: no query parameters
    if (!event.multiValueQueryStringParameters && !event.queryStringParameters) {
      return {};
    }

    // Handle multi-value query parameters (preferred)
    // Functional: use reduce for pure transformation
    if (event.multiValueQueryStringParameters) {
      return Object.entries(event.multiValueQueryStringParameters).reduce(
        (params, [key, values]) => {
          // Guard clause: validate values array
          if (!Array.isArray(values) || values.length === 0) {
            return params;
          }

          // Functional: return new object (immutability)
          return {
            ...params,
            [key]: values.length === 1 ? values[0] : values,
          };
        },
        {} as Record<string, string | string[] | undefined>,
      );
    }

    // Fallback to single-value query parameters
    // Functional: spread operator creates new object (immutability)
    if (event.queryStringParameters) {
      return { ...event.queryStringParameters };
    }

    return {};
  }

  /**
   * Parses request body from API Gateway event (pure function)
   * Functional: no side effects, returns parsed body
   * 
   * Principles:
   * - Functional: Pure function, immutable return
   * - Guard Clauses: Early validation
   * - DDD: Value Object transformation (event body -> parsed body)
   *
   * @param event - API Gateway event
   * @returns Parsed body or empty object (immutable)
   */
  private parseBody(event: APIGatewayProxyEvent): unknown {
    // Guard clause: no body
    if (!event.body) {
      return {};
    }

    // Guard clause: empty body string
    if (event.body.trim() === '') {
      return {};
    }

    try {
      // Handle base64 encoded body (pure transformation)
      if (event.isBase64Encoded) {
        const decoded = Buffer.from(event.body, 'base64').toString('utf-8');
        // Guard clause: decoded body is empty
        if (!decoded || decoded.trim() === '') {
          return {};
        }
        return JSON.parse(decoded);
      }

      // Parse JSON body (pure transformation)
      return JSON.parse(event.body);
    } catch {
      // If parsing fails, return as string (immutable)
      // This is a graceful degradation - preserves original data
      return event.body;
    }
  }

  /**
   * Extracts cookies from headers (pure function)
   * Functional: no side effects, returns new object
   * 
   * Principles:
   * - Functional: Pure function, immutable return
   * - Guard Clauses: Early validation
   * - DDD: Value Object transformation (headers -> cookies)
   *
   * @param headers - Request headers
   * @returns Cookies object (immutable)
   */
  private extractCookies(
    headers: Record<string, string> | undefined,
  ): Record<string, string> {
    // Guard clause: no headers
    if (!headers) {
      return {};
    }

    // Find cookie header (case-insensitive) - use same pattern as extractOrigin
    const cookieKey = Object.keys(headers).find(
      (key) => key.toLowerCase() === 'cookie',
    );
    
    // Guard clause: no cookie header found
    if (!cookieKey) {
      return {};
    }

    const cookieHeader = headers[cookieKey];
    
    // Guard clause: cookie header is empty
    if (!cookieHeader) {
      return {};
    }

    // Parse cookies (functional: reduce) - pure transformation
    return cookieHeader.split(';').reduce((cookies, cookie) => {
      const trimmedCookie = cookie.trim();
      
      // Guard clause: skip empty cookies
      if (!trimmedCookie) {
        return cookies;
      }

      const [name, value] = trimmedCookie.split('=');
      
      // Guard clause: skip invalid cookie format
      if (!name || !value) {
        return cookies;
      }

      // Functional: return new object (immutability)
      return {
        ...cookies,
        [name.trim()]: value.trim(),
      };
    }, {} as Record<string, string>);
  }

  /**
   * Builds RequestContext from RequestDTO with validated data (pure function)
   * Functional: creates new context object (immutable)
   * 
   * Principles:
   * - Functional: Pure function, immutable return
   * - Guard Clauses: Early validation
   * - DDD: Value Object construction (validated data -> RequestContext)
   * 
   * Note: Data must be validated before calling this method (Railway pattern)
   *
   * @param requestDTO - Request DTO
   * @param validatedParams - Validated path parameters
   * @param validatedBody - Validated request body
   * @param validatedQuery - Validated query parameters
   * @returns RequestContext (immutable)
   */
  private buildRequestContext(
    requestDTO: RequestDTO,
    validatedParams: Record<string, string>,
    validatedBody: unknown,
    validatedQuery: Record<string, string | string[] | undefined>,
  ): RequestContext {
    // Guard clause: validate inputs
    if (!requestDTO) {
      throw new Error('RequestDTO is required');
    }

    // Guard clause: validate method
    if (!requestDTO.method) {
      throw new Error('Request method is required');
    }

    // Guard clause: validate path
    if (!requestDTO.path) {
      throw new Error('Request path is required');
    }

    // Functional: Build immutable context object with validated data
    // All data is already validated at this point (Railway pattern)
    return {
      method: requestDTO.method as any,
      path: requestDTO.path,
      params: validatedParams,
      query: validatedQuery,
      body: validatedBody,
      headers: requestDTO.headers as any,
      cookies: requestDTO.cookies || {},
      correlationId: requestDTO.correlationId || '',
      timestamp: requestDTO.timestamp || new Date(),
      dependencies: {},
      background: {
        addTask: () => {
          // Lambda doesn't support background tasks in the same way
          // Could use AWS Step Functions or EventBridge for async tasks
        },
      },
      download: () => {
        throw new Error('File downloads not supported in Lambda mode');
      },
      redirect: (url: string, statusCode = 302) => ({
        statusCode,
        headers: { Location: url },
        body: null,
      }),
      accepts: {
        json: () => true, // Simplified for Lambda
        html: () => false,
        xml: () => false,
        text: () => false,
        toon: () => false,
        type: () => 'application/json',
      },
    };
  }
}

