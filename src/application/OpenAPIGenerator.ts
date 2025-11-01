/**
 * OpenAPIGenerator - Application Service
 *
 * Responsibility: Generate OpenAPI 3.1 specification from routes
 * Pattern: Singleton (Module Pattern)
 * Principles: SOLID (Single Responsibility), Guard Clauses, Functional
 */

import type { ZodSchema } from 'zod';
import type { Route } from '../domain/Route';
import type { HttpMethod } from '../domain/types';
import { ZodAdapter } from '../infrastructure/ZodAdapter';

/**
 * OpenAPI 3.1 specification structure
 */
export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  servers?: Array<{ url: string; description?: string }>;
  paths: Record<string, PathItem>;
  components?: {
    schemas?: Record<string, unknown>;
  };
}

/**
 * Path item for OpenAPI spec
 */
interface PathItem {
  get?: OperationObject;
  post?: OperationObject;
  put?: OperationObject;
  delete?: OperationObject;
  patch?: OperationObject;
  head?: OperationObject;
  options?: OperationObject;
}

/**
 * Operation object for OpenAPI spec
 */
interface OperationObject {
  summary?: string;
  description?: string;
  operationId?: string;
  tags?: string[];
  deprecated?: boolean;
  parameters?: Array<ParameterObject>;
  requestBody?: RequestBodyObject;
  responses: Record<string, ResponseObject>;
}

/**
 * Parameter object for OpenAPI spec
 */
interface ParameterObject {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required?: boolean;
  schema: unknown;
  description?: string;
}

/**
 * Request body object for OpenAPI spec
 */
interface RequestBodyObject {
  description?: string;
  required?: boolean;
  content: {
    'application/json': {
      schema: unknown;
    };
  };
}

/**
 * Response object for OpenAPI spec
 */
interface ResponseObject {
  description: string;
  content?: {
    'application/json': {
      schema: unknown;
    };
  };
}

/**
 * OpenAPI generator configuration
 */
export interface OpenAPIConfig {
  title: string;
  version: string;
  description?: string;
  servers?: Array<{ url: string; description?: string }>;
}

interface JsonSchema {
  properties?: Record<string, unknown>;
  required?: string[];
}

/**
 * OpenAPI generator implementation
 */
class OpenAPIGeneratorImpl {
  /**
   * Generates OpenAPI 3.1 specification from routes
   *
   * Pure function: same routes → same spec
   *
   * @param routes - Array of routes
   * @param config - OpenAPI configuration
   * @returns OpenAPI 3.1 spec
   */
  generate(routes: ReadonlyArray<Route>, config: OpenAPIConfig): OpenAPISpec {
    // Guard clauses
    if (!routes) {
      throw new Error('Routes array is required');
    }

    if (!config) {
      throw new Error('Config is required');
    }

    if (!config.title) {
      throw new Error('Config.title is required');
    }

    if (!config.version) {
      throw new Error('Config.version is required');
    }

    // Build spec
    const spec: OpenAPISpec = {
      openapi: '3.1.0',
      info: {
        title: config.title,
        version: config.version,
        description: config.description,
      },
      paths: this.buildPaths(routes),
    };

    // Add servers if provided
    if (config.servers && config.servers.length > 0) {
      spec.servers = config.servers;
    }

    return spec;
  }

  /**
   * Builds paths object from routes
   *
   * Functional: reduce to build paths object
   *
   * @param routes - Array of routes
   * @returns Paths object
   */
  private buildPaths(routes: ReadonlyArray<Route>): Record<string, PathItem> {
    const paths: Record<string, PathItem> = {};

    // Functional: reduce routes into paths object
    for (const route of routes) {
      const path = route.path;
      const method = route.method.toLowerCase() as Lowercase<HttpMethod>;

      // Initialize path if doesn't exist
      if (!paths[path]) {
        paths[path] = {};
      }

      // Add operation to path
      const pathItem = paths[path];
      if (!pathItem) {
        continue;
      }

      if (
        method === 'get' ||
        method === 'post' ||
        method === 'put' ||
        method === 'delete' ||
        method === 'patch' ||
        method === 'head' ||
        method === 'options'
      ) {
        pathItem[method] = this.buildOperation(route);
      }
    }

    return paths;
  }

