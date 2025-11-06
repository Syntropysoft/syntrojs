/**
 * RedirectHelper - Unit Tests
 *
 * Testing Strategy:
 * - Each guard clause = 1 test
 * - Pure function = predictable tests
 * - No mocks needed (zero dependencies)
 * - Functional approach = trivial assertions
 */

import { describe, expect, test } from 'vitest';
import { BadRequestException } from '../../src/domain/HTTPException';
import {
  createRedirect,
  isRedirectResponse,
  type RedirectStatusCode,
} from '../../src/infrastructure/RedirectHelper';

describe('RedirectHelper - Unit Tests', () => {
  describe('createRedirect() - Guard Clauses', () => {
    test('throws when url is null', () => {
      // Guard clause: url required
      expect(() => createRedirect(null as any)).toThrow(BadRequestException);
      expect(() => createRedirect(null as any)).toThrow('Redirect URL is required');
    });

    test('throws when url is undefined', () => {
      // Guard clause: url required
      expect(() => createRedirect(undefined as any)).toThrow(BadRequestException);
      expect(() => createRedirect(undefined as any)).toThrow('Redirect URL is required');
    });

    test('throws when url is not a string', () => {
      // Guard clause: url must be string
      expect(() => createRedirect(123 as any)).toThrow(BadRequestException);
      expect(() => createRedirect(123 as any)).toThrow('Redirect URL must be a string');
      expect(() => createRedirect({} as any)).toThrow('Redirect URL must be a string');
      expect(() => createRedirect([] as any)).toThrow('Redirect URL must be a string');
    });

    test('throws when url is empty string', () => {
      // Guard clause: url cannot be empty
      expect(() => createRedirect('')).toThrow(BadRequestException);
      expect(() => createRedirect('')).toThrow('Redirect URL cannot be empty');
    });

    test('throws when url is whitespace only', () => {
      // Guard clause: url cannot be empty after trim
      expect(() => createRedirect('   ')).toThrow(BadRequestException);
      expect(() => createRedirect('\t\n  ')).toThrow('Redirect URL cannot be empty');
    });

    test('throws when statusCode is invalid', () => {
      // Guard clause: statusCode must be valid redirect code
      expect(() => createRedirect('/path', 200 as any)).toThrow(BadRequestException);
      expect(() => createRedirect('/path', 200 as any)).toThrow(
        'Invalid redirect status code: 200',
      );
      expect(() => createRedirect('/path', 404 as any)).toThrow('Invalid redirect status code');
      expect(() => createRedirect('/path', 500 as any)).toThrow('Invalid redirect status code');
    });

    test('throws for javascript: protocol (security)', () => {
      // Guard clause: prevent XSS via javascript: URIs
      expect(() => createRedirect('javascript:alert(1)')).toThrow(BadRequestException);
      expect(() => createRedirect('javascript:void(0)')).toThrow('Invalid redirect URL format');
    });

    test('throws for data: protocol (security)', () => {
      // Guard clause: prevent data URI injection
      expect(() => createRedirect('data:text/html,<script>alert(1)</script>')).toThrow(
        BadRequestException,
      );
      expect(() => createRedirect('data:text/html,test')).toThrow('Invalid redirect URL format');
    });

    test('throws for file: protocol (security)', () => {
      // Guard clause: prevent file system access
      expect(() => createRedirect('file:///etc/passwd')).toThrow(BadRequestException);
      expect(() => createRedirect('file://C:/Windows/System32')).toThrow(
        'Invalid redirect URL format',
      );
    });

    test('throws for protocol-relative URLs (security)', () => {
      // Guard clause: prevent open redirect via //evil.com
      expect(() => createRedirect('//evil.com/phishing')).toThrow(BadRequestException);
      expect(() => createRedirect('//example.com')).toThrow('Invalid redirect URL format');
    });

    test('throws for invalid URL format', () => {
      // Guard clause: malformed URLs
      expect(() => createRedirect('ht!tp://invalid')).toThrow(BadRequestException);
      expect(() => createRedirect('not a valid url')).toThrow('Invalid redirect URL format');
    });
  });

  describe('createRedirect() - Happy Path (Relative URLs)', () => {
    test('creates redirect with default status 302', () => {
      // Default: 302 Found (temporary redirect)
      const result = createRedirect('/new-path');

      expect(result).toEqual({
        statusCode: 302,
        headers: {
          Location: '/new-path',
        },
        body: null,
        __isRedirect: true,
      });
    });

    test('creates redirect with root path', () => {
      const result = createRedirect('/');

      expect(result.statusCode).toBe(302);
      expect(result.headers.Location).toBe('/');
      expect(result.body).toBe(null);
    });

    test('creates redirect with query parameters', () => {
      const result = createRedirect('/search?q=test&page=2');

      expect(result.headers.Location).toBe('/search?q=test&page=2');
    });

    test('creates redirect with hash fragment', () => {
      const result = createRedirect('/page#section');

      expect(result.headers.Location).toBe('/page#section');
    });

    test('creates redirect with complex path', () => {
      const result = createRedirect('/users/123/orders/456');

      expect(result.headers.Location).toBe('/users/123/orders/456');
    });

    test('trims whitespace from URL', () => {
      const result = createRedirect('  /path  ');

      expect(result.headers.Location).toBe('/path');
    });
  });

  describe('createRedirect() - Happy Path (Absolute URLs)', () => {
    test('creates redirect to https:// URL', () => {
      const result = createRedirect('https://example.com/path');

      expect(result.headers.Location).toBe('https://example.com/path');
      expect(result.statusCode).toBe(302);
    });

    test('creates redirect to http:// URL', () => {
      const result = createRedirect('http://example.com');

      expect(result.headers.Location).toBe('http://example.com');
    });

    test('creates redirect with full URL and query params', () => {
      const result = createRedirect('https://api.example.com/v2/users?active=true');

      expect(result.headers.Location).toBe('https://api.example.com/v2/users?active=true');
    });

    test('creates redirect with port number', () => {
      const result = createRedirect('http://localhost:3000/api');

      expect(result.headers.Location).toBe('http://localhost:3000/api');
    });

    test('creates redirect with subdomain', () => {
      const result = createRedirect('https://api.subdomain.example.com/endpoint');

      expect(result.headers.Location).toBe('https://api.subdomain.example.com/endpoint');
    });
  });

  describe('createRedirect() - Status Codes', () => {
    test('creates 301 Moved Permanently redirect', () => {
      const result = createRedirect('/new-path', 301);

      expect(result.statusCode).toBe(301);
      expect(result.headers.Location).toBe('/new-path');
      expect(result.body).toBe(null);
    });

    test('creates 302 Found (temporary) redirect', () => {
      const result = createRedirect('/temp-path', 302);

      expect(result.statusCode).toBe(302);
    });

    test('creates 303 See Other redirect', () => {
      // Common after POST: redirect with GET
      const result = createRedirect('/success', 303);

      expect(result.statusCode).toBe(303);
    });

    test('creates 307 Temporary Redirect (preserves method)', () => {
      const result = createRedirect('/api/v2/resource', 307);

      expect(result.statusCode).toBe(307);
    });

    test('creates 308 Permanent Redirect (preserves method)', () => {
      const result = createRedirect('/api/v2/resource', 308);

      expect(result.statusCode).toBe(308);
    });
  });

  describe('createRedirect() - Immutability', () => {
    test('returns new object each time (pure function)', () => {
      const url = '/path';

      const result1 = createRedirect(url);
      const result2 = createRedirect(url);

      // Results should be equal but not same reference
      expect(result1).toEqual(result2);
      expect(result1).not.toBe(result2);
    });

    test('does not mutate with different status codes', () => {
      const url = '/path';

      const result301 = createRedirect(url, 301);
      const result302 = createRedirect(url, 302);

      // Should be different objects with different status
      expect(result301.statusCode).toBe(301);
      expect(result302.statusCode).toBe(302);
      expect(result301).not.toBe(result302);
    });

    test('headers object is new instance', () => {
      const result1 = createRedirect('/path');
      const result2 = createRedirect('/path');

      // Headers should be equal but not same reference
      expect(result1.headers).toEqual(result2.headers);
      expect(result1.headers).not.toBe(result2.headers);
    });
  });

  describe('isRedirectResponse() - Type Guard', () => {
    test('returns true for valid redirect response with marker', () => {
      const validResponse = {
        statusCode: 302,
        headers: { Location: '/path' },
        body: null,
        __isRedirect: true,
      };

      expect(isRedirectResponse(validResponse)).toBe(true);
    });

    test('returns true for manually created redirect (without marker)', () => {
      const manualRedirect = {
        statusCode: 301,
        headers: { Location: '/path' },
        body: null,
      };

      expect(isRedirectResponse(manualRedirect)).toBe(true);
    });

    test('returns true for all valid redirect codes', () => {
      const codes: RedirectStatusCode[] = [301, 302, 303, 307, 308];

      for (const code of codes) {
        const response = {
          statusCode: code,
          headers: { Location: '/path' },
          body: null,
        };
        expect(isRedirectResponse(response)).toBe(true);
      }
    });

    test('returns false for null', () => {
      expect(isRedirectResponse(null)).toBe(false);
    });

    test('returns false for undefined', () => {
      expect(isRedirectResponse(undefined)).toBe(false);
    });

    test('returns false for string', () => {
      expect(isRedirectResponse('test')).toBe(false);
    });

    test('returns false for number', () => {
      expect(isRedirectResponse(123)).toBe(false);
    });

    test('returns false for array', () => {
      expect(isRedirectResponse([])).toBe(false);
    });

    test('returns false for plain object', () => {
      const plainObject = { message: 'hello' };
      expect(isRedirectResponse(plainObject)).toBe(false);
    });

    test('returns false for object without statusCode', () => {
      const invalid = {
        headers: { Location: '/path' },
        body: null,
      };

      expect(isRedirectResponse(invalid)).toBe(false);
    });

    test('returns false for object without headers', () => {
      const invalid = {
        statusCode: 302,
        body: null,
      };

      expect(isRedirectResponse(invalid)).toBe(false);
    });

    test('returns false for object without Location header', () => {
      const invalid = {
        statusCode: 302,
        headers: { 'Content-Type': 'text/html' },
        body: null,
      };

      expect(isRedirectResponse(invalid)).toBe(false);
    });

    test('returns false for object without body field', () => {
      const invalid = {
        statusCode: 302,
        headers: { Location: '/path' },
      };

      expect(isRedirectResponse(invalid)).toBe(false);
    });

    test('returns false for non-null body', () => {
      const invalid = {
        statusCode: 302,
        headers: { Location: '/path' },
        body: { data: 'test' },
      };

      expect(isRedirectResponse(invalid)).toBe(false);
    });

    test('returns false for invalid status codes', () => {
      const codes = [200, 201, 204, 400, 404, 500];

      for (const code of codes) {
        const response = {
          statusCode: code,
          headers: { Location: '/path' },
          body: null,
        };
        expect(isRedirectResponse(response)).toBe(false);
      }
    });

    test('returns false for headers as non-object', () => {
      const invalid = {
        statusCode: 302,
        headers: 'not an object',
        body: null,
      };

      expect(isRedirectResponse(invalid)).toBe(false);
    });

    test('returns false for headers as null', () => {
      const invalid = {
        statusCode: 302,
        headers: null,
        body: null,
      };

      expect(isRedirectResponse(invalid)).toBe(false);
    });
  });

  describe('Functional Programming Principles', () => {
    test('is pure - same input produces same output', () => {
      const url = '/path';
      const status = 301;

      const result1 = createRedirect(url, status);
      const result2 = createRedirect(url, status);

      // Same values
      expect(result1).toEqual(result2);

      // But different object references (immutable)
      expect(result1).not.toBe(result2);
    });

    test('has no side effects', () => {
      const url = '/original-path';
      const originalUrl = url;

      // Call function
      createRedirect(url, 301);

      // Input should be unchanged
      expect(url).toBe(originalUrl);
    });

    test('is deterministic - produces consistent headers', () => {
      const url = '/path';

      // Call 10 times
      const results = Array.from({ length: 10 }, () => createRedirect(url, 302));

      // All should have identical structure
      const firstResult = results[0];
      for (const result of results) {
        expect(result).toEqual(firstResult);
      }
    });

    test('headers object is new instance', () => {
      const result1 = createRedirect('/path');
      const result2 = createRedirect('/path');

      // Headers should be equal but not same reference
      expect(result1.headers).toEqual(result2.headers);
      expect(result1.headers).not.toBe(result2.headers);
    });
  });

  describe('HTTP Redirect Codes - Semantics', () => {
    test('301 - Moved Permanently (SEO-friendly)', () => {
      const result = createRedirect('/new-home', 301);

      expect(result.statusCode).toBe(301);
      expect(result.headers.Location).toBe('/new-home');
      expect(result.body).toBe(null);
    });

    test('302 - Found (temporary redirect, default)', () => {
      const result = createRedirect('/temp-page');

      expect(result.statusCode).toBe(302);
    });

    test('303 - See Other (POST → GET redirect)', () => {
      // After form submission: redirect to success page with GET
      const result = createRedirect('/success', 303);

      expect(result.statusCode).toBe(303);
      expect(result.headers.Location).toBe('/success');
    });

    test('307 - Temporary Redirect (preserves method)', () => {
      // POST to /submit → 307 → POST to /api/v2/submit
      const result = createRedirect('/api/v2/submit', 307);

      expect(result.statusCode).toBe(307);
    });

    test('308 - Permanent Redirect (preserves method)', () => {
      // POST to /old-api → 308 → POST to /new-api
      const result = createRedirect('/new-api', 308);

      expect(result.statusCode).toBe(308);
    });
  });

  describe('URL Validation - Relative Paths', () => {
    test('accepts simple relative path', () => {
      const result = createRedirect('/path');
      expect(result.headers.Location).toBe('/path');
    });

    test('accepts nested relative path', () => {
      const result = createRedirect('/api/v2/users');
      expect(result.headers.Location).toBe('/api/v2/users');
    });

    test('accepts path with query string', () => {
      const result = createRedirect('/search?q=test');
      expect(result.headers.Location).toBe('/search?q=test');
    });

    test('accepts path with hash', () => {
      const result = createRedirect('/docs#section-2');
      expect(result.headers.Location).toBe('/docs#section-2');
    });

    test('accepts path with both query and hash', () => {
      const result = createRedirect('/page?id=1#top');
      expect(result.headers.Location).toBe('/page?id=1#top');
    });

    test('accepts root path', () => {
      const result = createRedirect('/');
      expect(result.headers.Location).toBe('/');
    });
  });

  describe('URL Validation - Absolute URLs', () => {
    test('accepts https:// URLs', () => {
      const result = createRedirect('https://example.com');
      expect(result.headers.Location).toBe('https://example.com');
    });

    test('accepts http:// URLs', () => {
      const result = createRedirect('http://example.com');
      expect(result.headers.Location).toBe('http://example.com');
    });

    test('accepts URL with port', () => {
      const result = createRedirect('http://localhost:3000/api');
      expect(result.headers.Location).toBe('http://localhost:3000/api');
    });

    test('accepts URL with subdomain', () => {
      const result = createRedirect('https://api.example.com/v2');
      expect(result.headers.Location).toBe('https://api.example.com/v2');
    });

    test('accepts URL with path, query, and hash', () => {
      const result = createRedirect('https://example.com/page?id=1#section');
      expect(result.headers.Location).toBe('https://example.com/page?id=1#section');
    });

    test('accepts URL with special characters in query', () => {
      const result = createRedirect('https://api.com/search?q=hello%20world&lang=es');
      expect(result.headers.Location).toBe('https://api.com/search?q=hello%20world&lang=es');
    });
  });

  describe('Edge Cases', () => {
    test('handles very long URLs', () => {
      const longPath = '/a'.repeat(200);
      const result = createRedirect(longPath);

      expect(result.headers.Location).toBe(longPath);
    });

    test('handles special characters in path', () => {
      const result = createRedirect('/users/@john-doe_123');
      expect(result.headers.Location).toBe('/users/@john-doe_123');
    });

    test('handles unicode characters in path', () => {
      const result = createRedirect('/usuarios/josé-maría');
      expect(result.headers.Location).toBe('/usuarios/josé-maría');
    });

    test('handles encoded characters', () => {
      const result = createRedirect('/search?q=%E4%BD%A0%E5%A5%BD');
      expect(result.headers.Location).toBe('/search?q=%E4%BD%A0%E5%A5%BD');
    });

    test('handles multiple query parameters', () => {
      const result = createRedirect('/api?filter=active&sort=desc&page=2&limit=50');
      expect(result.headers.Location).toBe('/api?filter=active&sort=desc&page=2&limit=50');
    });

    test('handles URL with authentication (allowed)', () => {
      const result = createRedirect('https://user:pass@example.com/api');
      expect(result.headers.Location).toBe('https://user:pass@example.com/api');
    });
  });

  describe('Security - URL Validation', () => {
    test('rejects javascript: protocol variations', () => {
      expect(() => createRedirect('javascript:alert(1)')).toThrow();
      expect(() => createRedirect('JavaScript:alert(1)')).toThrow();
      expect(() => createRedirect('JAVASCRIPT:alert(1)')).toThrow();
    });

    test('rejects data: protocol variations', () => {
      expect(() => createRedirect('data:text/html,<h1>XSS</h1>')).toThrow();
      expect(() => createRedirect('Data:text/html,test')).toThrow();
    });

    test('rejects file: protocol', () => {
      expect(() => createRedirect('file:///etc/passwd')).toThrow();
      expect(() => createRedirect('File:///secret')).toThrow();
    });

    test('rejects protocol-relative URLs', () => {
      expect(() => createRedirect('//evil.com')).toThrow();
      expect(() => createRedirect('//phishing.site/login')).toThrow();
    });

    test('rejects other dangerous protocols', () => {
      expect(() => createRedirect('vbscript:msgbox(1)')).toThrow();
      expect(() => createRedirect('about:blank')).toThrow();
      expect(() => createRedirect('blob:https://example.com')).toThrow();
    });
  });

  describe('Real-World Use Cases', () => {
    test('API versioning redirect (301)', () => {
      const result = createRedirect('/api/v2/users', 301);

      expect(result.statusCode).toBe(301);
      expect(result.headers.Location).toBe('/api/v2/users');
    });

    test('After login redirect (302)', () => {
      const result = createRedirect('/dashboard');

      expect(result.statusCode).toBe(302);
      expect(result.headers.Location).toBe('/dashboard');
    });

    test('After form submission (303)', () => {
      const result = createRedirect('/users/123', 303);

      expect(result.statusCode).toBe(303);
    });

    test('Redirect to external OAuth provider (302)', () => {
      const result = createRedirect(
        'https://accounts.google.com/oauth/authorize?client_id=123',
        302,
      );

      expect(result.headers.Location).toContain('google.com');
    });

    test('URL normalization (lowercase route, 301)', () => {
      const result = createRedirect('/users', 301);

      expect(result.statusCode).toBe(301);
      expect(result.headers.Location).toBe('/users');
    });

    test('Redirect with preserved query params', () => {
      const result = createRedirect('/new-search?q=test&page=2', 301);

      expect(result.headers.Location).toBe('/new-search?q=test&page=2');
    });
  });

  describe('Default Values', () => {
    test('defaults to 302 when status not provided', () => {
      const result = createRedirect('/path');

      expect(result.statusCode).toBe(302);
    });

    test('trims whitespace automatically', () => {
      const result = createRedirect('  /path/to/resource  ');

      expect(result.headers.Location).toBe('/path/to/resource');
    });
  });

  describe('Marker Field - Fast Detection', () => {
    test('includes __isRedirect marker', () => {
      const result = createRedirect('/path');

      expect(result.__isRedirect).toBe(true);
    });

    test('marker is readonly (const assertion)', () => {
      const result = createRedirect('/path');

      // Type check: __isRedirect should be 'true' literal type
      const marker: true = result.__isRedirect;
      expect(marker).toBe(true);
    });
  });
});
