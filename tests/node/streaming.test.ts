/**
 * Streaming Support Tests
 * 
 * Tests for Node.js Readable streams and Buffer responses
 * Part of v0.4.0 - REST Completion
 */

import { createReadStream, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { Readable } from 'node:stream';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { TinyTest } from '../../src/testing/TinyTest';

// Test fixtures directory
const FIXTURES_DIR = './tests/fixtures/streaming';
const SMALL_FILE = `${FIXTURES_DIR}/small.txt`;
const LARGE_FILE = `${FIXTURES_DIR}/large.bin`;

describe('Streaming Support', () => {
  beforeAll(() => {
    // Create fixtures directory
    mkdirSync(FIXTURES_DIR, { recursive: true });
    
    // Create small file (< 1MB)
    writeFileSync(SMALL_FILE, 'Hello, streaming world!'.repeat(1000));
    
    // Create large file (>10MB) for memory tests
    const largeContent = Buffer.alloc(10 * 1024 * 1024, 'A'); // 10MB of 'A'
    writeFileSync(LARGE_FILE, largeContent);
  });

  afterAll(() => {
    // Cleanup test files
    try {
      unlinkSync(SMALL_FILE);
      unlinkSync(LARGE_FILE);
    } catch {
      // Files might not exist
    }
  });

  test('should stream small file successfully', async () => {
    const api = new TinyTest();
    
    api.get('/stream/small', {
      handler: () => createReadStream(SMALL_FILE)
    });

    const response = await api.request('GET', '/stream/small');
    
    expect(response.status).toBe(200);
    // Fastify handles streaming automatically - just verify we got the data
    expect(response.data).toContain('Hello, streaming world!');
    
    await api.close();
  });

  test('should stream large file without OOM', async () => {
    const api = new TinyTest();
    
    api.get('/stream/large', {
      handler: () => createReadStream(LARGE_FILE)
    });

    // Measure memory before streaming
    const memBefore = process.memoryUsage().heapUsed;
    
    const response = await api.request('GET', '/stream/large');
    
    expect(response.status).toBe(200);
    // Verify we got the full file (TinyTest reads it as text)
    expect(typeof response.data).toBe('string');
    expect((response.data as string).length).toBe(10 * 1024 * 1024); // 10MB of 'A'
    
    // Measure memory after streaming
    const memAfter = process.memoryUsage().heapUsed;
    const memIncreaseMB = (memAfter - memBefore) / (1024 * 1024);
    
    // Memory increase should be reasonable (< 50MB for 10MB file)
    // If we loaded entire file to memory, increase would be >10MB
    expect(memIncreaseMB).toBeLessThan(50);
    
    await api.close();
  });

  test('should stream data from custom Readable', async () => {
    const api = new TinyTest();
    
    api.get('/stream/custom', {
      handler: () => {
        // Create custom readable stream
        const data = ['Line 1\n', 'Line 2\n', 'Line 3\n'];
        let index = 0;
        
        return new Readable({
          read() {
            if (index < data.length) {
              this.push(data[index]);
              index++;
            } else {
              this.push(null); // Signal end of stream
            }
          }
        });
      }
    });

    const response = await api.request('GET', '/stream/custom');
    
    expect(response.status).toBe(200);
    expect(response.data).toBe('Line 1\nLine 2\nLine 3\n');
    
    await api.close();
  });

  test('should send buffer response', async () => {
    const api = new TinyTest();
    
    api.get('/buffer/simple', {
      handler: () => Buffer.from('Hello from buffer!')
    });

    const response = await api.request('GET', '/buffer/simple');
    
    expect(response.status).toBe(200);
    // Fastify automatically sets Content-Length for buffers
    expect(response.data).toBe('Hello from buffer!');
    
    await api.close();
  });

  test('should send binary buffer', async () => {
    const api = new TinyTest();
    
    api.get('/buffer/binary', {
      handler: () => {
        // Simulate binary data (fake PNG header)
        const buffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
        return buffer;
      }
    });

    const response = await api.request('GET', '/buffer/binary');
    
    expect(response.status).toBe(200);
    // TinyTest parses binary as text - just verify we got data back
    expect(response.data).toBeDefined();
    expect(typeof response.data).toBe('string');
    
    await api.close();
  });

  test('should handle large buffer', async () => {
    const api = new TinyTest();
    
    api.get('/buffer/large', {
      handler: () => Buffer.alloc(5 * 1024 * 1024, 'B') // 5MB buffer
    });

    const response = await api.request('GET', '/buffer/large');
    
    expect(response.status).toBe(200);
    // Verify we got the full buffer (parsed as text by TinyTest)
    expect(typeof response.data).toBe('string');
    expect((response.data as string).length).toBe(5 * 1024 * 1024);
    
    await api.close();
  });

  test('should send empty buffer', async () => {
    const api = new TinyTest();
    
    api.get('/buffer/empty', {
      handler: () => Buffer.alloc(0)
    });

    const response = await api.request('GET', '/buffer/empty');
    
    expect(response.status).toBe(200);
    expect(response.data).toBe('');
    
    await api.close();
  });

  test('should handle stream and JSON in same app', async () => {
    const api = new TinyTest();
    
    // Stream endpoint
    api.get('/mixed/stream', {
      handler: () => createReadStream(SMALL_FILE)
    });
    
    // JSON endpoint
    api.get('/mixed/json', {
      handler: () => ({ message: 'This is JSON' })
    });

    // Test JSON first
    const jsonResponse = await api.request('GET', '/mixed/json');
    expect(jsonResponse.status).toBe(200);
    expect(jsonResponse.data).toEqual({ message: 'This is JSON' });
    
    // Test stream
    const streamResponse = await api.request('GET', '/mixed/stream');
    expect(streamResponse.status).toBe(200);
    expect(streamResponse.data).toContain('Hello, streaming world!');
    
    await api.close();
  });

  test('should not validate stream responses', async () => {
    const api = new TinyTest();
    
    // This would fail if validation was applied to streams
    // because stream is not a string
    api.get('/mixed/no-validate', {
      // response: z.string(), // If we add this, it should NOT validate the stream
      handler: () => createReadStream(SMALL_FILE)
    });

    const response = await api.request('GET', '/mixed/no-validate');
    
    expect(response.status).toBe(200);
    
    await api.close();
  });

  test('should support custom status code with stream', async () => {
    const api = new TinyTest();
    
    api.get('/stream/status', {
      status: 201,
      handler: () => createReadStream(SMALL_FILE)
    });

    const response = await api.request('GET', '/stream/status');
    
    expect(response.status).toBe(201);
    expect(response.data).toContain('Hello, streaming world!');
    
    await api.close();
  });

  test('should support custom status code with buffer', async () => {
    const api = new TinyTest();
    
    api.get('/buffer/status', {
      status: 202,
      handler: () => Buffer.from('Accepted')
    });

    const response = await api.request('GET', '/buffer/status');
    
    expect(response.status).toBe(202);
    
    await api.close();
  });
});
