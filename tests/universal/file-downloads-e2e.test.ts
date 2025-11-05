/**
 * File Downloads E2E Tests
 *
 * Testing Strategy:
 * - E2E: Full integration from handler → adapter → HTTP response
 * - TinyTest: Server lifecycle managed automatically
 * - Test all 3 APIs: explicit, helper, auto-detection
 * - Verify headers, status codes, and data integrity
 */

import { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { inject } from '../../src/application/DependencyInjector';
import { createFileDownload } from '../../src/infrastructure/FileDownloadHelper';
import { TinyTest } from '../../src/testing/TinyTest';

describe('File Downloads E2E - Complete Flow', () => {
  let api: TinyTest;

  beforeEach(() => {
    api = new TinyTest();
  });

  afterEach(async () => {
    await api.close();
  });

  describe('API Level 1: Explicit createFileDownload()', () => {
    test('downloads PDF file with Buffer', async () => {
      // Setup: Route that returns explicit file download
      api.get('/download/pdf', {
        handler: () => {
          const buffer = Buffer.from('PDF content');
          return createFileDownload(buffer, { filename: 'report.pdf' });
        },
      });

      // Execute: Make request
      const response = await api.rawRequest('GET', '/download/pdf');

      // Assert: Verify response
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('application/pdf');
      expect(response.headers.get('content-disposition')).toBe('attachment; filename="report.pdf"');

      // Verify data integrity
      const data = await response.text();
      expect(data).toBe('PDF content');
    });

    test('downloads image with inline disposition', async () => {
      api.get('/download/image', {
        handler: () => {
          const buffer = Buffer.from('PNG image data');
          return createFileDownload(buffer, {
            filename: 'photo.png',
            disposition: 'inline',
          });
        },
      });

      const response = await api.rawRequest('GET', '/download/image');

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('image/png');
      expect(response.headers.get('content-disposition')).toBe('inline; filename="photo.png"');
    });

    test('downloads with custom MIME type', async () => {
      api.get('/download/custom', {
        handler: () => {
          const buffer = Buffer.from('custom data');
          return createFileDownload(buffer, {
            filename: 'data.bin',
            mimeType: 'application/x-custom-binary',
          });
        },
      });

      const response = await api.rawRequest('GET', '/download/custom');

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('application/x-custom-binary');
    });
  });

  describe('API Level 2: Context Helper ctx.download()', () => {
    test('uses ctx.download() helper for ergonomic API', async () => {
      api.get('/download/helper', {
        handler: ({ download }) => {
          const buffer = Buffer.from('CSV data');
          return download(buffer, { filename: 'data.csv' });
        },
      });

      const response = await api.rawRequest('GET', '/download/helper');

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('text/csv');
      expect(response.headers.get('content-disposition')).toBe('attachment; filename="data.csv"');
    });

    test('ctx.download() with Stream', async () => {
      api.get('/download/stream-helper', {
        handler: ({ download }) => {
          const stream = Readable.from(['chunk1', 'chunk2', 'chunk3']);
          return download(stream, { filename: 'stream.txt' });
        },
      });

      const response = await api.rawRequest('GET', '/download/stream-helper');

      expect(response.status).toBe(200);
      expect(response.headers.get('content-disposition')).toContain('stream.txt');

      const data = await response.text();
      expect(data).toBe('chunk1chunk2chunk3');
    });

    test('ctx.download() with inline disposition', async () => {
      api.get('/preview/image', {
        handler: ({ download }) => {
          const buffer = Buffer.from('image data');
          return download(buffer, {
            filename: 'preview.jpg',
            disposition: 'inline',
          });
        },
      });

      const response = await api.rawRequest('GET', '/preview/image');

      expect(response.headers.get('content-disposition')).toBe('inline; filename="preview.jpg"');
    });
  });

  describe('API Level 3: Auto-Detection', () => {
    test('auto-detects file download from return structure', async () => {
      api.get('/download/auto', {
        handler: () => {
          // Return object with file download structure
          // SyntroJS auto-detects and handles it
          return {
            data: Buffer.from('auto-detected content'),
            headers: {
              'Content-Disposition': 'attachment; filename="auto.txt"',
              'Content-Type': 'text/plain',
            },
            statusCode: 200,
          };
        },
      });

      const response = await api.rawRequest('GET', '/download/auto');

      expect(response.status).toBe(200);
      expect(response.headers.get('content-disposition')).toBe('attachment; filename="auto.txt"');
      expect(await response.text()).toBe('auto-detected content');
    });

    test('auto-detects Stream in file download structure', async () => {
      api.get('/stream/auto', {
        handler: () => {
          const stream = Readable.from(['a', 'b', 'c']);
          return {
            data: stream,
            headers: {
              'Content-Disposition': 'attachment; filename="stream.txt"',
              'Content-Type': 'text/plain',
            },
            statusCode: 200,
          };
        },
      });

      const response = await api.rawRequest('GET', '/stream/auto');

      expect(response.status).toBe(200);
      expect(await response.text()).toBe('abc');
    });
  });

  describe('Different File Types', () => {
    test('downloads JSON file', async () => {
      api.get('/download/json', {
        handler: ({ download }) => {
          const json = JSON.stringify({ key: 'value' }, null, 2);
          return download(json, { filename: 'data.json' });
        },
      });

      const response = await api.rawRequest('GET', '/download/json');

      // Note: Fastify adds charset automatically, which is correct HTTP behavior
      expect(response.headers.get('content-type')).toContain('application/json');
      const data = await response.text();
      expect(JSON.parse(data)).toEqual({ key: 'value' });
    });

    test('downloads XML file', async () => {
      api.get('/download/xml', {
        handler: ({ download }) => {
          const xml = '<?xml version="1.0"?><root><item>value</item></root>';
          return download(xml, { filename: 'data.xml' });
        },
      });

      const response = await api.rawRequest('GET', '/download/xml');

      expect(response.headers.get('content-type')).toBe('application/xml');
      expect(await response.text()).toContain('<?xml version="1.0"?>');
    });

    test('downloads ZIP archive', async () => {
      api.get('/download/zip', {
        handler: ({ download }) => {
          const buffer = Buffer.from('ZIP file content');
          return download(buffer, { filename: 'archive.zip' });
        },
      });

      const response = await api.rawRequest('GET', '/download/zip');

      expect(response.headers.get('content-type')).toBe('application/zip');
    });
  });

  describe('Security - Path Traversal Protection', () => {
    test('rejects filename with forward slash', async () => {
      api.get('/download/unsafe1', {
        handler: ({ download }) => {
          const buffer = Buffer.from('test');
          return download(buffer, { filename: 'path/to/file.pdf' });
        },
      });

      const response = await api.rawRequest('GET', '/download/unsafe1');

      // Should return 400 error
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.detail).toContain('path separators');
    });

    test('rejects filename with backslash', async () => {
      api.get('/download/unsafe2', {
        handler: ({ download }) => {
          const buffer = Buffer.from('test');
          return download(buffer, { filename: 'path\\to\\file.pdf' });
        },
      });

      const response = await api.rawRequest('GET', '/download/unsafe2');

      expect(response.status).toBe(400);
    });

    test('rejects filename with directory traversal', async () => {
      api.get('/download/unsafe3', {
        handler: ({ download }) => {
          const buffer = Buffer.from('test');
          return download(buffer, { filename: '../etc/passwd' });
        },
      });

      const response = await api.rawRequest('GET', '/download/unsafe3');

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.detail).toContain('directory traversal');
    });
  });

  describe('Data Integrity', () => {
    test('preserves binary data in Buffer', async () => {
      api.get('/download/binary', {
        handler: ({ download }) => {
          // Binary data with special bytes
          const buffer = Buffer.from([0x00, 0xff, 0x42, 0xa5, 0x10]);
          return download(buffer, { filename: 'binary.bin' });
        },
      });

      const response = await api.rawRequest('GET', '/download/binary');

      const arrayBuffer = await response.arrayBuffer();
      const resultBuffer = Buffer.from(arrayBuffer);

      expect(resultBuffer).toEqual(Buffer.from([0x00, 0xff, 0x42, 0xa5, 0x10]));
    });

    test('preserves large text files', async () => {
      api.get('/download/large', {
        handler: ({ download }) => {
          // Generate 10KB of text
          const content = 'A'.repeat(10000);
          return download(content, { filename: 'large.txt' });
        },
      });

      const response = await api.rawRequest('GET', '/download/large');

      const data = await response.text();
      expect(data.length).toBe(10000);
      expect(data[0]).toBe('A');
      expect(data[9999]).toBe('A');
    });

    test('streams data without loading all in memory', async () => {
      api.get('/download/stream', {
        handler: ({ download }) => {
          // Create stream that generates data on-demand
          const stream = Readable.from(
            (function* () {
              yield 'line1\n';
              yield 'line2\n';
              yield 'line3\n';
            })(),
          );

          return download(stream, { filename: 'lines.txt' });
        },
      });

      const response = await api.rawRequest('GET', '/download/stream');

      const data = await response.text();
      expect(data).toBe('line1\nline2\nline3\n');
    });
  });

  describe('Integration with Route Config', () => {
    test('works with custom status code from route config', async () => {
      api.get('/download/custom-status', {
        status: 201, // Custom status (ignored by file download - uses 200)
        handler: ({ download }) => {
          return download(Buffer.from('test'), { filename: 'file.txt' });
        },
      });

      const response = await api.rawRequest('GET', '/download/custom-status');

      // File download always uses 200 (from createFileDownload)
      expect(response.status).toBe(200);
    });

    test('works with dependencies injection', async () => {
      // Simulate file service dependency
      const getFileService = () => ({
        getFile: (name: string) => Buffer.from(`Content of ${name}`),
      });

      api.get('/download/with-di', {
        dependencies: {
          fileService: inject(getFileService, { scope: 'singleton' }),
        },
        handler: ({ download, dependencies }) => {
          const buffer = dependencies.fileService.getFile('report.pdf');
          return download(buffer, { filename: 'report.pdf' });
        },
      });

      const response = await api.rawRequest('GET', '/download/with-di');

      expect(response.status).toBe(200);
      expect(await response.text()).toBe('Content of report.pdf');
    });
  });

  describe('Comparison with Direct Buffer/Stream (backward compatibility)', () => {
    test('explicit download has headers, plain Buffer does not', async () => {
      // Route 1: Plain Buffer (legacy)
      api.get('/buffer/plain', {
        handler: () => Buffer.from('plain buffer'),
      });

      // Route 2: File download (new)
      api.get('/buffer/download', {
        handler: ({ download }) => download(Buffer.from('plain buffer'), { filename: 'file.txt' }),
      });

      const plainResponse = await api.rawRequest('GET', '/buffer/plain');
      const downloadResponse = await api.rawRequest('GET', '/buffer/download');

      // Plain buffer: no Content-Disposition
      expect(plainResponse.headers.get('content-disposition')).toBeNull();

      // File download: has Content-Disposition
      expect(downloadResponse.headers.get('content-disposition')).toBe(
        'attachment; filename="file.txt"',
      );

      // Both have same data
      expect(await plainResponse.text()).toBe(await downloadResponse.text());
    });
  });

  describe('Real-World Use Cases', () => {
    test('CSV export from database', async () => {
      api.get('/export/users.csv', {
        handler: ({ download }) => {
          // Simulate database query → CSV
          const csvData = [
            'id,name,email',
            '1,John Doe,john@example.com',
            '2,Jane Smith,jane@example.com',
          ].join('\n');

          return download(csvData, { filename: 'users.csv' });
        },
      });

      const response = await api.rawRequest('GET', '/export/users.csv');

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('text/csv');

      const csv = await response.text();
      expect(csv).toContain('id,name,email');
      expect(csv).toContain('John Doe');
    });

    test('PDF report generation', async () => {
      api.get('/reports/:reportId', {
        handler: ({ download }) => {
          // Simulate PDF generation
          const pdfBuffer = Buffer.from('PDF binary content');
          return download(pdfBuffer, {
            filename: 'monthly-report.pdf',
            mimeType: 'application/pdf',
          });
        },
      });

      const response = await api.rawRequest('GET', '/reports/2024-01');

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('application/pdf');
      expect(response.headers.get('content-disposition')).toBe(
        'attachment; filename="monthly-report.pdf"',
      );
    });

    test('Image preview (inline display)', async () => {
      api.get('/preview/:imageId', {
        handler: ({ download }) => {
          // Simulate image retrieval
          const imageBuffer = Buffer.from('JPEG data');
          return download(imageBuffer, {
            filename: 'preview.jpg',
            disposition: 'inline', // Display in browser
          });
        },
      });

      const response = await api.rawRequest('GET', '/preview/12345');

      expect(response.headers.get('content-disposition')).toBe('inline; filename="preview.jpg"');
      expect(response.headers.get('content-type')).toBe('image/jpeg');
    });

    test('Streaming large file download', async () => {
      api.get('/download/large-log', {
        handler: ({ download }) => {
          // Simulate large log file streaming
          const stream = Readable.from(
            (function* () {
              for (let i = 0; i < 100; i++) {
                yield `Log line ${i}\n`;
              }
            })(),
          );

          return download(stream, {
            filename: 'application.log',
            mimeType: 'text/plain',
          });
        },
      });

      const response = await api.rawRequest('GET', '/download/large-log');

      expect(response.status).toBe(200);
      expect(response.headers.get('content-disposition')).toContain('application.log');

      const logs = await response.text();
      expect(logs).toContain('Log line 0');
      expect(logs).toContain('Log line 99');
    });

    test('Dynamic filename from route params', async () => {
      api.get('/download/file/:filename', {
        handler: ({ params, download }) => {
          const buffer = Buffer.from(`Content of ${params.filename}`);
          return download(buffer, { filename: params.filename as string });
        },
      });

      const response = await api.rawRequest('GET', '/download/file/my-document.pdf');

      expect(response.headers.get('content-disposition')).toBe(
        'attachment; filename="my-document.pdf"',
      );
      expect(await response.text()).toBe('Content of my-document.pdf');
    });
  });

  describe('Error Handling', () => {
    test('returns 400 when download() receives invalid filename', async () => {
      api.get('/download/error', {
        handler: ({ download }) => {
          const buffer = Buffer.from('test');
          // Invalid filename - contains path separator
          return download(buffer, { filename: '../etc/passwd' });
        },
      });

      const response = await api.rawRequest('GET', '/download/error');

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.detail).toContain('directory traversal');
    });

    test('returns 400 when download() receives empty filename', async () => {
      api.get('/download/empty', {
        handler: ({ download }) => {
          return download(Buffer.from('test'), { filename: '' });
        },
      });

      const response = await api.rawRequest('GET', '/download/empty');

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.detail).toContain('Filename cannot be empty');
    });
  });

  describe('Special Characters in Filenames', () => {
    test('handles filename with quotes', async () => {
      api.get('/download/quotes', {
        handler: ({ download }) => {
          return download(Buffer.from('test'), {
            filename: 'file"with"quotes.txt',
          });
        },
      });

      const response = await api.rawRequest('GET', '/download/quotes');

      // Quotes should be escaped
      expect(response.headers.get('content-disposition')).toContain('file\\"with\\"quotes.txt');
    });

    test('handles Unicode filename', async () => {
      api.get('/download/unicode', {
        handler: ({ download }) => {
          return download(Buffer.from('test'), {
            filename: 'archivo-español-ñ.pdf',
          });
        },
      });

      const response = await api.rawRequest('GET', '/download/unicode');

      expect(response.headers.get('content-disposition')).toContain('archivo-español-ñ.pdf');
    });

    test('handles filename with spaces', async () => {
      api.get('/download/spaces', {
        handler: ({ download }) => {
          return download(Buffer.from('test'), {
            filename: 'my document with spaces.pdf',
          });
        },
      });

      const response = await api.rawRequest('GET', '/download/spaces');

      expect(response.headers.get('content-disposition')).toContain('my document with spaces.pdf');
    });
  });
});
