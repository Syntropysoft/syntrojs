/**
 * ContentNegotiator - Unit Tests
 *
 * Testing Strategy:
 * - Each guard clause = 1 test
 * - Pure functions = predictable tests
 * - No mocks needed (zero external dependencies)
 * - RFC 7231 compliance
 */

import { describe, expect, test } from 'vitest';
import {
  AcceptsHelper,
  createAcceptsHelper,
  negotiateContentType,
  type SupportedMimeType,
} from '../../src/application/ContentNegotiator';

describe('ContentNegotiator - Unit Tests', () => {
  describe('negotiateContentType() - Guard Clauses', () => {
    test('returns default when supportedTypes is empty', () => {
      // Guard clause: supportedTypes required
      const result = negotiateContentType('application/json', []);

      expect(result.mimeType).toBe('application/json');
      expect(result.quality).toBe(1.0);
      expect(result.acceptable).toBe(true);
    });

    test('returns default when acceptHeader is undefined', () => {
      // Guard clause: no Accept header = use default
      const result = negotiateContentType(undefined, ['application/json']);

      expect(result.mimeType).toBe('application/json');
      expect(result.quality).toBe(1.0);
      expect(result.acceptable).toBe(true);
    });

    test('returns default when acceptHeader is empty string', () => {
      // Guard clause: empty header = use default
      const result = negotiateContentType('', ['application/json']);

      expect(result.mimeType).toBe('application/json');
    });

    test('returns default when acceptHeader is whitespace', () => {
      // Guard clause: whitespace only = use default
      const result = negotiateContentType('   ', ['application/json']);

      expect(result.mimeType).toBe('application/json');
    });

    test('returns not acceptable when no match found', () => {
      // Guard clause: no acceptable match
      const result = negotiateContentType('text/html', ['application/json']);

      expect(result.mimeType).toBe('application/json'); // Default
      expect(result.quality).toBe(0);
      expect(result.acceptable).toBe(false);
    });
  });

  describe('negotiateContentType() - Happy Path (Single Type)', () => {
    test('matches exact JSON type', () => {
      const result = negotiateContentType('application/json', ['application/json', 'text/html']);

      expect(result.mimeType).toBe('application/json');
      expect(result.quality).toBe(1.0);
      expect(result.acceptable).toBe(true);
    });

    test('matches exact HTML type', () => {
      const result = negotiateContentType('text/html', ['application/json', 'text/html']);

      expect(result.mimeType).toBe('text/html');
    });

    test('matches exact XML type', () => {
      const result = negotiateContentType('application/xml', ['application/xml']);

      expect(result.mimeType).toBe('application/xml');
    });

    test('matches with quality factor', () => {
      const result = negotiateContentType('application/json;q=0.9', ['application/json']);

      expect(result.mimeType).toBe('application/json');
      expect(result.quality).toBe(0.9);
    });
  });

  describe('negotiateContentType() - Multiple Types with Quality', () => {
    test('selects highest quality match', () => {
      const result = negotiateContentType('text/html;q=0.9, application/json;q=1.0', [
        'application/json',
        'text/html',
      ]);

      // JSON has higher quality (1.0 vs 0.9)
      expect(result.mimeType).toBe('application/json');
      expect(result.quality).toBe(1.0);
    });

    test('selects first match when qualities are equal', () => {
      const result = negotiateContentType('text/html;q=0.8, application/json;q=0.8', [
        'application/json',
        'text/html',
      ]);

      // First in Accept header wins
      expect(result.mimeType).toBe('text/html');
      expect(result.quality).toBe(0.8);
    });

    test('handles complex Accept header', () => {
      const header = 'text/html, application/xhtml+xml, application/xml;q=0.9, */*;q=0.8';
      const result = negotiateContentType(header, ['application/json', 'text/html']);

      // HTML has implicit q=1.0
      expect(result.mimeType).toBe('text/html');
      expect(result.quality).toBe(1.0);
    });
  });

  describe('negotiateContentType() - Wildcards', () => {
    test('accepts */* wildcard', () => {
      const result = negotiateContentType('*/*', ['application/json', 'text/html']);

      // Returns first supported type
      expect(result.mimeType).toBe('application/json');
      expect(result.quality).toBe(1.0);
    });

    test('accepts application/* wildcard', () => {
      const result = negotiateContentType('application/*', [
        'application/json',
        'application/xml',
        'text/html',
      ]);

      // Returns first matching application/* type
      expect(result.mimeType).toBe('application/json');
    });

    test('accepts text/* wildcard', () => {
      const result = negotiateContentType('text/*', [
        'application/json',
        'text/html',
        'text/plain',
      ]);

      // Returns first matching text/* type
      expect(result.mimeType).toBe('text/html');
    });

    test('wildcard with quality factor', () => {
      const result = negotiateContentType('text/html;q=0.5, */*;q=0.1', ['application/json']);

      // */* matches JSON with q=0.1
      expect(result.mimeType).toBe('application/json');
      expect(result.quality).toBe(0.1);
    });
  });

  describe('negotiateContentType() - RFC 7231 Compliance', () => {
    test('default quality is 1.0', () => {
      const result = negotiateContentType('application/json', ['application/json']);

      expect(result.quality).toBe(1.0);
    });

    test('quality must be between 0 and 1', () => {
      // Invalid quality should be ignored
      const result1 = negotiateContentType('application/json;q=1.5', ['application/json']);
      expect(result1.quality).toBe(1.0); // Uses default

      const result2 = negotiateContentType('application/json;q=-0.5', ['application/json']);
      expect(result2.quality).toBe(1.0); // Uses default
    });

    test('handles spaces in Accept header', () => {
      const result = negotiateContentType('application/json , text/html', [
        'application/json',
        'text/html',
      ]);

      expect(result.mimeType).toBe('application/json');
    });

    test('case-insensitive media type matching', () => {
      const result = negotiateContentType('Application/JSON', ['application/json']);

      expect(result.mimeType).toBe('application/json');
    });
  });

  describe('AcceptsHelper - Convenience Methods', () => {
    test('json() returns true when client accepts JSON', () => {
      const accepts = createAcceptsHelper('application/json');

      expect(accepts.json()).toBe(true);
    });

    test('json() returns false when client does not accept JSON', () => {
      const accepts = createAcceptsHelper('text/html');

      expect(accepts.json()).toBe(false);
    });

    test('html() returns true when client accepts HTML', () => {
      const accepts = createAcceptsHelper('text/html');

      expect(accepts.html()).toBe(true);
    });

    test('xml() returns true when client accepts XML', () => {
      const accepts = createAcceptsHelper('application/xml');

      expect(accepts.xml()).toBe(true);
    });

    test('text() returns true when client accepts plain text', () => {
      const accepts = createAcceptsHelper('text/plain');

      expect(accepts.text()).toBe(true);
    });

    test('toon() returns true when client accepts TOON', () => {
      const accepts = createAcceptsHelper('application/toon');

      expect(accepts.toon()).toBe(true);
    });

    test('type() negotiates from array', () => {
      const accepts = createAcceptsHelper('text/html;q=0.9, application/json;q=1.0');

      const result = accepts.type(['json', 'html', 'xml']);

      expect(result).toBe('application/json'); // Highest quality
    });

    test('type() returns false when no match', () => {
      const accepts = createAcceptsHelper('application/pdf');

      const result = accepts.type(['json', 'html']);

      expect(result).toBe(false);
    });
  });

  describe('AcceptsHelper - With Wildcards', () => {
    test('json() returns true with */*', () => {
      const accepts = createAcceptsHelper('*/*');

      expect(accepts.json()).toBe(true);
    });

    test('html() returns true with text/*', () => {
      const accepts = createAcceptsHelper('text/*');

      expect(accepts.html()).toBe(true);
    });

    test('json() returns true with application/*', () => {
      const accepts = createAcceptsHelper('application/*');

      expect(accepts.json()).toBe(true);
      expect(accepts.xml()).toBe(true);
    });
  });

  describe('Functional Programming Principles', () => {
    test('is pure - same input produces same output', () => {
      const header = 'application/json';
      const supported: SupportedMimeType[] = ['application/json'];

      const result1 = negotiateContentType(header, supported);
      const result2 = negotiateContentType(header, supported);

      expect(result1).toEqual(result2);
      expect(result1).not.toBe(result2); // Different object references
    });

    test('has no side effects', () => {
      const header = 'application/json';
      const supported: SupportedMimeType[] = ['application/json'];
      const originalSupported = [...supported];

      negotiateContentType(header, supported);

      // Input should be unchanged
      expect(supported).toEqual(originalSupported);
    });

    test('is deterministic', () => {
      const header = 'text/html;q=0.9, application/json;q=0.8';

      // Call 10 times
      const results = Array.from({ length: 10 }, () =>
        negotiateContentType(header, ['application/json', 'text/html']),
      );

      // All results should be identical
      const first = results[0];
      for (const result of results) {
        expect(result).toEqual(first);
      }
    });
  });

  describe('Edge Cases', () => {
    test('handles malformed Accept header gracefully', () => {
      const result = negotiateContentType('invalid-header', ['application/json']);

      // Should fall back to default
      expect(result.mimeType).toBe('application/json');
    });

    test('handles very long Accept header', () => {
      const longHeader = Array.from({ length: 50 }, (_, i) => `type${i}/subtype${i};q=0.${i}`).join(
        ', ',
      );

      const result = negotiateContentType(longHeader, ['application/json']);

      expect(result).toBeDefined();
    });

    test('handles Accept header with extra parameters', () => {
      const header = 'application/json; charset=utf-8; version=1';
      const result = negotiateContentType(header, ['application/json']);

      expect(result.mimeType).toBe('application/json');
    });

    test('handles empty types array', () => {
      const result = negotiateContentType('application/json', []);

      expect(result.mimeType).toBe('application/json'); // Uses default
    });

    test('handles undefined Accept header', () => {
      const result = negotiateContentType(undefined, ['application/json']);

      expect(result.mimeType).toBe('application/json');
      expect(result.acceptable).toBe(true);
    });
  });

  describe('Real-World Accept Headers', () => {
    test('Chrome browser Accept header', () => {
      const chromeHeader =
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8';

      const result = negotiateContentType(chromeHeader, ['application/json', 'text/html']);

      expect(result.mimeType).toBe('text/html');
      expect(result.quality).toBe(1.0);
    });

    test('curl default Accept header', () => {
      const curlHeader = '*/*';

      const result = negotiateContentType(curlHeader, ['application/json']);

      expect(result.mimeType).toBe('application/json');
    });

    test('Postman Accept header', () => {
      const postmanHeader = '*/*';

      const result = negotiateContentType(postmanHeader, ['application/json', 'text/html']);

      expect(result.mimeType).toBe('application/json'); // First supported
    });

    test('Mobile app Accept header', () => {
      const mobileHeader = 'application/json';

      const result = negotiateContentType(mobileHeader, ['application/json', 'text/html']);

      expect(result.mimeType).toBe('application/json');
    });

    test('API client with TOON preference', () => {
      const header = 'application/toon;q=1.0, application/json;q=0.8';

      const result = negotiateContentType(header, ['application/json', 'application/toon']);

      expect(result.mimeType).toBe('application/toon');
      expect(result.quality).toBe(1.0);
    });
  });

  describe('TOON Format Negotiation (v0.5.0)', () => {
    test('prefers TOON when quality is higher', () => {
      const header = 'application/toon;q=1.0, application/json;q=0.5';

      const result = negotiateContentType(header, ['application/json', 'application/toon']);

      expect(result.mimeType).toBe('application/toon');
    });

    test('falls back to JSON when TOON not supported', () => {
      const header = 'application/toon, application/json;q=0.8';

      const result = negotiateContentType(header, ['application/json']); // No TOON

      expect(result.mimeType).toBe('application/json');
    });

    test('TOON with wildcard fallback', () => {
      const header = 'application/toon;q=1.0, */*;q=0.1';

      const result = negotiateContentType(header, ['application/json']); // No TOON

      expect(result.mimeType).toBe('application/json');
      expect(result.quality).toBe(0.1); // From wildcard
    });
  });

  describe('Quality Factor Parsing', () => {
    test('parses q=1.0', () => {
      const result = negotiateContentType('application/json;q=1.0', ['application/json']);

      expect(result.quality).toBe(1.0);
    });

    test('parses q=0.5', () => {
      const result = negotiateContentType('application/json;q=0.5', ['application/json']);

      expect(result.quality).toBe(0.5);
    });

    test('parses q=0', () => {
      const result = negotiateContentType('application/json;q=0', ['application/json']);

      expect(result.quality).toBe(0);
    });

    test('handles invalid quality gracefully', () => {
      const result = negotiateContentType('application/json;q=abc', ['application/json']);

      expect(result.quality).toBe(1.0); // Falls back to default
    });

    test('handles quality > 1 (invalid)', () => {
      const result = negotiateContentType('application/json;q=1.5', ['application/json']);

      expect(result.quality).toBe(1.0); // Clamped to valid range
    });

    test('handles quality < 0 (invalid)', () => {
      const result = negotiateContentType('application/json;q=-0.5', ['application/json']);

      expect(result.quality).toBe(1.0); // Clamped to valid range
    });
  });

  describe('Multiple Media Types (Priority)', () => {
    test('respects quality order', () => {
      const header = 'application/json;q=0.5, text/html;q=1.0, text/plain;q=0.3';

      const result = negotiateContentType(header, ['application/json', 'text/html', 'text/plain']);

      expect(result.mimeType).toBe('text/html'); // Highest q=1.0
    });

    test('prefers exact match over wildcard', () => {
      const header = 'application/json, */*;q=0.5';

      const result = negotiateContentType(header, ['application/json', 'text/html']);

      expect(result.mimeType).toBe('application/json'); // Exact match wins
    });

    test('handles type not in supported list', () => {
      const header = 'application/pdf, application/json;q=0.8';

      const result = negotiateContentType(header, ['application/json', 'text/html']);

      // PDF not supported, falls back to JSON
      expect(result.mimeType).toBe('application/json');
      expect(result.quality).toBe(0.8);
    });
  });

  describe('createAcceptsHelper() - Factory', () => {
    test('creates AcceptsHelper instance', () => {
      const helper = createAcceptsHelper('application/json');

      expect(helper).toBeInstanceOf(AcceptsHelper);
    });

    test('works with undefined header', () => {
      const helper = createAcceptsHelper(undefined);

      expect(helper.json()).toBe(true); // Defaults to accepting JSON
    });

    test('is immutable - multiple calls create different instances', () => {
      const helper1 = createAcceptsHelper('application/json');
      const helper2 = createAcceptsHelper('application/json');

      expect(helper1).not.toBe(helper2); // Different instances
    });
  });

  describe('Normalization', () => {
    test('normalizes shorthand "json" to "application/json"', () => {
      const accepts = createAcceptsHelper('application/json');

      const result = accepts.type(['json']);

      expect(result).toBe('application/json');
    });

    test('normalizes shorthand "html" to "text/html"', () => {
      const accepts = createAcceptsHelper('text/html');

      const result = accepts.type(['html']);

      expect(result).toBe('text/html');
    });

    test('normalizes shorthand "xml" to "application/xml"', () => {
      const accepts = createAcceptsHelper('application/xml');

      const result = accepts.type(['xml']);

      expect(result).toBe('application/xml');
    });

    test('handles both shorthand and full types mixed', () => {
      const accepts = createAcceptsHelper('application/json');

      const result = accepts.type(['json', 'text/html', 'xml']);

      expect(result).toBe('application/json');
    });
  });

  describe('Immutability', () => {
    test('AcceptsHelper methods have no side effects', () => {
      const helper = createAcceptsHelper('application/json');

      // Call methods multiple times
      helper.json();
      helper.html();
      helper.type(['json', 'html']);

      // Should still work (no state mutation)
      expect(helper.json()).toBe(true);
    });

    test('negotiateContentType does not mutate supportedTypes', () => {
      const supported: SupportedMimeType[] = ['application/json', 'text/html'];
      const original = [...supported];

      negotiateContentType('text/html', supported);

      expect(supported).toEqual(original);
    });
  });

  describe('Performance', () => {
    test('handles many types efficiently', () => {
      const manyTypes: SupportedMimeType[] = [
        'application/json',
        'text/html',
        'application/xml',
        'text/plain',
        'application/toon',
      ];

      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        negotiateContentType('application/json', manyTypes);
      }
      const duration = performance.now() - start;

      // Should be fast (< 50ms for 1000 iterations)
      expect(duration).toBeLessThan(50);
    });
  });
});
