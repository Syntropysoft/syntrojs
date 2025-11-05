/**
 * MultipartParser - Application Service
 *
 * Responsibility: Parse multipart form data across different runtimes
 * Pattern: Singleton (Module Pattern)
 * Principles: SOLID (Single Responsibility), Guard Clauses, Functional Programming
 */

import { Readable } from 'node:stream';
import type { RequestContext, UploadedFile } from '../domain/types';

/**
 * Multipart parser implementation
 *
 * Handles multipart/form-data parsing for both:
 * - Node.js (via Fastify's request.parts())
 * - Bun (via Web API FormData)
 */
class MultipartParserImpl {
  /**
   * Parse multipart data from Fastify request (Node.js runtime)
   *
   * Pure function: Only transforms input to output, no side effects
   * Guard clauses: Validates all inputs before processing
   *
   * @param request - Fastify request with parts() method
   * @param context - Request context to populate with files/fields
   */
  async parseFastify(request: any, context: RequestContext): Promise<void> {
    // Guard clause: validate request
    if (!request) {
      throw new Error('Request is required');
    }

    // Guard clause: validate context
    if (!context) {
      throw new Error('Context is required');
    }

    // Guard clause: check if multipart
    if (!request.isMultipart?.()) {
      return; // Not multipart, skip parsing
    }

    const files: UploadedFile[] = [];
    const fields: Record<string, string> = {};

    try {
      const parts = request.parts();

      // Functional: Process each part
      for await (const part of parts) {
        if (part.type === 'file') {
          // Process file part
          const uploadedFile = await this.processFilePart(part);
          files.push(uploadedFile);
        } else {
          // Process field part
          const { fieldname, value } = this.processFieldPart(part);
          fields[fieldname] = value;
        }
      }

      // Append files and merge fields (not replace)
      if (files.length > 0) {
        if (context.files) {
          context.files = [...context.files, ...files.map((f) => Object.freeze(f))];
        } else {
          context.files = files.map((f) => Object.freeze(f));
        }
      }

      if (Object.keys(fields).length > 0) {
        if (context.fields) {
          context.fields = { ...context.fields, ...fields };
        } else {
          context.fields = fields;
        }
      }
    } catch (_error) {
      // Guard clause: If parsing fails, don't populate context
      // This allows the route to continue without files
      return;
    }
  }

  /**
   * Parse multipart data from Bun request (Web API)
   *
   * Pure function: Only transforms input to output
   * Guard clauses: Validates all inputs
   *
   * @param request - Bun Request (Web API standard)
   * @param context - Request context to populate with files/fields
   */
  async parseBun(request: Request, context: RequestContext): Promise<void> {
    // Guard clause: validate request
    if (!request) {
      throw new Error('Request is required');
    }

    // Guard clause: validate context
    if (!context) {
      throw new Error('Context is required');
    }

    // Guard clause: check if multipart
    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('multipart/form-data')) {
      return; // Not multipart, skip parsing
    }

    const files: UploadedFile[] = [];
    const fields: Record<string, string> = {};

    try {
      // Bun's native FormData API (Web standard)
      const formData = await request.formData();

      // Functional: Process each entry
      for (const [name, value] of formData.entries()) {
        // Check if it's a File (Web API File object)
        if (value && typeof value === 'object' && 'name' in value && 'size' in value) {
          // Process file entry
          const uploadedFile = await this.processWebFile(name, value as any);
          files.push(uploadedFile);
        } else {
          // Field entry (string)
          fields[name] = String(value);
        }
      }

      // Append files and merge fields (not replace)
      if (files.length > 0) {
        if (context.files) {
          context.files = [...context.files, ...files.map((f) => Object.freeze(f))];
        } else {
          context.files = files.map((f) => Object.freeze(f));
        }
      }

      if (Object.keys(fields).length > 0) {
        if (context.fields) {
          context.fields = { ...context.fields, ...fields };
        } else {
          context.fields = fields;
        }
      }
    } catch (_error) {
      // Guard clause: If parsing fails, don't populate context
      return;
    }
  }

  /**
   * Process a file part from Fastify multipart
   *
   * Pure function: Transforms file part to UploadedFile
   *
   * @param part - Fastify file part
   * @returns UploadedFile object
   */
  private async processFilePart(part: any): Promise<UploadedFile> {
    // Guard clauses
    if (!part) {
      throw new Error('File part is required');
    }

    if (!part.filename) {
      throw new Error('Filename is required');
    }

    // Use Fastify's toBuffer() if available, otherwise read stream
    let buffer: Buffer;
    let size: number;

    if (part.toBuffer) {
      // Fastify provides toBuffer()
      buffer = await part.toBuffer();
      size = buffer.length;
    } else if (part.file) {
      // Fallback: read from stream
      const chunks: Buffer[] = [];
      for await (const chunk of part.file) {
        chunks.push(chunk);
      }
      buffer = Buffer.concat(chunks);
      size = buffer.length;
    } else {
      throw new Error('File data is required');
    }

    // Pure function: Create UploadedFile
    return {
      filename: part.filename,
      mimetype: part.mimetype,
      encoding: part.encoding,
      fieldname: part.fieldname,
      size,
      data: part.file || Readable.from([buffer]),
      toBuffer: async () => buffer,
    };
  }

  /**
   * Process a field part from Fastify multipart
   *
   * Pure function: Transforms field part to key-value pair
   *
   * @param part - Fastify field part
   * @returns Object with fieldname and value
   */
  private processFieldPart(part: any): { fieldname: string; value: string } {
    // Guard clause
    if (!part) {
      throw new Error('Field part is required');
    }

    const value = part.value;

    // Pure function: Convert value to string
    return {
      fieldname: part.fieldname,
      value: typeof value === 'string' ? value : JSON.stringify(value),
    };
  }

  /**
   * Process a Web File from Bun FormData
   *
   * Pure function: Transforms Web File to UploadedFile
   *
   * @param name - Field name
   * @param file - Web API File object
   * @returns UploadedFile object
   */
  private async processWebFile(name: string, file: any): Promise<UploadedFile> {
    // Guard clauses
    if (!name) {
      throw new Error('Field name is required');
    }

    if (!file) {
      throw new Error('File is required');
    }

    // Convert Web File to Buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Create a Readable stream from buffer for compatibility
    const { Readable } = await import('node:stream');
    const stream = Readable.from(buffer);

    // Pure function: Create UploadedFile
    return {
      filename: file.name,
      mimetype: file.type || 'application/octet-stream',
      encoding: '7bit',
      fieldname: name,
      size: file.size,
      data: stream,
      toBuffer: async () => buffer,
    };
  }
}

/**
 * Exported singleton (Module Pattern)
 */
class MultipartParserSingleton {
  private static instance: MultipartParserImpl = new MultipartParserImpl();

  static async parseFastify(request: any, context: RequestContext): Promise<void> {
    return MultipartParserSingleton.instance.parseFastify(request, context);
  }

  static async parseBun(request: Request, context: RequestContext): Promise<void> {
    return MultipartParserSingleton.instance.parseBun(request, context);
  }
}

export const MultipartParser = MultipartParserSingleton;
