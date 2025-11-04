/**
 * Multipart Support - End-to-End Functional Tests
 * 
 * Tests complete multipart flow with REAL HTTP requests
 * Validates: parsing, validation, error handling, immutability
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { TinyTest } from '../../src/testing/TinyTest';
import { FileValidator } from '../../src/application/FileValidator';

describe('Multipart E2E - Complete Flow', () => {
  let api: TinyTest;

  beforeEach(() => {
    api = new TinyTest();
  });

  afterEach(async () => {
    await api.close();
  });

  test('should upload single file and parse correctly', async () => {
    api.post('/upload', {
      handler: async (ctx) => {
      // Validate file was parsed
      expect(ctx.files).toBeDefined();
      expect(ctx.files?.length).toBe(1);

      const file = ctx.files![0];
      expect(file.filename).toBe('test.txt');
      expect(file.mimetype).toBe('text/plain');
      expect(file.size).toBeGreaterThan(0);

      // Validate toBuffer() works
      const buffer = await file.toBuffer();
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.toString()).toContain('test');

        return { uploaded: true, filename: file.filename };
      },
    });

    const formData = new FormData();
    formData.append('file', new Blob(['test content'], { type: 'text/plain' }), 'test.txt');

    const response = await api.request('POST', '/upload', { body: formData });
    
    expect(response.status).toBe(200);
    expect((response.data as any).uploaded).toBe(true);
    expect((response.data as any).filename).toBe('test.txt');
  });

  test('should upload multiple files', async () => {
    api.post('/multi-upload', {
      handler: async (ctx) => {
      expect(ctx.files).toBeDefined();
      expect(ctx.files?.length).toBe(3);

      const filenames = ctx.files!.map((f) => f.filename);
      expect(filenames).toContain('file1.txt');
      expect(filenames).toContain('file2.pdf');
      expect(filenames).toContain('file3.jpg');

        return { count: ctx.files!.length, names: filenames };
      },
    });

    const formData = new FormData();
    formData.append('files', new Blob(['content1'], { type: 'text/plain' }), 'file1.txt');
    formData.append('files', new Blob(['content2'], { type: 'application/pdf' }), 'file2.pdf');
    formData.append('files', new Blob(['content3'], { type: 'image/jpeg' }), 'file3.jpg');

    const response = await api.request('POST', '/multi-upload', { body: formData });
    
    expect(response.status).toBe(200);
    expect((response.data as any).count).toBe(3);
  });

  test('should parse form fields along with files', async () => {
    api.post('/mixed', {
      handler: async (ctx) => {
      // Validate files
      expect(ctx.files).toBeDefined();
      expect(ctx.files?.length).toBe(1);

      // Validate fields
      expect(ctx.fields).toBeDefined();
      expect(ctx.fields?.title).toBe('My Upload');
      expect(ctx.fields?.description).toBe('Test file');

        return {
          file: ctx.files![0].filename,
          fields: ctx.fields,
        };
      },
    });

    const formData = new FormData();
    formData.append('title', 'My Upload');
    formData.append('description', 'Test file');
    formData.append('file', new Blob(['data'], { type: 'text/plain' }), 'doc.txt');

    const response = await api.request('POST', '/mixed', { body: formData });
    
    expect(response.status).toBe(200);
    expect((response.data as any).file).toBe('doc.txt');
    expect((response.data as any).fields.title).toBe('My Upload');
  });

  test('should validate file constraints with FileValidator', async () => {
    api.post('/validated-upload', {
      handler: async (ctx) => {
      // Validate file exists
      const file = ctx.files?.[0];
      
      // Apply validation
      FileValidator.validate(file, {
        required: true,
        maxSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: ['image/jpeg', 'image/png'],
      });

        return { validated: true };
      },
    });

    const formData = new FormData();
    formData.append('avatar', new Blob(['image'], { type: 'image/jpeg' }), 'avatar.jpg');

    const response = await api.request('POST', '/validated-upload', { body: formData });
    
    expect(response.status).toBe(200);
    expect((response.data as any).validated).toBe(true);
  });

  test('should reject files that fail validation', async () => {
    api.post('/strict-upload', {
      handler: async (ctx) => {
      const file = ctx.files?.[0];
      
      // This should throw ValidationException
      FileValidator.validate(file, {
        required: true,
        allowedTypes: ['image/png'], // Only PNG allowed
      });

        return { uploaded: true };
      },
    });

    const formData = new FormData();
    formData.append('file', new Blob(['data'], { type: 'text/plain' }), 'doc.txt');

    const response = await api.request('POST', '/strict-upload', { body: formData });
    
    // Should return 422 Validation Error
    expect(response.status).toBe(422);
  });

  test('should handle files immutably (frozen objects)', async () => {
    api.post('/immutable-test', {
      handler: async (ctx) => {
      const file = ctx.files?.[0];
      
      // Verify file is frozen
      expect(Object.isFrozen(file)).toBe(true);

      // Attempt to modify - in strict mode this might throw or fail silently
      const originalFilename = file?.filename;
      
      try {
        (file as any).filename = 'hacked.txt';
      } catch (error) {
        // In strict mode, modification throws TypeError
        // This is expected and good
      }
      
      // Filename MUST remain unchanged (immutability guarantee)
      expect(file?.filename).toBe(originalFilename);

        return { 
          immutable: true,
          frozen: Object.isFrozen(file),
          filenameUnchanged: file?.filename === originalFilename,
        };
      },
    });

    const formData = new FormData();
    formData.append('file', new Blob(['data'], { type: 'text/plain' }), 'safe.txt');

    const response = await api.request('POST', '/immutable-test', { body: formData });
    
    expect(response.status).toBe(200);
    expect((response.data as any).immutable).toBe(true);
  });

  test('should handle empty file upload (no files)', async () => {
    api.post('/optional-file', {
      handler: async (ctx) => {
        // Files should be undefined
        expect(ctx.files).toBeUndefined();

        return { hasFiles: !!ctx.files };
      },
    });

    const formData = new FormData();
    formData.append('comment', 'Just a comment, no files');

    const response = await api.request('POST', '/optional-file', { body: formData });
    
    expect(response.status).toBe(200);
    expect((response.data as any).hasFiles).toBe(false);
  });
});

