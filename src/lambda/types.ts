/**
 * Lambda Types - Domain Layer
 *
 * Responsibility: Type definitions for Lambda adapters
 * Pattern: Value Objects / DTOs
 * Principles: SOLID, DDD, Immutability
 */

/**
 * Request DTO - Abstraction layer between HTTP and Lambda
 * Allows same handlers to work with both HTTP requests and Lambda events
 */
export interface RequestDTO {
  /** HTTP method */
  method: string;

  /** Request path */
  path: string;

  /** Path parameters (extracted from dynamic routes) */
  pathParams: Record<string, string>;

  /** Query string parameters */
  queryParams: Record<string, string | string[] | undefined>;

  /** Request body (parsed JSON or raw) */
  body: unknown;

  /** Request headers */
  headers: Record<string, string | undefined>;

  /** Cookies */
  cookies?: Record<string, string>;

  /** Correlation ID for tracing */
  correlationId?: string;

  /** Request timestamp */
  timestamp?: Date;
}

/**
 * Lambda Response - Standard AWS Lambda response format
 */
export interface LambdaResponse {
  /** HTTP status code */
  statusCode: number;

  /** Response headers */
  headers?: Record<string, string>;

  /** Response body (stringified JSON or raw) */
  body: string;

  /** Multi-value headers (for API Gateway) */
  multiValueHeaders?: Record<string, string[]>;

  /** Indicates if response is base64 encoded */
  isBase64Encoded?: boolean;
}

/**
 * Lambda Context - AWS Lambda context information
 */
export interface LambdaContext {
  /** Request ID */
  requestId: string;

  /** Function name */
  functionName: string;

  /** Function version */
  functionVersion: string;

  /** Remaining time in milliseconds */
  getRemainingTimeInMillis(): number;

  /** AWS request ID */
  awsRequestId: string;

  /** Invoked function ARN */
  invokedFunctionArn: string;

  /** Log group name */
  logGroupName: string;

  /** Log stream name */
  logStreamName: string;
}

/**
 * Lambda Event Types
 */
export type LambdaEventType =
  | 'api-gateway'
  | 'api-gateway-v2'
  | 'sqs'
  | 's3'
  | 'eventbridge'
  | 'unknown';