  /**
   * Builds operation object for a route
   *
   * @param route - Route to build operation from
   * @returns Operation object
   */
  private buildOperation(route: Route): OperationObject {
    // Determine status code for response
    const statusCode = route.config.status?.toString() ?? '200';

    // Initialize with empty responses (will be populated below)
    const operation: OperationObject = {
      responses: {},
    };

    // Add metadata if present
    if (route.config.summary) {
      operation.summary = route.config.summary;
    }

    if (route.config.description) {
      operation.description = route.config.description;
    }

    if (route.config.operationId) {
      operation.operationId = route.config.operationId;
    }

    if (route.config.tags) {
      operation.tags = route.config.tags;
    }

    if (route.config.deprecated) {
      operation.deprecated = route.config.deprecated;
    }

    // Add parameters (path + query)
    const parameters: ParameterObject[] = [];

    // Path parameters
    if (route.config.params) {
      const pathParams = this.extractPathParameters(route.path, route.config.params);
      parameters.push(...pathParams);
    }

    // Query parameters
    if (route.config.query) {
      const queryParams = this.extractQueryParameters(route.config.query);
      parameters.push(...queryParams);
    }

    if (parameters.length > 0) {
      operation.parameters = parameters;
    }

    // Request body
    if (route.config.body) {
      operation.requestBody = {
        required: true,
        content: {
          'application/json': {
            schema: ZodAdapter.toJsonSchema(route.config.body),
          },
        },
      };
    }

    // Response - use custom status code or default 200
    if (route.config.response) {
      operation.responses[statusCode] = {
        description: 'Successful response',
        content: {
          'application/json': {
            schema: ZodAdapter.toJsonSchema(route.config.response),
          },
        },
      };
    } else {
      // No response schema - just basic response
      operation.responses[statusCode] = {
        description: 'Successful response',
      };
    }

    return operation;
  }

  /**
   * Extracts path parameters from route path and schema
   *
   * @param path - Route path (e.g., /users/:id)
   * @param schema - Zod schema for params
   * @returns Array of parameter objects
   */
  private extractPathParameters(path: string, schema: unknown): ParameterObject[] {
    // Extract param names from path (e.g., :id, :userId)
    const paramMatches = path.matchAll(/:([a-zA-Z_][a-zA-Z0-9_]*)/g);
    const paramNames = Array.from(paramMatches, (match) => match[1]);

    // Convert to OpenAPI parameters
    return paramNames
      .filter((name): name is string => name !== undefined)
      .map((name) => ({
        name,
        in: 'path' as const,
        required: true,
        schema: this.getSchemaForProperty(schema, name),
      }));
  }

  /**
   * Extracts query parameters from schema
   *
   * @param schema - Zod schema for query
   * @returns Array of parameter objects
   */
  private extractQueryParameters(schema: unknown): ParameterObject[] {
    const jsonSchema = ZodAdapter.toJsonSchema(schema as ZodSchema) as JsonSchema;

    // Get properties from JSON Schema
    const properties = jsonSchema.properties || {};
    const required = jsonSchema.required || [];

    // Convert to OpenAPI parameters
    return Object.keys(properties).map((name) => ({
      name,
      in: 'query' as const,
      required: required.includes(name),
      schema: properties[name],
    }));
  }

  /**
   * Gets schema for a specific property
   *
   * @param schema - Zod schema
   * @param propertyName - Property name
   * @returns JSON Schema for property
   */
  private getSchemaForProperty(schema: unknown, propertyName: string): unknown {
    const jsonSchema = ZodAdapter.toJsonSchema(schema as ZodSchema) as JsonSchema;
    const properties = jsonSchema.properties || {};

    return properties[propertyName] || { type: 'string' };
  }
}

/**
 * Exported singleton (Module Pattern)
 */
export const OpenAPIGenerator = new OpenAPIGeneratorImpl();

/**
 * Factory for testing
 */
export const createOpenAPIGenerator = (): OpenAPIGeneratorImpl => new OpenAPIGeneratorImpl();
