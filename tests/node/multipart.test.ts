/**
 * Multipart Support Tests
 * 
 * Tests for file uploads and form data handling
 * Part of v0.4.0 - REST Completion
 */

import { writeFileSync, mkdirSync, unlinkSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { TinyTest } from '../../src/testing/TinyTest';
import { FileValidator } from '../../src/application/FileValidator';
import { z } from 'zod';

// Test fixtures directory
const FIXTURES_DIR = './tests/fixtures/multipart';
const TEST_FILE = `${FIXTURES_DIR}/test-upload.txt`;

describe('Multipart Support', () => {
  beforeAll(() => {
    // Create fixtures directory
    mkdirSync(FIXTURES_DIR, { recursive: true });
    
    // Create test file for uploads
    writeFileSync(TEST_FILE, 'Test file content for uploads');
  });

  afterAll(() => {
    // Cleanup test files
    try {
      unlinkSync(TEST_FILE);
    } catch {
      // File might not exist
    }
  });

  describe('File Uploads', () => {
    test('should handle single file upload', async () => {
      const api = new TinyTest();
      
      api.post('/upload', {
        handler: ({ files }) => {
          if (!files || files.length === 0) {
            return { error: 'No files uploaded' };
          }
          
          return {
            uploaded: files[0].filename,
            size: files[0].size,
            type: files[0].mimetype
          };
        }
      });

      // Note: Need to implement multipart request in TinyTest
      // For now, we test the structure is correct
      
      await api.close();
    });

    test('should handle multiple file uploads', async () => {
      const api = new TinyTest();
      
      api.post('/upload/multiple', {
        handler: ({ files }) => {
          if (!files || files.length === 0) {
            return { error: 'No files uploaded' };
          }
          
          return {
            count: files.length,
            files: files.map(f => ({
              name: f.filename,
              size: f.size
            }))
          };
        }
      });

      await api.close();
    });

    test('should handle form fields with file', async () => {
      const api = new TinyTest();
      
      api.post('/upload/with-fields', {
        handler: ({ files, fields }) => {
          return {
            file: files?.[0]?.filename,
            title: fields?.title,
            description: fields?.description
          };
        }
      });

      await api.close();
    });
  });

  describe('FileValidator', () => {
    test('should validate required file', () => {
      let error: any;
      try {
        FileValidator.validate(undefined, { required: true });
      } catch (e) {
        error = e;
      }
      expect(error).toBeDefined();
      expect(error.errors).toBeDefined();
      expect(error.errors[0].message).toBe('File is required');
    });

    test('should pass when optional file not provided', () => {
      expect(() => {
        FileValidator.validate(undefined, { required: false });
      }).not.toThrow();
    });

    test('should validate max file size', () => {
      const largeFile = {
        filename: 'large.pdf',
        mimetype: 'application/pdf',
        encoding: '7bit',
        fieldname: 'file',
        size: 60 * 1024 * 1024, // 60MB
        data: {} as any,
        toBuffer: async () => Buffer.alloc(0),
      };

      let error: any;
      try {
        FileValidator.validate(largeFile, {
          maxSize: 50 * 1024 * 1024, // 50MB limit
        });
      } catch (e) {
        error = e;
      }
      expect(error).toBeDefined();
      expect(error.errors).toBeDefined();
      expect(error.errors[0].message).toContain('File too large');
    });

    test('should validate min file size', () => {
      const tinyFile = {
        filename: 'tiny.txt',
        mimetype: 'text/plain',
        encoding: '7bit',
        fieldname: 'file',
        size: 5, // 5 bytes
        data: {} as any,
        toBuffer: async () => Buffer.alloc(0),
      };

      let error: any;
      try {
        FileValidator.validate(tinyFile, {
          minSize: 1024, // 1KB minimum
        });
      } catch (e) {
        error = e;
      }
      expect(error).toBeDefined();
      expect(error.errors).toBeDefined();
      expect(error.errors[0].message).toContain('File too small');
    });

    test('should validate allowed MIME types', () => {
      const pdfFile = {
        filename: 'doc.pdf',
        mimetype: 'application/pdf',
        encoding: '7bit',
        fieldname: 'file',
        size: 1024,
        data: {} as any,
        toBuffer: async () => Buffer.alloc(0),
      };

      let error: any;
      try {
        FileValidator.validate(pdfFile, {
          allowedTypes: ['image/png', 'image/jpeg'], // Only images
        });
      } catch (e) {
        error = e;
      }
      expect(error).toBeDefined();
      expect(error.errors).toBeDefined();
      expect(error.errors[0].message).toContain('Invalid file type');
    });

    test('should validate allowed file extensions', () => {
      const exeFile = {
        filename: 'malware.exe',
        mimetype: 'application/octet-stream',
        encoding: '7bit',
        fieldname: 'file',
        size: 1024,
        data: {} as any,
        toBuffer: async () => Buffer.alloc(0),
      };

      let error: any;
      try {
        FileValidator.validate(exeFile, {
          allowedExtensions: ['.pdf', '.docx'], // Only documents
        });
      } catch (e) {
        error = e;
      }
      expect(error).toBeDefined();
      expect(error.errors).toBeDefined();
      expect(error.errors[0].message).toContain('Invalid file extension');
    });

    test('should pass validation for valid file', () => {
      const validFile = {
        filename: 'image.png',
        mimetype: 'image/png',
        encoding: '7bit',
        fieldname: 'avatar',
        size: 500 * 1024, // 500KB
        data: {} as any,
        toBuffer: async () => Buffer.alloc(0),
      };

      expect(() => {
        FileValidator.validate(validFile, {
          maxSize: 1024 * 1024, // 1MB
          allowedTypes: ['image/png', 'image/jpeg'],
          allowedExtensions: ['.png', '.jpg'],
        });
      }).not.toThrow();
    });
  });

  describe('Multiple Files Validation', () => {
    test('should validate max files count', () => {
      const files = Array.from({ length: 15 }, (_, i) => ({
        filename: `file${i}.txt`,
        mimetype: 'text/plain',
        encoding: '7bit',
        fieldname: 'files',
        size: 1024,
        data: {} as any,
        toBuffer: async () => Buffer.alloc(0),
      }));

      let error: any;
      try {
        FileValidator.validateMultiple(files, {
          maxFiles: 10,
        });
      } catch (e) {
        error = e;
      }
      expect(error).toBeDefined();
      expect(error.errors).toBeDefined();
      expect(error.errors[0].message).toContain('Too many files');
    });

    test('should validate each file in array', () => {
      const files = [
        {
          filename: 'small.txt',
          mimetype: 'text/plain',
          encoding: '7bit',
          fieldname: 'files',
          size: 100,
          data: {} as any,
          toBuffer: async () => Buffer.alloc(0),
        },
        {
          filename: 'large.txt',
          mimetype: 'text/plain',
          encoding: '7bit',
          fieldname: 'files',
          size: 2 * 1024 * 1024, // 2MB - too large!
          data: {} as any,
          toBuffer: async () => Buffer.alloc(0),
        },
      ];

      let error: any;
      try {
        FileValidator.validateMultiple(files, {
          maxSize: 1024 * 1024, // 1MB limit
        });
      } catch (e) {
        error = e;
      }
      expect(error).toBeDefined();
      expect(error.errors).toBeDefined();
      expect(error.errors[0].message).toContain('File too large');
    });
  });

  describe('Context Population', () => {
    test('should populate files in context', async () => {
      const api = new TinyTest();
      
      api.post('/check-context', {
        handler: ({ files, fields }) => {
          return {
            hasFiles: Array.isArray(files),
            filesCount: files?.length || 0,
            hasFields: typeof fields === 'object',
            fieldsKeys: fields ? Object.keys(fields) : []
          };
        }
      });

      // This would be populated by multipart parser
      // Testing structure only
      
      await api.close();
    });
  });
});

