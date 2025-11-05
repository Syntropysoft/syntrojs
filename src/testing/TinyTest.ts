/**
 * TinyTest - Testing Wrapper
 *
 * Responsibility: Make testing APIs as easy as creating them
 * Pattern: Builder Pattern + Test Utilities
 * Principles: SOLID, DDD, Functional
 *
 * @example
 * ```typescript
 * test('GET /users/:id', async () => {
 *   const api = new TinyTest();
 *
 *   api.get('/users/:id', {
 *     params: z.object({ id: z.coerce.number() }),
 *     handler: ({ params }) => ({ id: params.id, name: 'Gaby' }),
 *   });
 *
 *   const { status, data } = await api.expectSuccess('GET', '/users/123');
 *   expect(data).toEqual({ id: 123, name: 'Gaby' });
 *
 *   await api.close();
 * });
 * ```
 */

import type { ZodSchema } from 'zod';
import { RouteRegistry } from '../application/RouteRegistry';
import { SyntroJS } from '../core';
import type { HttpMethod } from '../domain/types';

/**
 * HTTP request options for testing
 */
export interface TestRequestOptions {
  params?: Record<string, string | number>;
  query?: Record<string, string | number>;
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * Test response
 */
export interface TestResponse<T = unknown> {
  status: number;
  data: T;
  headers: Record<string, string | string[]>;
}

/**
 * Boundary test case
 */
export interface BoundaryTestCase {
  input: unknown;
  expected: {
    success: boolean;
    status?: number;
  };
}

/**
 * Contract test options
 */
export interface ContractTestOptions {
  input: unknown;
  responseSchema: ZodSchema;
  expectedStatus?: number;
}

/**
 * Property test options
 */
export interface PropertyTestOptions {
  schema: ZodSchema;
  iterations?: number;
  property: (response: any) => boolean;
}

/**
 * TinyTest - Testing wrapper for SyntroJS
 * Extends SyntroJS with testing utilities
 */
export class TinyTest extends SyntroJS {
  private serverAddress: string | null = null;
  private isServerStarted = false;

  constructor(config?: any) {
    super(config);
    // Clear route registry on instantiation for test isolation
    RouteRegistry.clear();
  }

  // NOTE: Test registry is reserved for future SmartMutator integration
  // /** Test registry for SmartMutator integration */
  // private testRegistry = new Map<string, string[]>();

  /**
   * Gets test coverage map for SmartMutator
   * Currently returns empty map (reserved for future implementation)
   */
  getTestCoverage(): Map<string, string[]> {
    return new Map();
  }

  /**
   * Ensures server is started on a random port
   * Called automatically before making requests
   */
  private async ensureServer(): Promise<void> {
    if (!this.isServerStarted) {
      this.serverAddress = await this.listen(0); // Port 0 = random port
      this.isServerStarted = true;
    }
  }

  /**
   * Gets the base URL for the test server
   */
  private getBaseUrl(): string {
    if (!this.serverAddress) {
      throw new Error('Server not started. Call await api.ensureServer() first.');
    }
    return this.serverAddress;
  }

  /**
   * Makes a raw HTTP request to the test server
   * Returns the native Fetch Response object without parsing
   *
   * Use this for:
   * - File downloads (need to check Content-Disposition headers)
   * - Binary data (need arrayBuffer())
   * - Streams (need body.getReader())
   * - Custom response handling
   *
   * @param method - HTTP method
   * @param path - Request path
   * @param options - Request options
   * @returns Native Fetch Response object
   */
  async rawRequest(
    method: HttpMethod,
    path: string,
    options: TestRequestOptions = {},
  ): Promise<Response> {
    // Ensure server is started
    await this.ensureServer();

    const baseUrl = this.getBaseUrl();

    // Build URL with query parameters
    let url = `${baseUrl}${path}`;

    if (options.query) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(options.query)) {
        params.append(key, String(value));
      }
      const queryString = params.toString();
      url += `?${queryString}`;
    }

    // Functional: Build request configuration
    const { body, headers } = this.buildRequestConfig(options.body, options.headers);

