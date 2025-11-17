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
  constructor(
    private readonly routeRegistry: typeof RouteRegistry,
    private readonly validator: typeof SchemaValidator,
  ) {
    // Guard clause: validate dependencies
    if (!routeRegistry) {
      throw new Error('RouteRegistry is required');
    }
    if (!validator) {
      throw new Error('SchemaValidator is required');
    }
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

    // Extract query parameters (pure function)
    const queryParams = this.extractQueryParameters(event);

    // Parse body (pure function)
    const body = this.parseBody(event);

    // Extract cookies from headers (pure function)
    const cookies = this.extractCookies(event.headers);

    // Build RequestDTO (immutable)
    return {
      method: event.httpMethod,
      path: event.path,
      pathParams: event.pathParameters || {},
      queryParams,
      body,
      headers: event.headers || {},
      cookies,
      correlationId: event.requestContext.requestId,
      timestamp: new Date(event.requestContext.requestTimeEpoch),
    };
  }

  /**
   * Converts handler result to Lambda response format
   * Pure function: transforms result to LambdaResponse (immutable)
   *
   * @param result - Handler result
   * @param statusCode - HTTP status code
   * @returns LambdaResponse
   */
  toLambdaResponse(result: unknown, statusCode = 200): LambdaResponse {
    // Guard clause: handle null/undefined
    if (result === null || result === undefined) {
      return {
        statusCode,
        body: '',
        headers: {
          'Content-Type': 'application/json',
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
          headers: redirect.headers,
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
          ...customResponse.headers,
        },
        body: typeof customResponse.body === 'string'
          ? customResponse.body
          : JSON.stringify(customResponse.body),
      };
    }

    // Default: serialize to JSON
    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
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

      // Step 2: Find route (routing logic)
      const route = this.findRoute(requestDTO);
      if (!route) {
        return this.createNotFoundResponse(requestDTO.path);
      }

      // Step 3: Extract path parameters (pure function)
      const pathParams = this.extractPathParameters(route, requestDTO);

      // Step 4: Validate request and get validated data (validation logic)
      const validationResult = await this.validateAndGetData(route, requestDTO, pathParams);
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

      // Step 7: Convert to Lambda response (pure transformation)
      return this.toLambdaResponse(result, route.config.status || 200);
    } catch (error) {
      // Handle errors using ErrorHandler (error handling logic)
      return await this.handleError(error as Error);
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
   * Validates request and returns validated data
   * Pure function: validation logic, returns validated data or error
   * Railway pattern: success or failure with data
   *
   * @param route - Route with schemas
   * @param requestDTO - Request DTO
   * @param pathParams - Extracted path parameters
   * @returns Validation result with validated data or error response
   */
  private async validateAndGetData(
    route: Route,
    requestDTO: RequestDTO,
    pathParams: Record<string, string>,
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
          error: this.createValidationErrorResponse(validationResult.errors),
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
          error: this.createValidationErrorResponse(validationResult.errors),
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
          error: this.createValidationErrorResponse(validationResult.errors),
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
   * Creates validation error response
   * Pure function: creates immutable error response
   *
   * @param errors - Validation errors
   * @returns Lambda error response
   */
  private createValidationErrorResponse(
    errors: Array<{ field: string; message: string }>,
  ): LambdaResponse {
    // Guard clause: validate errors
    if (!errors || errors.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Validation Error' }),
        headers: {
          'Content-Type': 'application/json',
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
      },
    };
  }

  /**
   * Creates not found response
   * Pure function: creates immutable error response
   *
   * @param path - Request path
   * @returns Lambda error response
   */
  private createNotFoundResponse(path: string): LambdaResponse {
    // Guard clause: validate path
    if (!path) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Not Found' }),
        headers: {
          'Content-Type': 'application/json',
        },
      };
    }

    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Not Found', path }),
      headers: {
        'Content-Type': 'application/json',
      },
    };
  }

  /**
   * Handles errors using ErrorHandler
   * Delegates error handling to domain service
   *
   * @param error - Error to handle
   * @returns Lambda error response
   */
  private async handleError(error: Error): Promise<LambdaResponse> {
    // Guard clause: validate error
    if (!error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Internal Server Error' }),
        headers: {
          'Content-Type': 'application/json',
        },
      };
    }

    // Delegate to ErrorHandler (domain service)
    const errorResponse = await ErrorHandler.handle(error, {} as any);
    return this.toLambdaResponse(errorResponse.body, errorResponse.status);
  }

  /**
   * Extracts query parameters from API Gateway event
   * Pure function: no side effects, returns new object
   *
   * @param event - API Gateway event
   * @returns Query parameters object
   */
  private extractQueryParameters(
    event: APIGatewayProxyEvent,
  ): Record<string, string | string[] | undefined> {
    // Guard clause: no query parameters
    if (!event.multiValueQueryStringParameters && !event.queryStringParameters) {
      return {};
    }

    // Handle multi-value query parameters (preferred)
    if (event.multiValueQueryStringParameters) {
      return Object.entries(event.multiValueQueryStringParameters).reduce(
        (params, [key, values]) => {
          params[key] = values.length === 1 ? values[0] : values;
          return params;
        },
        {} as Record<string, string | string[] | undefined>,
      );
    }

    // Fallback to single-value query parameters
    if (event.queryStringParameters) {
      return { ...event.queryStringParameters };
    }

    return {};
  }

  /**
   * Parses request body from API Gateway event
   * Pure function: no side effects, returns parsed body
   *
   * @param event - API Gateway event
   * @returns Parsed body or empty object
   */
  private parseBody(event: APIGatewayProxyEvent): unknown {
    // Guard clause: no body
    if (!event.body) {
      return {};
    }

    try {
      // Handle base64 encoded body
      if (event.isBase64Encoded) {
        const decoded = Buffer.from(event.body, 'base64').toString('utf-8');
        return JSON.parse(decoded);
      }

      // Parse JSON body
      return JSON.parse(event.body);
    } catch {
      // If parsing fails, return as string (immutable)
      return event.body;
    }
  }

  /**
   * Extracts cookies from headers
   * Pure function: no side effects, returns new object
   *
   * @param headers - Request headers
   * @returns Cookies object
   */
  private extractCookies(
    headers: Record<string, string> | undefined,
  ): Record<string, string> {
    // Guard clause: no headers
    if (!headers) {
      return {};
    }

    // Find cookie header (case-insensitive)
    const cookieHeader = headers['cookie'] || headers['Cookie'];
    if (!cookieHeader) {
      return {};
    }

    // Parse cookies (functional: reduce)
    return cookieHeader.split(';').reduce((cookies, cookie) => {
      const [name, value] = cookie.trim().split('=');
      if (name && value) {
        cookies[name] = value;
      }
      return cookies;
    }, {} as Record<string, string>);
  }

  /**
   * Builds RequestContext from RequestDTO with validated data
   * Pure function: creates new context object (immutable)
   * Note: Data must be validated before calling this method
   *
   * @param requestDTO - Request DTO
   * @param validatedParams - Validated path parameters
   * @param validatedBody - Validated request body
   * @param validatedQuery - Validated query parameters
   * @returns Request context
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

    // Build immutable context object with validated data
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

