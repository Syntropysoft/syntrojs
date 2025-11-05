/**
 * FileDownloadHelper - Unit Tests
 *
 * Testing Strategy:
 * - Each guard clause = 1 test
 * - Pure function = predictable tests
 * - No mocks needed (zero dependencies)
 * - Functional approach = trivial assertions
 */

import { Readable } from 'node:stream';
import { describe, expect, test } from 'vitest';
import { BadRequestException } from '../../src/domain/HTTPException';
import {
  createFileDownload,
  type FileDownloadOptions,
  isFileDownloadResponse,
} from '../../src/infrastructure/FileDownloadHelper';

describe('FileDownloadHelper - Unit Tests', () => {
  describe('createFileDownload() - Guard Clauses', () => {
    test('throws when data is null', () => {
      // Guard clause: data required
      expect(() => createFileDownload(null as any, { filename: 'test.pdf' })).toThrow(
        BadRequestException,
      );
      expect(() => createFileDownload(null as any, { filename: 'test.pdf' })).toThrow(
        'File data is required for download',
      );
    });

    test('throws when data is undefined', () => {
      // Guard clause: data required
      expect(() => createFileDownload(undefined as any, { filename: 'test.pdf' })).toThrow(
        BadRequestException,
      );
    });

    test('throws when options is null', () => {
      // Guard clause: options required
      const buffer = Buffer.from('test content');
      expect(() => createFileDownload(buffer, null as any)).toThrow(BadRequestException);
      expect(() => createFileDownload(buffer, null as any)).toThrow(
        'File download options are required',
      );
    });

    test('throws when options is undefined', () => {
      // Guard clause: options required
      const buffer = Buffer.from('test content');
      expect(() => createFileDownload(buffer, undefined as any)).toThrow(BadRequestException);
    });

    test('throws when filename is missing', () => {
      // Guard clause: filename required
      const buffer = Buffer.from('test content');
      expect(() => createFileDownload(buffer, {} as any)).toThrow(BadRequestException);
      expect(() => createFileDownload(buffer, {} as any)).toThrow(
        'Filename is required and must be a string',
      );
    });

    test('throws when filename is not a string', () => {
      // Guard clause: filename must be string
      const buffer = Buffer.from('test content');
      expect(() => createFileDownload(buffer, { filename: 123 } as any)).toThrow(
        BadRequestException,
      );
    });

    test('throws when filename is empty string', () => {
      // Guard clause: filename cannot be empty
      const buffer = Buffer.from('test content');
      expect(() => createFileDownload(buffer, { filename: '' })).toThrow(BadRequestException);
      expect(() => createFileDownload(buffer, { filename: '' })).toThrow(
        'Filename cannot be empty',
      );
    });

    test('throws when filename is whitespace only', () => {
      // Guard clause: filename cannot be empty after trim
      const buffer = Buffer.from('test content');
      expect(() => createFileDownload(buffer, { filename: '   ' })).toThrow(BadRequestException);
    });

    test('throws when filename contains forward slash', () => {
      // Guard clause: prevent path traversal
      const buffer = Buffer.from('test content');
      expect(() => createFileDownload(buffer, { filename: 'path/to/file.pdf' })).toThrow(
        BadRequestException,
      );
      expect(() => createFileDownload(buffer, { filename: 'path/to/file.pdf' })).toThrow(
        'Filename must not contain path separators',
      );
    });

    test('throws when filename contains backslash', () => {
      // Guard clause: prevent path traversal (Windows)
      const buffer = Buffer.from('test content');
      expect(() => createFileDownload(buffer, { filename: 'path\\to\\file.pdf' })).toThrow(
        BadRequestException,
      );
    });

    test('throws when filename contains .. (directory traversal)', () => {
      // Guard clause: prevent directory traversal
      const buffer = Buffer.from('test content');
      expect(() => createFileDownload(buffer, { filename: '../etc/passwd' })).toThrow(
        BadRequestException,
      );
      expect(() => createFileDownload(buffer, { filename: '../etc/passwd' })).toThrow(
        'Filename must not contain .. (directory traversal)',
      );
    });

    test('throws when disposition is invalid', () => {
      // Guard clause: disposition must be 'attachment' or 'inline'
      const buffer = Buffer.from('test content');
      expect(() =>
        createFileDownload(buffer, { filename: 'test.pdf', disposition: 'invalid' as any }),
      ).toThrow(BadRequestException);
      expect(() =>
        createFileDownload(buffer, { filename: 'test.pdf', disposition: 'invalid' as any }),
      ).toThrow('Disposition must be either "attachment" or "inline"');
    });
  });

  describe('createFileDownload() - Happy Path with Buffer', () => {
    test('returns valid response with Buffer and filename', () => {
      // Pure function: same input, same output
      const buffer = Buffer.from('test content');
      const result = createFileDownload(buffer, { filename: 'test.txt' });

      // Immutable assertions
      expect(result).toEqual({
        data: buffer,
        statusCode: 200,
        headers: {
          'Content-Type': 'text/plain',
          'Content-Disposition': 'attachment; filename="test.txt"',
        },
        __isFileDownload: true,
      });
    });

    test('auto-detects MIME type from extension', () => {
      const buffer = Buffer.from('PDF content');

      // PDF
      const pdf = createFileDownload(buffer, { filename: 'document.pdf' });
      expect(pdf.headers['Content-Type']).toBe('application/pdf');

      // JPEG
      const jpeg = createFileDownload(buffer, { filename: 'image.jpeg' });
      expect(jpeg.headers['Content-Type']).toBe('image/jpeg');

      // PNG
      const png = createFileDownload(buffer, { filename: 'photo.png' });
      expect(png.headers['Content-Type']).toBe('image/png');

      // CSV
      const csv = createFileDownload(buffer, { filename: 'data.csv' });
      expect(csv.headers['Content-Type']).toBe('text/csv');

      // ZIP
      const zip = createFileDownload(buffer, { filename: 'archive.zip' });
      expect(zip.headers['Content-Type']).toBe('application/zip');
    });

    test('uses custom MIME type when provided', () => {
      const buffer = Buffer.from('custom content');
      const result = createFileDownload(buffer, {
        filename: 'data.bin',
        mimeType: 'application/x-custom',
      });

      expect(result.headers['Content-Type']).toBe('application/x-custom');
    });

    test('defaults to attachment disposition', () => {
      const buffer = Buffer.from('test');
      const result = createFileDownload(buffer, { filename: 'file.txt' });

      expect(result.headers['Content-Disposition']).toBe('attachment; filename="file.txt"');
    });

    test('uses inline disposition when specified', () => {
      const buffer = Buffer.from('test');
      const result = createFileDownload(buffer, {
        filename: 'preview.jpg',
        disposition: 'inline',
      });

      expect(result.headers['Content-Disposition']).toBe('inline; filename="preview.jpg"');
    });

    test('sanitizes filename with quotes', () => {
      const buffer = Buffer.from('test');
      const result = createFileDownload(buffer, {
        filename: 'file"with"quotes.txt',
      });

      // Quotes should be escaped
      expect(result.headers['Content-Disposition']).toBe(
        'attachment; filename="file\\"with\\"quotes.txt"',
      );
    });

    test('handles filename without extension', () => {
      const buffer = Buffer.from('test');
      const result = createFileDownload(buffer, { filename: 'README' });

      // Should default to octet-stream
      expect(result.headers['Content-Type']).toBe('application/octet-stream');
      expect(result.headers['Content-Disposition']).toBe('attachment; filename="README"');
    });

    test('handles uppercase extensions', () => {
      const buffer = Buffer.from('test');
      const result = createFileDownload(buffer, { filename: 'FILE.PDF' });

      // Extension should be case-insensitive
      expect(result.headers['Content-Type']).toBe('application/pdf');
    });
  });

  describe('createFileDownload() - Happy Path with Stream', () => {
    test('returns valid response with Stream', () => {
      // Functional: Stream is passed through immutably (no copy)
      const stream = Readable.from(['chunk1', 'chunk2']);
      const result = createFileDownload(stream, { filename: 'stream.txt' });

      // Stream should be same reference (immutable, no copy)
      expect(result.data).toBe(stream);
      expect(result.statusCode).toBe(200);
      expect(result.headers['Content-Type']).toBe('text/plain');
      expect(result.headers['Content-Disposition']).toBe('attachment; filename="stream.txt"');
    });

    test('works with large file streams', () => {
      const stream = Readable.from(['chunk1', 'chunk2', 'chunk3']);
      const result = createFileDownload(stream, {
        filename: 'video.mp4',
        mimeType: 'video/mp4',
      });

      expect(result.data).toBe(stream);
      expect(result.headers['Content-Type']).toBe('video/mp4');
    });
  });

  describe('createFileDownload() - Happy Path with String', () => {
    test('returns valid response with string data', () => {
      const content = 'Hello, World!';
      const result = createFileDownload(content, { filename: 'hello.txt' });

      expect(result.data).toBe(content);
      expect(result.statusCode).toBe(200);
      expect(result.headers['Content-Type']).toBe('text/plain');
    });

    test('handles HTML content', () => {
      const html = '<html><body>Test</body></html>';
      const result = createFileDownload(html, {
        filename: 'page.html',
      });

      expect(result.data).toBe(html);
      expect(result.headers['Content-Type']).toBe('text/html');
    });

    test('handles JSON content', () => {
      const json = '{"key": "value"}';
      const result = createFileDownload(json, { filename: 'data.json' });

      expect(result.data).toBe(json);
      expect(result.headers['Content-Type']).toBe('application/json');
    });
  });

  describe('createFileDownload() - Immutability', () => {
    test('does not mutate input data (Buffer)', () => {
      const buffer = Buffer.from('original');
      const originalBuffer = buffer;

      const result = createFileDownload(buffer, { filename: 'file.txt' });

      // Data should be same reference (immutable, no copy)
      expect(result.data).toBe(originalBuffer);
    });

    test('does not mutate input options', () => {
      const buffer = Buffer.from('test');
      const options: FileDownloadOptions = { filename: 'test.txt' };
      const originalOptions = { ...options };

      createFileDownload(buffer, options);

      // Options should not be mutated
      expect(options).toEqual(originalOptions);
    });

    test('returns new object each time (pure function)', () => {
      const buffer = Buffer.from('test');
      const options = { filename: 'test.txt' };

      const result1 = createFileDownload(buffer, options);
      const result2 = createFileDownload(buffer, options);

      // Results should be equal but not same reference
      expect(result1).toEqual(result2);
      expect(result1).not.toBe(result2);
    });
  });

  describe('isFileDownloadResponse() - Type Guard', () => {
    test('returns true for valid file download response', () => {
      const validResponse = {
        data: Buffer.from('test'),
        headers: {
          'Content-Disposition': 'attachment; filename="test.pdf"',
          'Content-Type': 'application/pdf',
        },
        statusCode: 200,
      };

      expect(isFileDownloadResponse(validResponse)).toBe(true);
    });

    test('returns false for null', () => {
      expect(isFileDownloadResponse(null)).toBe(false);
    });

    test('returns false for undefined', () => {
      expect(isFileDownloadResponse(undefined)).toBe(false);
    });

    test('returns false for object without data', () => {
      const invalid = {
        headers: { 'Content-Disposition': 'attachment' },
        statusCode: 200,
      };

      expect(isFileDownloadResponse(invalid)).toBe(false);
    });

    test('returns false for object without headers', () => {
      const invalid = {
        data: Buffer.from('test'),
        statusCode: 200,
      };

      expect(isFileDownloadResponse(invalid)).toBe(false);
    });

    test('returns false for object without Content-Disposition', () => {
      const invalid = {
        data: Buffer.from('test'),
        headers: { 'Content-Type': 'application/pdf' },
        statusCode: 200,
      };

      expect(isFileDownloadResponse(invalid)).toBe(false);
    });

    test('returns false for plain object', () => {
      const plainObject = { message: 'hello' };
      expect(isFileDownloadResponse(plainObject)).toBe(false);
    });

    test('returns false for array', () => {
      expect(isFileDownloadResponse([])).toBe(false);
    });

    test('returns false for string', () => {
      expect(isFileDownloadResponse('test')).toBe(false);
    });

    test('returns false for number', () => {
      expect(isFileDownloadResponse(123)).toBe(false);
    });
  });

  describe('MIME Type Detection - Comprehensive', () => {
    const buffer = Buffer.from('test');

    test('detects document types', () => {
      expect(createFileDownload(buffer, { filename: 'doc.pdf' }).headers['Content-Type']).toBe(
        'application/pdf',
      );
      expect(createFileDownload(buffer, { filename: 'doc.doc' }).headers['Content-Type']).toBe(
        'application/msword',
      );
      expect(createFileDownload(buffer, { filename: 'doc.docx' }).headers['Content-Type']).toBe(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );
      expect(createFileDownload(buffer, { filename: 'sheet.xlsx' }).headers['Content-Type']).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
    });

    test('detects image types', () => {
      expect(createFileDownload(buffer, { filename: 'image.jpg' }).headers['Content-Type']).toBe(
        'image/jpeg',
      );
      expect(createFileDownload(buffer, { filename: 'image.jpeg' }).headers['Content-Type']).toBe(
        'image/jpeg',
      );
      expect(createFileDownload(buffer, { filename: 'image.png' }).headers['Content-Type']).toBe(
        'image/png',
      );
      expect(createFileDownload(buffer, { filename: 'image.gif' }).headers['Content-Type']).toBe(
        'image/gif',
      );
      expect(createFileDownload(buffer, { filename: 'image.webp' }).headers['Content-Type']).toBe(
        'image/webp',
      );
      expect(createFileDownload(buffer, { filename: 'image.svg' }).headers['Content-Type']).toBe(
        'image/svg+xml',
      );
    });

    test('detects video types', () => {
      expect(createFileDownload(buffer, { filename: 'video.mp4' }).headers['Content-Type']).toBe(
        'video/mp4',
      );
      expect(createFileDownload(buffer, { filename: 'video.webm' }).headers['Content-Type']).toBe(
        'video/webm',
      );
      expect(createFileDownload(buffer, { filename: 'video.avi' }).headers['Content-Type']).toBe(
        'video/x-msvideo',
      );
    });

    test('detects audio types', () => {
      expect(createFileDownload(buffer, { filename: 'audio.mp3' }).headers['Content-Type']).toBe(
        'audio/mpeg',
      );
      expect(createFileDownload(buffer, { filename: 'audio.wav' }).headers['Content-Type']).toBe(
        'audio/wav',
      );
      expect(createFileDownload(buffer, { filename: 'audio.ogg' }).headers['Content-Type']).toBe(
        'audio/ogg',
      );
    });

    test('detects archive types', () => {
      expect(createFileDownload(buffer, { filename: 'archive.zip' }).headers['Content-Type']).toBe(
        'application/zip',
      );
      expect(createFileDownload(buffer, { filename: 'archive.tar' }).headers['Content-Type']).toBe(
        'application/x-tar',
      );
      expect(createFileDownload(buffer, { filename: 'archive.gz' }).headers['Content-Type']).toBe(
        'application/gzip',
      );
    });

    test('defaults to octet-stream for unknown extensions', () => {
      expect(createFileDownload(buffer, { filename: 'file.unknown' }).headers['Content-Type']).toBe(
        'application/octet-stream',
      );
      expect(createFileDownload(buffer, { filename: 'noextension' }).headers['Content-Type']).toBe(
        'application/octet-stream',
      );
    });
  });

  describe('Functional Programming Principles', () => {
    test('is pure - same input produces same output', () => {
      const buffer = Buffer.from('test');
      const options = { filename: 'test.pdf' };

      const result1 = createFileDownload(buffer, options);
      const result2 = createFileDownload(buffer, options);

      // Same values
      expect(result1).toEqual(result2);

      // But different object references (immutable)
      expect(result1).not.toBe(result2);
    });

    test('has no side effects', () => {
      const buffer = Buffer.from('original content');
      const options = { filename: 'file.txt' };

      // Call function
      createFileDownload(buffer, options);

      // Inputs should be unchanged
      expect(buffer.toString()).toBe('original content');
      expect(options).toEqual({ filename: 'file.txt' });
    });

    test('is deterministic - produces consistent headers', () => {
      const buffer = Buffer.from('test');

      // Call 10 times
      const results = Array.from({ length: 10 }, () =>
        createFileDownload(buffer, { filename: 'test.pdf' }),
      );

      // All should have identical headers
      const firstHeaders = results[0].headers;
      for (const result of results) {
        expect(result.headers).toEqual(firstHeaders);
      }
    });
  });

  describe('Edge Cases', () => {
    test('handles very long filenames', () => {
      const buffer = Buffer.from('test');
      const longFilename = 'a'.repeat(200) + '.pdf';

      const result = createFileDownload(buffer, { filename: longFilename });

      expect(result.headers['Content-Disposition']).toContain(longFilename);
    });

    test('handles special characters in filename', () => {
      const buffer = Buffer.from('test');
      const result = createFileDownload(buffer, {
        filename: 'file-name_with.special@chars.pdf',
      });

      expect(result.headers['Content-Disposition']).toContain('file-name_with.special@chars.pdf');
    });

    test('handles unicode characters in filename', () => {
      const buffer = Buffer.from('test');
      const result = createFileDownload(buffer, {
        filename: 'archivo-español-ñ.pdf',
      });

      expect(result.headers['Content-Disposition']).toContain('archivo-español-ñ.pdf');
    });

    test('handles filename with multiple dots', () => {
      const buffer = Buffer.from('test');
      const result = createFileDownload(buffer, {
        filename: 'file.name.with.dots.tar.gz',
      });

      // Should detect .gz extension
      expect(result.headers['Content-Type']).toBe('application/gzip');
    });
  });
});
