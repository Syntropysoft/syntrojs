/**
 * Content Negotiation Example
 *
 * Demonstrates how to serve different formats based on Accept header:
 * - JSON (default)
 * - HTML (browser-friendly)
 * - XML (legacy systems)
 * - Plain text / CSV (exports)
 * - TOON (v0.5.0 - foundation)
 */

import { SyntroJS } from 'syntrojs';
import { HTTPException } from 'syntrojs';
import { z } from 'zod';

const app = new SyntroJS({
  title: 'Content Negotiation Example',
  version: '1.0.0',
  description: 'Demonstrates content negotiation patterns',
});

// Sample data
const users = [
  { id: 1, name: 'Alice', email: 'alice@example.com', role: 'admin' },
  { id: 2, name: 'Bob', email: 'bob@example.com', role: 'user' },
  { id: 3, name: 'Charlie', email: 'charlie@example.com', role: 'user' },
];

// ============================================================================
// 1. Basic Content Negotiation (JSON vs HTML)
// ============================================================================

app.get('/users', {
  summary: 'Get users - supports JSON and HTML',
  handler: ({ accepts }) => {
    // Check if client wants HTML (browser)
    if (accepts.html()) {
      const html = `
        <html>
          <head><title>Users</title></head>
          <body>
            <h1>Users</h1>
            <ul>
              ${users.map((user) => `<li>${user.name} (${user.email})</li>`).join('')}
            </ul>
            <p><i>Use Accept: application/json for API access</i></p>
          </body>
        </html>
      `;
      return html;
    }

    // Default: Return JSON for API clients
    return { users };
  },
});

// ============================================================================
// 2. Explicit Format Selection
// ============================================================================

app.get('/data', {
  summary: 'Get data - supports JSON, XML, and plain text',
  handler: ({ accepts }) => {
    const format = accepts.type(['json', 'xml', 'text']);

    switch (format) {
      case 'application/json':
        return { format: 'json', users };

      case 'application/xml':
        const xml = `<?xml version="1.0"?>
<users>
  ${users.map((u) => `<user><id>${u.id}</id><name>${u.name}</name><email>${u.email}</email></user>`).join('\n  ')}
</users>`;
        return xml;

      case 'text/plain':
        const text = users.map((u) => `${u.id}: ${u.name} - ${u.email}`).join('\n');
        return text;

      default:
        throw new HTTPException(406, 'Not Acceptable. Supported formats: JSON, XML, plain text');
    }
  },
});

// ============================================================================
// 3. CSV Export (text/plain or text/csv)
// ============================================================================

app.get('/export/users', {
  summary: 'Export users as CSV',
  handler: ({ accepts }) => {
    if (accepts.text() || accepts.type(['text/csv'])) {
      // Generate CSV
      const csv =
        'ID,Name,Email,Role\n' +
        users.map((u) => `${u.id},${u.name},${u.email},${u.role}`).join('\n');

      return csv;
    }

    // Default: JSON
    return { users, note: 'Use Accept: text/plain or text/csv for CSV export' };
  },
});

// ============================================================================
// 4. API with Documentation (JSON for API, HTML for humans)
// ============================================================================

app.get('/api/status', {
  summary: 'API status - JSON for machines, HTML for humans',
  handler: ({ accepts }) => {
    const statusData = {
      status: 'operational',
      uptime: 99.99,
      version: '1.0.0',
      endpoints: 5,
    };

    if (accepts.html()) {
      return `
        <html>
          <head>
            <title>API Status</title>
            <style>
              body { font-family: sans-serif; max-width: 800px; margin: 50px auto; }
              .status { color: green; font-weight: bold; }
              code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
            </style>
          </head>
          <body>
            <h1>API Status</h1>
            <p class="status">Status: ${statusData.status.toUpperCase()}</p>
            <ul>
              <li>Uptime: ${statusData.uptime}%</li>
              <li>Version: ${statusData.version}</li>
              <li>Endpoints: ${statusData.endpoints}</li>
            </ul>
            <hr>
            <p>For programmatic access, use <code>Accept: application/json</code></p>
          </body>
        </html>
      `;
    }

    return statusData;
  },
});

// ============================================================================
// 5. TOON Format Foundation (v0.5.0)
// ============================================================================

app.get('/toon-demo', {
  summary: 'TOON format demo (foundation for v0.5.0)',
  handler: ({ accepts }) => {
    const data = {
      message: 'TOON format coming in v0.5.0',
      benefits: ['40-60% smaller', 'Human-readable', 'No compilation needed'],
      savings: '$1,620/year at 1M requests/month',
    };

    if (accepts.toon()) {
      return {
        ...data,
        note: 'TOON serialization will be implemented in v0.5.0',
        currentFormat: 'json',
        futureFormat: 'toon',
      };
    }

    return data;
  },
});

// ============================================================================
// 6. Conditional Logic Based on Format
// ============================================================================