    const fetchOptions: RequestInit = {
      method,
      headers,
      body,
    };

    // Make request and return raw Response
    return await fetch(url, fetchOptions);
  }

  /**
   * Makes an HTTP request to the test server
   *
   * @param method - HTTP method
   * @param path - Request path
   * @param options - Request options
   * @returns Test response
   */
  async request<T = unknown>(
    method: HttpMethod,
    path: string,
    options: TestRequestOptions = {},
  ): Promise<TestResponse<T>> {
    // Use rawRequest and parse the response
    const response = await this.rawRequest(method, path, options);

    // Parse response
    let data: T;
    const contentType = response.headers.get('content-type');

    // HEAD requests should not have a body - only return headers
    if (method === 'HEAD') {
      data = null as any;
    } else if (contentType?.includes('application/json')) {
      data = (await response.json()) as T;
    } else {
      data = (await response.text()) as any;
    }

    return {
      status: response.status,
      data,
      headers: Object.fromEntries(response.headers.entries()),
    };
  }

  /**
   * Build request configuration based on body type
   *
   * Pure function: Returns new config without side effects
   * Guard clauses: Handles all body types
   *
   * @param body - Request body (FormData, object, or undefined)
   * @param customHeaders - Custom headers to merge
   * @returns Configuration object with body and headers
   */
  private buildRequestConfig(
    body: unknown,
    customHeaders?: Record<string, string>,
  ): { body?: FormData | string; headers: Record<string, string> } {
    // Default headers
    const headers: Record<string, string> = customHeaders ? { ...customHeaders } : {};

    // Guard clause: No body
    if (!body) {
      return {
        headers: { 'Content-Type': 'application/json', ...headers },
      };
    }

    // Guard clause: FormData (multipart/form-data)
    if (body instanceof FormData) {
      // Let fetch auto-set Content-Type with boundary
      return {
        body,
        headers, // Don't set Content-Type for multipart
      };
    }

    // Guard clause: String body (form-urlencoded or raw text)
    if (typeof body === 'string') {
      // Use provided Content-Type or default to form-urlencoded if looks like form data
      const isFormUrlencoded =
        headers['Content-Type']?.includes('form-urlencoded') || body.includes('=');

      return {
        body,
        headers: isFormUrlencoded
          ? { 'Content-Type': 'application/x-www-form-urlencoded', ...headers }
          : { 'Content-Type': 'text/plain', ...headers },
      };
    }

    // Default: JSON body
    return {
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', ...headers },
    };
  }

  /**
   * Expects a successful response (2xx status)
   *
   * @param method - HTTP method
   * @param path - Request path
   * @param options - Request options
   * @returns Test response
   * @throws If response is not 2xx
   */
  async expectSuccess<T = unknown>(
    method: HttpMethod,
    path: string,
    options: TestRequestOptions = {},
  ): Promise<TestResponse<T>> {
    const response = await this.request<T>(method, path, options);

    if (response.status < 200 || response.status >= 300) {
      throw new Error(
        `Expected success (2xx) but got ${response.status}. Response: ${JSON.stringify(response.data)}`,
      );
    }

    return response;
  }

  /**
   * Expects an error response (4xx or 5xx status)
   *
   * @param method - HTTP method
   * @param path - Request path
   * @param expectedStatus - Expected status code
   * @param options - Request options
   * @returns Test response
   * @throws If response is not an error
   */
  async expectError<T = unknown>(
    method: HttpMethod,
    path: string,
    expectedStatus: number,
    options: TestRequestOptions = {},
  ): Promise<TestResponse<T>> {
    const response = await this.request<T>(method, path, options);

    if (response.status !== expectedStatus) {
      throw new Error(
        `Expected status ${expectedStatus} but got ${response.status}. Response: ${JSON.stringify(response.data)}`,
      );
    }

    if (response.status < 400) {
      throw new Error(`Expected error status (4xx/5xx) but got ${response.status}`);
    }

    return response;
  }

  /**
   * Tests boundary conditions automatically
   *
   * Perfect for catching off-by-one errors and killing mutation testing mutants
   *
   * @param method - HTTP method
   * @param path - Request path
   * @param cases - Boundary test cases
   */
  async testBoundaries(method: HttpMethod, path: string, cases: BoundaryTestCase[]): Promise<void> {
    // Guard clause
    if (!cases || cases.length === 0) {
      throw new Error('At least one boundary test case is required');
    }

    for (const testCase of cases) {
      const response = await this.request(method, path, {
        body: testCase.input,
      });

      if (testCase.expected.success) {
        // Expect 2xx status
        if (response.status < 200 || response.status >= 300) {
          throw new Error(
            `Boundary case failed for input ${JSON.stringify(testCase.input)}. ` +
              `Expected success but got status ${response.status}`,
          );
        }

        if (testCase.expected.status && response.status !== testCase.expected.status) {
          throw new Error(`Expected status ${testCase.expected.status} but got ${response.status}`);
        }
      } else {
        // Expect error status
        if (response.status >= 200 && response.status < 300) {
          throw new Error(
            `Boundary case failed for input ${JSON.stringify(testCase.input)}. ` +
              `Expected error but got success status ${response.status}`,
          );
        }

        if (testCase.expected.status && response.status !== testCase.expected.status) {
          throw new Error(`Expected status ${testCase.expected.status} but got ${response.status}`);
        }
      }
    }
  }

  /**
   * Tests that response matches a contract (schema)
   *
   * @param method - HTTP method
   * @param path - Request path
   * @param options - Contract test options
   */
  async testContract(
    method: HttpMethod,
    path: string,
    options: ContractTestOptions,
  ): Promise<void> {
    // Guard clauses
    if (!options.input) {
      throw new Error('Input is required for contract testing');
    }

    if (!options.responseSchema) {
      throw new Error('Response schema is required for contract testing');
    }

    const response = await this.request(method, path, {
      body: options.input,
    });

    const expectedStatus = options.expectedStatus ?? 200;

    if (response.status !== expectedStatus) {
      throw new Error(`Expected status ${expectedStatus} but got ${response.status}`);
    }

    // Validate response against schema
    const validation = options.responseSchema.safeParse(response.data);

    if (!validation.success) {
      throw new Error(
        `Response does not match contract. Errors: ${JSON.stringify(validation.error.errors)}`,
      );
    }
  }

  /**
   * Property-based testing lite
   * Generates random valid inputs and verifies a property holds
   *
   * @param method - HTTP method
   * @param path - Request path
   * @param options - Property test options
   */
  async testProperty(
    method: HttpMethod,
    path: string,
    options: PropertyTestOptions,
  ): Promise<void> {
    // Guard clauses
    if (!options.schema) {
      throw new Error('Schema is required for property testing');
    }

    if (!options.property) {
      throw new Error('Property function is required');
    }

    const iterations = options.iterations ?? 100;

    for (let i = 0; i < iterations; i++) {
      // Generate random valid input (simplified - real implementation would use faker/fast-check)
      const input = this.generateRandomInput(options.schema);

      const response = await this.request(method, path, {
        body: input,
      });

      // Verify property holds
      const propertyHolds = options.property(response.data);

      if (!propertyHolds) {
        throw new Error(
          `Property failed for input: ${JSON.stringify(input)}. ` +
            `Response: ${JSON.stringify(response.data)}`,
        );
      }
    }
  }

  /**
   * Generates random input from schema (simplified)
   * Real implementation would use fast-check or faker
   *
   * @param _schema - Zod schema (unused in simplified implementation)
   * @returns Random valid input
   */
  private generateRandomInput(_schema: ZodSchema): unknown {
    // Simplified: just return a basic object
    // Real implementation would introspect schema and generate proper random data
    return {
      name: `User${Math.floor(Math.random() * 1000)}`,
      age: Math.floor(Math.random() * 100),
    };
  }

  /**
   * Closes the test server
   * Should be called in afterEach or test cleanup
   */
  override async close(): Promise<void> {
    if (this.isServerStarted) {
      await super.close();
      this.isServerStarted = false;
      this.serverAddress = null;
    }
    // Clear route registry for testing isolation
    RouteRegistry.clear();
  }
}
