import { BadRequestException } from '../domain/HTTPException';

/**
 * HTTP redirect status codes
 * RFC 7231 - HTTP/1.1 Semantics and Content
 */
export type RedirectStatusCode = 301 | 302 | 303 | 307 | 308;

/**
 * Redirect response structure
 */
export interface RedirectResponse {
  statusCode: RedirectStatusCode;
  headers: Record<string, string>;
  body: null;
  __isRedirect: true; // Marca única para detección rápida
}

/**
 * Creates an HTTP redirect response with proper headers.
 *
 * This is a pure function with no side effects:
 * - Same input always produces same output
 * - No mutations
 * - No external dependencies
 *
 * Architecture:
 * - Layer: Infrastructure (HTTP protocol details)
 * - Pattern: Functional (pure function, immutable)
 * - Validation: Guard clauses (fail-fast)
 * - Coupling: Zero dependencies (only domain exceptions)
 *
 * HTTP Redirect Status Codes:
 * - 301: Moved Permanently - Resource permanently moved, changes method to GET
 * - 302: Found (Temporary) - Resource temporarily at different URI, changes method to GET
 * - 303: See Other - Response to POST, use GET for redirect, explicit method change
 * - 307: Temporary Redirect - Temporary, preserves HTTP method
 * - 308: Permanent Redirect - Permanent, preserves HTTP method
 *
 * @param url - Target URL (relative or absolute)
 * @param statusCode - HTTP redirect status code (defaults to 302)
 * @returns Immutable redirect response object
 * @throws BadRequestException if validation fails
 *
 * @example
 * ```typescript
 * // Basic redirect (defaults to 302)
 * return createRedirect('/new-path');
 *
 * // Permanent redirect (SEO-friendly)
 * return createRedirect('/new-path', 301);
 *
 * // POST → GET redirect (form submission)
 * return createRedirect('/success', 303);
 *
 * // Preserve HTTP method (POST stays POST)
 * return createRedirect('/api/v2/resource', 307);
 *
 * // External redirect
 * return createRedirect('https://example.com', 302);
 * ```
 */
export function createRedirect(
  url: string,
  statusCode: RedirectStatusCode = 302,
): RedirectResponse {
  // Guard clause 1: url is required
  if (url === undefined || url === null) {
    throw new BadRequestException('Redirect URL is required');
  }

  // Guard clause 2: url must be a string (type check)
  if (typeof url !== 'string') {
    throw new BadRequestException('Redirect URL must be a string');
  }

  // Guard clause 3: url must be non-empty (content check)
  if (url.trim().length === 0) {
    throw new BadRequestException('Redirect URL cannot be empty');
  }

  // Guard clause 4: statusCode must be valid redirect code
  const validCodes: RedirectStatusCode[] = [301, 302, 303, 307, 308];
  if (!validCodes.includes(statusCode)) {
    throw new BadRequestException(
      `Invalid redirect status code: ${statusCode}. Must be one of: 301, 302, 303, 307, 308`,
    );
  }

  // Guard clause 5: Security - validate URL format (basic check)
  // Allow relative paths (/path) and absolute URLs (https://...)
  // Reject invalid patterns
  if (!isValidRedirectUrl(url)) {
    throw new BadRequestException(
      'Invalid redirect URL format. Must be a relative path (/path) or absolute URL (https://...)',
    );
  }

  // Pure transformation: normalize URL (trim whitespace)
  const normalizedUrl = url.trim();

  // Immutable return - no mutations, pure object construction
  return {
    statusCode,
    headers: {
      Location: normalizedUrl,
    },
    body: null,
    __isRedirect: true as const, // Marca única para detección
  };
}

/**
 * Validates redirect URL format.
 * Pure function - no side effects, deterministic.
 *
 * Accepts:
 * - Relative paths: /path, /path/to/resource, /path?query=value
 * - Absolute URLs: http://..., https://...
 *
 * Rejects:
 * - Invalid schemes: javascript:, data:, file:
 * - Empty or whitespace-only
 * - Malformed URLs
 *
 * @param url - URL to validate
 * @returns true if URL is valid for redirect
 */
function isValidRedirectUrl(url: string): boolean {
  // Guard clause: require url
  if (!url || url.trim().length === 0) {
    return false;
  }

  const trimmed = url.trim();

  // Allow relative paths (start with /)
  if (trimmed.startsWith('/')) {
    // Guard: Reject protocol-relative URLs (//example.com) - security risk
    if (trimmed.startsWith('//')) {
      return false;
    }
    return true;
  }

  // For absolute URLs, validate scheme
  try {
    const parsed = new URL(trimmed);

    // Guard: Only allow http and https schemes
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    return true;
  } catch {
    // URL parsing failed - invalid format
    return false;
  }
}

/**
 * Type guard: checks if value is a redirect response
 * Pure function - no side effects
 *
 * @param value - Value to check
 * @returns true if value matches RedirectResponse structure
 */
export function isRedirectResponse(value: unknown): value is RedirectResponse {
  // Functional: check structure without mutation
  // Guard clauses for type safety - pipeline style

  // Guard 1: Must be object
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Type narrowing requires any for runtime checks
  const candidate = value as any;

  // Guard 2: Fast path - check unique marker first
  if (candidate.__isRedirect === true) {
    return true;
  }

  // Guard 3: Fallback - check structure (for manually created objects)
  if (!('statusCode' in candidate) || !('headers' in candidate) || !('body' in candidate)) {
    return false;
  }

  // Guard 4: Status code must be valid redirect code
  const validCodes: RedirectStatusCode[] = [301, 302, 303, 307, 308];
  if (!validCodes.includes(candidate.statusCode)) {
    return false;
  }

  // Guard 5: Headers must be object
  if (typeof candidate.headers !== 'object' || candidate.headers === null) {
    return false;
  }

  // Guard 6: Location header must exist
  if (!('Location' in candidate.headers)) {
    return false;
  }

  // Guard 7: Body must be null (redirects have no body)
  if (candidate.body !== null) {
    return false;
  }

  // All checks passed
  return true;
}