app.get('/search', {
  summary: 'Search with format negotiation',
  query: z.object({
    q: z.string(),
  }),
  handler: ({ query, accepts }) => {
    const results = users.filter((u) => u.name.toLowerCase().includes(query.q.toLowerCase()));

    const format = accepts.type(['json', 'html', 'text']);

    switch (format) {
      case 'application/json':
        return { query: query.q, results, count: results.length };

      case 'text/html':
        return `
          <html>
            <body>
              <h1>Search Results for "${query.q}"</h1>
              <p>Found ${results.length} result(s)</p>
              <ul>
                ${results.map((r) => `<li>${r.name}</li>`).join('')}
              </ul>
            </body>
          </html>
        `;

      case 'text/plain':
        return `Search: ${query.q}\nResults: ${results.length}\n${results.map((r) => r.name).join('\n')}`;

      default:
        throw new HTTPException(406, 'Supported formats: JSON, HTML, plain text');
    }
  },
});

// ============================================================================
// 7. Auto Format Detection
// ============================================================================

app.get('/auto', {
  summary: 'Automatic format selection',
  handler: ({ accepts }) => {
    // Automatically select best format
    if (accepts.json()) {
      return { auto: true, format: 'json', data: users };
    }

    if (accepts.html()) {
      return '<html><body><h1>Auto-format: HTML selected</h1></body></html>';
    }

    if (accepts.xml()) {
      return '<data><format>xml</format></data>';
    }

    // Fallback
    return { message: 'Please specify Accept header' };
  },
});

// ============================================================================
// 8. Progressive Enhancement
// ============================================================================

app.get('/progressive', {
  summary: 'Progressive enhancement pattern',
  handler: ({ accepts }) => {
    const data = {
      title: 'Progressive Data',
      items: ['Item 1', 'Item 2', 'Item 3'],
    };

    // Best experience: HTML
    if (accepts.html()) {
      return `
        <html>
          <head>
            <title>${data.title}</title>
          </head>
          <body>
            <h1>${data.title}</h1>
            <ul>${data.items.map((item) => `<li>${item}</li>`).join('')}</ul>
          </body>
        </html>
      `;
    }

    // Good experience: JSON with metadata
    if (accepts.json()) {
      return {
        ...data,
        _meta: {
          format: 'json',
          tip: 'Use Accept: text/html for formatted view',
        },
      };
    }

    // Minimal experience: Plain text
    return `${data.title}\n${data.items.join('\n')}`;
  },
});

// ============================================================================
// 9. API Versioning with Content Types
// ============================================================================

app.get('/api/resource', {
  summary: 'Resource with format-based versioning',
  handler: ({ accepts }) => {
    const resource = { id: 123, name: 'Resource' };

    // Modern client (prefers TOON - coming in v0.5.0)
    if (accepts.toon()) {
      return {
        ...resource,
        _version: 'v2',
        _format: 'toon',
        note: 'TOON format will save 60% bandwidth in v0.5.0',
      };
    }

    // Standard client (JSON)
    if (accepts.json()) {
      return { ...resource, _version: 'v1', _format: 'json' };
    }

    // Legacy client (XML)
    if (accepts.xml()) {
      return `<resource><id>123</id><name>Resource</name><version>legacy</version></resource>`;
    }

    throw new HTTPException(406, 'Unsupported format');
  },
});

// ============================================================================
// 10. Error Responses with Format Negotiation
// ============================================================================

app.get('/error-demo', {
  summary: 'Error handling with content negotiation',
  query: z.object({
    fail: z.string().optional(),
  }),
  handler: ({ query, accepts }) => {
    if (query.fail === 'true') {
      // Custom error with format awareness
      if (accepts.html()) {
        throw new HTTPException(
          400,
          '<html><body><h1>Error 400</h1><p>Bad Request</p></body></html>',
        );
      }

      throw new HTTPException(400, 'Bad Request');
    }

    return { message: 'Success' };
  },
});

// ============================================================================
// Start Server
// ============================================================================

const PORT = process.env.PORT || 3000;

await app.listen(PORT);

console.log(`
🚀 Content Negotiation Example Server Running!

Try these endpoints with different Accept headers:

Basic Negotiation:
- curl -H "Accept: application/json" http://localhost:${PORT}/users
- curl -H "Accept: text/html" http://localhost:${PORT}/users

Multiple Formats:
- curl -H "Accept: application/json" http://localhost:${PORT}/data
- curl -H "Accept: application/xml" http://localhost:${PORT}/data
- curl -H "Accept: text/plain" http://localhost:${PORT}/data

CSV Export:
- curl -H "Accept: text/plain" http://localhost:${PORT}/export/users
- curl -H "Accept: application/json" http://localhost:${PORT}/export/users

API with Documentation:
- Open in browser: http://localhost:${PORT}/api/status (gets HTML)
- curl http://localhost:${PORT}/api/status (gets JSON)

TOON Format (v0.5.0 preview):
- curl -H "Accept: application/toon" http://localhost:${PORT}/toon-demo
- curl -H "Accept: application/json" http://localhost:${PORT}/toon-demo

Search with Format:
- curl -H "Accept: text/html" "http://localhost:${PORT}/search?q=alice"
- curl -H "Accept: application/json" "http://localhost:${PORT}/search?q=alice"

Quality Factors:
- curl -H "Accept: text/html;q=0.9, application/json;q=1.0" http://localhost:${PORT}/auto

📚 Interactive Docs: http://localhost:${PORT}/docs
`);
