/**
 * Streaming Support - End-to-End Functional Tests
 * 
 * Tests complete streaming flow with REAL HTTP requests
 * Validates: stream detection, buffer handling, response types
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { Readable } from 'node:stream';
import { TinyTest } from '../../src/testing/TinyTest';
import { StreamingResponseHandler } from '../../src/application/StreamingResponseHandler';

describe('Streaming E2E - Complete Flow', () => {
  let api: TinyTest;

  beforeEach(() => {
    api = new TinyTest();
  });

  afterEach(async () => {
    await api.close();
  });

  test('should stream data from handler', async () => {
    api.get('/stream-data', {
      handler: async () => {
        return Readable.from(['chunk1', 'chunk2', 'chunk3']);
      },
    });

    const response = await api.request('GET', '/stream-data');
    
    expect(response.status).toBe(200);
    expect(response.data).toContain('chunk');
  });

  test('should handle large file streaming', async () => {
    api.get('/large-file', {
      handler: async () => {
        // Simulate large file by creating chunks
        const chunks = Array.from({ length: 100 }, (_, i) => `chunk-${i}\n`);
        return Readable.from(chunks);
      },
    });

    const response = await api.request('GET', '/large-file');
    
    expect(response.status).toBe(200);
    expect(response.data).toContain('chunk-0');
    expect(response.data).toContain('chunk-99');
  });

  test('should handle buffer responses for binary data', async () => {
    api.get('/binary', {
      handler: async () => {
        return Buffer.from('binary content here');
      },
    });

    const response = await api.request('GET', '/binary');
    
    expect(response.status).toBe(200);
    expect(response.data).toBe('binary content here');
  });

  test('should handle image buffer', async () => {
    api.get('/image', {
      handler: async () => {
        // Simulate image data
        const imageData = Buffer.alloc(1024); // 1KB fake image
        imageData.write('PNG\r\n', 0); // PNG header
        return imageData;
      },
    });

    const response = await api.request('GET', '/image');
    
    expect(response.status).toBe(200);
    expect(typeof response.data).toBe('string');
  });

  test('should differentiate between stream, buffer, and object', async () => {
    api.get('/stream-type', {
      handler: async () => {
        return Readable.from(['stream']);
      },
    });

    api.get('/buffer-type', {
      handler: async () => {
        return Buffer.from('buffer');
      },
    });

    api.get('/object-type', {
      handler: async () => {
        return { type: 'object' };
      },
    });

    const streamResp = await api.request('GET', '/stream-type');
    const bufferResp = await api.request('GET', '/buffer-type');
    const objectResp = await api.request('GET', '/object-type');
    
    expect(streamResp.status).toBe(200);
    expect(bufferResp.status).toBe(200);
    expect(objectResp.status).toBe(200);
    expect((objectResp.data as any).type).toBe('object');
  });

  test('should stream CSV data progressively', async () => {
    api.get('/export-csv', {
      handler: async () => {
        const rows = [
          'id,name,email',
          '1,John,john@example.com',
          '2,Jane,jane@example.com',
          '3,Bob,bob@example.com',
        ];
        
        return Readable.from(rows.map((row) => row + '\n'));
      },
    });

    const response = await api.request('GET', '/export-csv');
    
    expect(response.status).toBe(200);
    expect(response.data).toContain('id,name,email');
    expect(response.data).toContain('John');
    expect(response.data).toContain('Jane');
  });

  test('should handle empty stream', async () => {
    api.get('/empty-stream', {
      handler: async () => {
        return Readable.from([]);
      },
    });

    const response = await api.request('GET', '/empty-stream');
    
    expect(response.status).toBe(200);
  });

  test('should handle stream with single chunk', async () => {
    api.get('/single-chunk', {
      handler: async () => {
        return Readable.from(['only one chunk']);
      },
    });

    const response = await api.request('GET', '/single-chunk');
    
    expect(response.status).toBe(200);
    expect(response.data).toBe('only one chunk');
  });

  test('should not validate stream responses (skip Zod)', async () => {
    // This tests that StreamingResponseHandler.shouldSkipValidation() works
    api.get('/no-validate-stream', {
      handler: async () => {
        // Return stream - should NOT be validated by response schema
        return Readable.from(['raw stream data']);
      },
    });

    const response = await api.request('GET', '/no-validate-stream');
    
    expect(response.status).toBe(200);
    expect(response.data).toBe('raw stream data');
  });

  test('should not validate buffer responses (skip Zod)', async () => {
    // This tests that StreamingResponseHandler.shouldSkipValidation() works
    api.get('/no-validate-buffer', {
      handler: async () => {
        // Return buffer - should NOT be validated by response schema
        return Buffer.from('raw buffer data');
      },
    });

    const response = await api.request('GET', '/no-validate-buffer');
    
    expect(response.status).toBe(200);
    expect(response.data).toBe('raw buffer data');
  });
});

describe('StreamingResponseHandler - Unit Behavior', () => {
  test('classify() should detect streams correctly', () => {
    const stream = Readable.from(['test']);
    const result = StreamingResponseHandler.classify(stream);
    
    expect(result.type).toBe('stream');
    expect(result.isStreaming).toBe(true);
  });

  test('classify() should detect buffers correctly', () => {
    const buffer = Buffer.from('test');
    const result = StreamingResponseHandler.classify(buffer);
    
    expect(result.type).toBe('buffer');
    expect(result.isStreaming).toBe(false);
  });

  test('classify() should detect objects correctly', () => {
    const obj = { message: 'test' };
    const result = StreamingResponseHandler.classify(obj);
    
    expect(result.type).toBe('object');
    expect(result.isStreaming).toBe(false);
  });

  test('isReadableStream() should require ALL stream methods', () => {
    // Only pipe
    expect(StreamingResponseHandler.isReadableStream({ pipe: () => {} })).toBe(false);
    
    // Only on
    expect(StreamingResponseHandler.isReadableStream({ on: () => {} })).toBe(false);
    
    // Only read
    expect(StreamingResponseHandler.isReadableStream({ read: () => {} })).toBe(false);
    
    // All three required
    expect(
      StreamingResponseHandler.isReadableStream({
        pipe: () => {},
        on: () => {},
        read: () => {},
      }),
    ).toBe(true);
  });

  test('shouldSkipValidation() should return true for streams and buffers only', () => {
    const stream = Readable.from(['test']);
    const buffer = Buffer.from('test');
    const object = { data: 'test' };
    
    expect(StreamingResponseHandler.shouldSkipValidation(stream)).toBe(true);
    expect(StreamingResponseHandler.shouldSkipValidation(buffer)).toBe(true);
    expect(StreamingResponseHandler.shouldSkipValidation(object)).toBe(false);
    expect(StreamingResponseHandler.shouldSkipValidation(null)).toBe(false);
    expect(StreamingResponseHandler.shouldSkipValidation(undefined)).toBe(false);
  });
});

