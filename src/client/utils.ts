/**
 * Type-Safe Client Utilities
 *
 * Pure Functions for Client Operations
 * Principles: Functional Programming, Immutability, Guard Clauses
 */

import type { HttpMethod } from '../domain/types';
import type { ClientRequestOptions, ClientResponse } from './types';

// ===== GUARD CLAUSES =====

/**
 * Guard Clause: Validate HTTP method
 * Principio: Guard Clauses + Fail Fast
 */
const guardHttpMethod = (method: string): HttpMethod => {
  if (!method) {
    throw new Error('HTTP method is required');
  }

  if (typeof method !== 'string') {
    throw new Error('HTTP method must be a string');
  }

  const normalized = method.toUpperCase().trim() as HttpMethod;
  const validMethods: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

  if (!validMethods.includes(normalized)) {
    throw new Error(`Invalid HTTP method: ${method}`);
  }

  return normalized;
};

/**
 * Guard Clause: Validate path
 * Principio: Guard Clauses + Fail Fast
 */
const guardPath = (path: string | null | undefined): string => {
  if (!path) {
    throw new Error('Path is required');
  }

  if (typeof path !== 'string') {
    throw new Error('Path must be a string');
  }

  if (!path.startsWith('/')) {
    throw new Error('Path must start with /');
  }

  return path;
};

/**
 * Guard Clause: Validate base URL
 * Principio: Guard Clauses + Fail Fast
 */
const guardBaseUrl = (baseUrl: string | null | undefined): string => {
  if (!baseUrl) {
    throw new Error('Base URL is required for remote mode');
  }

  if (typeof baseUrl !== 'string') {
    throw new Error('Base URL must be a string');
  }

  try {
    new URL(baseUrl);
    return baseUrl;
  } catch {
    throw new Error(`Invalid base URL: ${baseUrl}`);
  }
};

// ===== PURE FUNCTIONS =====

/**
 * Pure Function: Replace path parameters with values
 * Principio: Functional Programming + Immutability
 *
 * @param path - Route path with parameters (e.g., '/users/:id')
 * @param params - Parameter values (e.g., { id: '123' })
 * @returns Resolved path (e.g., '/users/123')
 */
export const resolvePathParams = (
  path: string,
  params: Record<string, string> = {},
): string => {
  // Guard clause: validate path
  const validatedPath = guardPath(path);

  // Functional: reduce to replace params
  return Object.entries(params).reduce((acc, [key, value]) => {
    // Guard clause: validate param value
    if (typeof value !== 'string') {
      throw new Error(`Path parameter "${key}" must be a string`);
    }
    return acc.replace(`:${key}`, encodeURIComponent(value));
  }, validatedPath);
};

/**
 * Pure Function: Build query string from object
 * Principio: Functional Programming + Immutability
 *
 * @param query - Query parameters object
 * @returns Query string (e.g., '?page=1&limit=10')
 */
export const buildQueryString = (query: Record<string, unknown> = {}): string => {
  // Functional: filter + map + join
  const entries = Object.entries(query)
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([key, value]) => {
      const encodedKey = encodeURIComponent(key);
      const encodedValue = encodeURIComponent(String(value));
      return `${encodedKey}=${encodedValue}`;
    });

  return entries.length > 0 ? `?${entries.join('&')}` : '';
};

/**
 * Pure Function: Build full URL
 * Principio: Functional Programming + Composition
 *
 * @param baseUrl - Base URL
 * @param path - Path (may contain params)
 * @param params - Path parameters
 * @param query - Query parameters
 * @returns Complete URL
 */
export const buildUrl = (
  baseUrl: string,
  path: string,
  params?: Record<string, string>,
  query?: Record<string, unknown>,
): string => {
  // Guard clauses
  const validatedBaseUrl = guardBaseUrl(baseUrl);
  const resolvedPath = resolvePathParams(path, params);
  const queryString = buildQueryString(query);

  // Pure composition: combine parts
  const base = validatedBaseUrl.endsWith('/') ? validatedBaseUrl.slice(0, -1) : validatedBaseUrl;
  const finalPath = resolvedPath.startsWith('/') ? resolvedPath : `/${resolvedPath}`;

  return `${base}${finalPath}${queryString}`;
};

/**
 * Pure Function: Create fetch options
 * Principio: Functional Programming + Immutability
 *
 * @param method - HTTP method
 * @param options - Request options
 * @returns Fetch options object
 */
export const createFetchOptions = (
  method: HttpMethod,
  options: ClientRequestOptions = {},
): RequestInit => {
  const validatedMethod = guardHttpMethod(method);

  // Pure object creation (immutable)
  const fetchOptions: RequestInit = {
    method: validatedMethod,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  // Add body for methods that support it
  if (['POST', 'PUT', 'PATCH'].includes(validatedMethod) && options.body !== undefined) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  return fetchOptions;
};

/**
 * Pure Function: Parse response
 * Principio: Functional Programming + Error Handling
 *
 * @param response - Fetch Response
 * @returns Parsed response data
 */
export const parseResponse = async <T = unknown>(
  response: Response,
): Promise<ClientResponse<T>> => {
  // Guard clause: validate response
  if (!response) {
    throw new Error('Response is required');
  }

  // Extract headers (functional: reduce)
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });

  // Parse body based on content type
  const contentType = response.headers.get('content-type') || '';
  let data: T;

  if (contentType.includes('application/json')) {
    data = (await response.json()) as T;
  } else if (contentType.includes('text/')) {
    data = (await response.text()) as T;
  } else {
    // Binary data
    data = (await response.arrayBuffer()) as T;
  }

  // Pure object creation
  return {
    data,
    status: response.status,
    headers,
  };
};

