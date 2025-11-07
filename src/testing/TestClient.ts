/**
 * TestClient - Test client for existing SyntroJS apps
 *
 * Inspired by Elysia's treaty pattern
 * Tests your REAL app without recreating routes
 *
 * @example
 * ```typescript
 * import { test } from 'syntrojs/testing'
 * import { app } from './index.js'
 *
 * const client = test(app)
 *
 * const res = await client.get('/users')
 * expect(res.status).toBe(200)
 *
 * const res2 = await client.post('/users', {
 *   body: { name: 'John', email: 'john@example.com' }
 * })
 * expect(res2.data.id).toBeDefined()
 * ```
 */

import type { SyntroJS } from '../core';
import type { HttpMethod } from '../domain/types';

/**
 * Test request options
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
 * TestClient - Wraps an existing SyntroJS app for testing
 */
export class TestClient {
  private app: SyntroJS;
  private serverAddress: string | null = null;
  private isServerStarted = false;

  constructor(app: SyntroJS) {
    this.app = app;
  }

  /**
   * Ensures server is started on a random port
   * Called automatically before making requests
   */
  private async ensureServer(): Promise<void> {
    if (!this.isServerStarted) {
      this.serverAddress = await this.app.listen(0); // Port 0 = random port
      this.isServerStarted = true;
    }
  }

  /**
   * Gets the base URL for the test server
   */
  private getBaseUrl(): string {
    if (!this.serverAddress) {
      throw new Error('Server not started');
    }
    return this.serverAddress;
  }

  /**
   * Makes an HTTP request to the app
   */
  async request<T = unknown>(
    method: HttpMethod,
    path: string,
    options: TestRequestOptions = {},
  ): Promise<TestResponse<T>> {
    await this.ensureServer();

    const baseUrl = this.getBaseUrl();

    // Build URL with query parameters
    let url = `${baseUrl}${path}`;

    if (options.query) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(options.query)) {
        params.append(key, String(value));
      }
      url += `?${params.toString()}`;
    }

    // Build request config
    const { body, headers } = this.buildRequestConfig(options.body, options.headers);

    const fetchOptions: RequestInit = {
      method,
      headers,
      body,
    };

    // Make request
    const response = await fetch(url, fetchOptions);

    // Parse response
    let data: T;
    const contentType = response.headers.get('content-type');

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
   * Shorthand for GET request
   */
  async get<T = unknown>(path: string, options?: Omit<TestRequestOptions, 'body'>): Promise<TestResponse<T>> {
    return this.request<T>('GET', path, options);
  }

  /**
   * Shorthand for POST request
   */
  async post<T = unknown>(path: string, options?: TestRequestOptions): Promise<TestResponse<T>> {
    return this.request<T>('POST', path, options);
  }

  /**
   * Shorthand for PUT request
   */
  async put<T = unknown>(path: string, options?: TestRequestOptions): Promise<TestResponse<T>> {
    return this.request<T>('PUT', path, options);
  }

  /**
   * Shorthand for PATCH request
   */
  async patch<T = unknown>(path: string, options?: TestRequestOptions): Promise<TestResponse<T>> {
    return this.request<T>('PATCH', path, options);
  }

  /**
   * Shorthand for DELETE request
   */
  async delete<T = unknown>(path: string, options?: Omit<TestRequestOptions, 'body'>): Promise<TestResponse<T>> {
    return this.request<T>('DELETE', path, options);
  }

  /**
   * Build request configuration
   */
  private buildRequestConfig(
    body: unknown,
    customHeaders?: Record<string, string>,
  ): { body?: FormData | string; headers: Record<string, string> } {
    const headers: Record<string, string> = customHeaders ? { ...customHeaders } : {};

    if (!body) {
      return { headers: { 'Content-Type': 'application/json', ...headers } };
    }

    if (body instanceof FormData) {
      return { body, headers };
    }

    if (typeof body === 'string') {
      const isFormUrlencoded =
        headers['Content-Type']?.includes('form-urlencoded') || body.includes('=');

      return {
        body,
        headers: isFormUrlencoded
          ? { 'Content-Type': 'application/x-www-form-urlencoded', ...headers }
          : { 'Content-Type': 'text/plain', ...headers },
      };
    }

    return {
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', ...headers },
    };
  }

  /**
   * Closes the test server
   */
  async close(): Promise<void> {
    if (this.isServerStarted) {
      await this.app.close();
      this.isServerStarted = false;
      this.serverAddress = null;
    }
  }
}

/**
 * Creates a test client for an existing SyntroJS app
 *
 * @param app - The SyntroJS app to test
 * @returns Test client
 *
 * @example
 * ```typescript
 * import { test } from 'syntrojs/testing'
 * import { app } from './index.js'
 *
 * const client = test(app)
 * const res = await client.get('/users')
 * await client.close()
 * ```
 */
export function test(app: SyntroJS): TestClient {
  return new TestClient(app);
}

