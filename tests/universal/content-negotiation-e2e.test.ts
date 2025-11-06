/**
 * Content Negotiation E2E Tests
 *
 * Testing Strategy:
 * - E2E: Full integration from handler → adapter → HTTP response
 * - TinyTest: Server lifecycle managed automatically
 * - Test Accept header parsing and format selection
 * - Verify TOON format preparation (v0.5.0)
 */

import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { HTTPException } from '../../src/domain/HTTPException';
import { TinyTest } from '../../src/testing/TinyTest';

describe('Content Negotiation E2E - Complete Flow', () => {
  let api: TinyTest;

  beforeEach(() => {
    api = new TinyTest();
  });

  afterEach(async () => {
    await api.close();
  });

  describe('Basic Content Negotiation', () => {
    test('returns JSON when client accepts JSON', async () => {
      api.get('/data', {
        handler: () => ({ message: 'Hello JSON' }),
      });

      const response = await api.rawRequest('GET', '/data', {
        headers: { Accept: 'application/json' },
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('application/json');

      const data = await response.json();
      expect(data.message).toBe('Hello JSON');
    });

    test('handler can check accepted format', async () => {
      api.get('/format-aware', {
        handler: ({ accepts }) => {
          if (accepts.json()) {
            return { format: 'json', data: [1, 2, 3] };
          }

          return { format: 'unknown' };
        },
      });

      const response = await api.expectSuccess('GET', '/format-aware', {
        headers: { Accept: 'application/json' },
      });

      expect(response.data.format).toBe('json');
    });
  });

  describe('Multiple Format Support', () => {
    test('negotiates between JSON and HTML', async () => {
      api.get('/multi-format', {
        handler: ({ accepts }) => {
          const format = accepts.type(['json', 'html']);

          if (format === 'application/json') {
            return { type: 'json', users: [{ id: 1, name: 'John' }] };
          }

          if (format === 'text/html') {
            return '<html><body><h1>Users</h1></body></html>';
          }

          throw new HTTPException(406, 'Not Acceptable');
        },
      });

      // Request JSON
      const jsonResponse = await api.expectSuccess('GET', '/multi-format', {
        headers: { Accept: 'application/json' },
      });
      expect(jsonResponse.data.type).toBe('json');

      // Request HTML
      const htmlResponse = await api.rawRequest('GET', '/multi-format', {
        headers: { Accept: 'text/html' },
      });
      const html = await htmlResponse.text();
      expect(html).toContain('<h1>Users</h1>');
    });

    test('prefers higher quality format', async () => {
      api.get('/quality-test', {
        handler: ({ accepts }) => {
          const format = accepts.type(['json', 'html', 'xml']);
          return { selectedFormat: format };
        },
      });

      const response = await api.expectSuccess('GET', '/quality-test', {
        headers: { Accept: 'text/html;q=1.0, application/json;q=0.8' },
      });

      expect(response.data.selectedFormat).toBe('text/html');
    });
  });

  describe('Wildcard Handling', () => {
    test('accepts */* wildcard', async () => {
      api.get('/wildcard', {
        handler: ({ accepts }) => {
          if (accepts.json()) {
            return { accepted: 'json' };
          }
          return { accepted: 'none' };
        },
      });

      const response = await api.expectSuccess('GET', '/wildcard', {
        headers: { Accept: '*/*' },
      });

      expect(response.data.accepted).toBe('json');
    });

    test('accepts application/* wildcard for JSON', async () => {
      api.get('/app-wildcard', {
        handler: ({ accepts }) => ({ isJson: accepts.json() }),
      });

      const response = await api.expectSuccess('GET', '/app-wildcard', {
        headers: { Accept: 'application/*' },
      });

      expect(response.data.isJson).toBe(true);
    });
  });

  describe('TOON Format Negotiation (Foundation for v0.5.0)', () => {
    test('detects TOON format preference', async () => {
      api.get('/toon-ready', {
        handler: ({ accepts }) => {
          if (accepts.toon()) {
            return { format: 'toon', note: 'Coming in v0.5.0' };
          }

          return { format: 'json' };
        },
      });

      // Request with TOON
      const toonResponse = await api.expectSuccess('GET', '/toon-ready', {
        headers: { Accept: 'application/toon' },
      });
      expect(toonResponse.data.format).toBe('toon');

      // Request without TOON
      const jsonResponse = await api.expectSuccess('GET', '/toon-ready', {
        headers: { Accept: 'application/json' },
      });
      expect(jsonResponse.data.format).toBe('json');
    });

    test('TOON with quality factor', async () => {
      api.get('/toon-quality', {
        handler: ({ accepts }) => {
          const format = accepts.type(['json', 'toon']);
          return { selectedFormat: format };
        },
      });

      const response = await api.expectSuccess('GET', '/toon-quality', {
        headers: { Accept: 'application/toon;q=1.0, application/json;q=0.5' },
      });

      expect(response.data.selectedFormat).toBe('application/toon');
    });

    test('automatic fallback from TOON to JSON', async () => {
      api.get('/auto-format', {
        handler: ({ accepts }) => {
          // Try TOON first, fallback to JSON
          const format = accepts.type(['toon', 'json']);
          return { format: format || 'json' };
        },
      });

      // Client that supports TOON
      const toon = await api.expectSuccess('GET', '/auto-format', {
        headers: { Accept: 'application/toon' },
      });
      expect(toon.data.format).toBe('application/toon');

      // Client that doesn't support TOON
      const json = await api.expectSuccess('GET', '/auto-format', {
        headers: { Accept: 'application/json' },
      });
      expect(json.data.format).toBe('application/json');
    });
  });

  describe('Error Handling - 406 Not Acceptable', () => {
    test('throws 406 when no acceptable format', async () => {
      api.get('/strict-format', {
        handler: ({ accepts }) => {
          if (accepts.json()) {
            return { data: 'JSON only' };
          }

          throw new HTTPException(
            406,
            'Not Acceptable. This endpoint only supports application/json',
          );
        },
      });

      // Acceptable
      const ok = await api.expectSuccess('GET', '/strict-format', {
        headers: { Accept: 'application/json' },
      });
      expect(ok.data.data).toBe('JSON only');

      // Not acceptable
      const notOk = await api.rawRequest('GET', '/strict-format', {
        headers: { Accept: 'text/html' },
      });
      expect(notOk.status).toBe(406);
    });
  });

  describe('Real-World Scenarios', () => {
    test('API that serves both JSON and XML', async () => {
      const users = [
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' },
      ];

      api.get('/users', {
        handler: ({ accepts }) => {
          const format = accepts.type(['json', 'xml']);

          if (format === 'application/json') {
            return { users };
          }

          if (format === 'application/xml') {
            const xml = `<users>${users.map((u) => `<user><id>${u.id}</id><name>${u.name}</name></user>`).join('')}</users>`;
            return xml;
          }

          throw new HTTPException(406, 'Only JSON and XML are supported');
        },
      });

      // JSON request
      const jsonResp = await api.expectSuccess('GET', '/users', {
        headers: { Accept: 'application/json' },
      });
      expect(jsonResp.data.users).toHaveLength(2);

      // XML request
      const xmlResp = await api.rawRequest('GET', '/users', {
        headers: { Accept: 'application/xml' },
      });
      const xml = await xmlResp.text();
      expect(xml).toContain('<users>');
      expect(xml).toContain('John');
    });

    test('REST API with HTML documentation', async () => {
      api.get('/api/status', {
        handler: ({ accepts }) => {
          if (accepts.html()) {
            return '<html><body><h1>API Status: OK</h1><p>Use Accept: application/json for data</p></body></html>';
          }

          // Default to JSON
          return { status: 'ok', uptime: 12345 };
        },
      });

      // Browser request (HTML)
      const browser = await api.rawRequest('GET', '/api/status', {
        headers: { Accept: 'text/html' },
      });
      const html = await browser.text();
      expect(html).toContain('API Status: OK');

      // API client (JSON)
      const client = await api.expectSuccess('GET', '/api/status', {
        headers: { Accept: 'application/json' },
      });
      expect(client.data.status).toBe('ok');
    });

    test('Export data in multiple formats', async () => {
      const data = [
        { name: 'Alice', score: 95 },
        { name: 'Bob', score: 87 },
      ];

      api.get('/export', {
        handler: ({ accepts }) => {
          const format = accepts.type(['json', 'text']);

          if (format === 'application/json') {
            return { data };
          }

          if (format === 'text/plain') {
            // CSV format
            const csv = `name,score\n${data.map((row) => `${row.name},${row.score}`).join('\n')}`;
            return csv;
          }

          throw new HTTPException(406, 'Supported formats: JSON, CSV (text/plain)');
        },
      });

      // JSON
      const json = await api.expectSuccess('GET', '/export', {
        headers: { Accept: 'application/json' },
      });
      expect(json.data.data).toHaveLength(2);

      // CSV
      const csv = await api.rawRequest('GET', '/export', {
        headers: { Accept: 'text/plain' },
      });
      const csvText = await csv.text();
      expect(csvText).toContain('name,score');
      expect(csvText).toContain('Alice,95');
    });
  });

  describe('Backward Compatibility', () => {
    test('works without Accept header (defaults to JSON)', async () => {
      api.get('/default', {
        handler: ({ accepts }) => {
          return { acceptsJson: accepts.json() };
        },
      });

      const response = await api.expectSuccess('GET', '/default');

      expect(response.data.acceptsJson).toBe(true);
    });

    test('empty Accept header defaults to JSON', async () => {
      api.get('/empty-accept', {
        handler: ({ accepts }) => ({ isJson: accepts.json() }),
      });

      const response = await api.expectSuccess('GET', '/empty-accept', {
        headers: { Accept: '' },
      });

      expect(response.data.isJson).toBe(true);
    });
  });
});
