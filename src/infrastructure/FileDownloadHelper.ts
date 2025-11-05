import type { Readable } from 'node:stream';
import { BadRequestException } from '../domain/HTTPException';

/**
 * File download options
 */
export interface FileDownloadOptions {
  /**
   * Filename for the downloaded file (required)
   * Must not contain path separators (/ or \)
   */
  filename: string;

  /**
   * MIME type for Content-Type header
   * Auto-detected from filename extension if not provided
   */
  mimeType?: string;

  /**
   * Content-Disposition type
   * - 'attachment': Forces download (default)
   * - 'inline': Display in browser if possible
   */
  disposition?: 'attachment' | 'inline';
}

/**
 * File download response structure
 */
export interface FileDownloadResponse {
  data: Buffer | Readable | string;
  headers: Record<string, string>;
  statusCode: number;
  __isFileDownload: true; // Marca única para detección rápida
}

/**
 * Creates a file download response with proper HTTP headers.
 *
 * This is a pure function with no side effects:
 * - Same input always produces same output
 * - No mutations
 * - No external dependencies
 *
 * Architecture:
 * - Layer: Infrastructure (HTTP protocol details)
 * - Pattern: Functional (pure function, immutable)
 * - Validation: Guard clauses (fail-fast)
 * - Coupling: Zero dependencies (only domain exceptions)
 *
 * @param data - File content (Buffer, Stream, or string)
 * @param options - Download configuration
 * @returns Immutable response object with data, headers, and status
 * @throws BadRequestException if validation fails
 *
 * @example
 * ```typescript
 * // With Buffer
 * const buffer = await readFile('./report.pdf');
 * return createFileDownload(buffer, { filename: 'report.pdf' });
 *
 * // With Stream
 * const stream = createReadStream('./video.mp4');
 * return createFileDownload(stream, {
 *   filename: 'video.mp4',
 *   mimeType: 'video/mp4'
 * });
 *
 * // Inline display
 * return createFileDownload(imageBuffer, {
 *   filename: 'preview.jpg',
 *   disposition: 'inline'
 * });
 * ```
 */
export function createFileDownload(
  data: Buffer | Readable | string,
  options: FileDownloadOptions,
): FileDownloadResponse {
  // Guard clause 1: data is required
  if (!data) {
    throw new BadRequestException('File data is required for download');
  }

  // Guard clause 2: options is required
  if (!options) {
    throw new BadRequestException('File download options are required');
  }

  // Guard clause 3: filename is required and must be a string (type check)
  if (
    options.filename === undefined ||
    options.filename === null ||
    typeof options.filename !== 'string'
  ) {
    throw new BadRequestException('Filename is required and must be a string');
  }

  // Guard clause 4: filename must be non-empty (content check - general)
  if (options.filename.trim().length === 0) {
    throw new BadRequestException('Filename cannot be empty');
  }

  // Guard clause 5: Security - prevent directory traversal patterns (specific attack)
  // Check .. FIRST - most specific/obvious attack pattern
  if (options.filename.includes('..')) {
    throw new BadRequestException('Filename must not contain .. (directory traversal)');
  }

  // Guard clause 6: Security - prevent path traversal attacks (general protection)
  // Check / and \ AFTER - could be mistake or attack
  if (options.filename.includes('/') || options.filename.includes('\\')) {
    throw new BadRequestException('Filename must not contain path separators (/ or \\)');
  }

  // Guard clause 7: disposition must be valid if provided
  if (options.disposition && !['attachment', 'inline'].includes(options.disposition)) {
    throw new BadRequestException('Disposition must be either "attachment" or "inline"');
  }

  // Pure transformations (functional composition)
  const mimeType = options.mimeType ?? detectMimeType(options.filename);
  const disposition = options.disposition ?? 'attachment';
  const sanitizedFilename = sanitizeFilename(options.filename);

  // Immutable return - no mutations, pure object construction
  return {
    data,
    statusCode: 200,
    headers: {
      'Content-Type': mimeType,
      'Content-Disposition': `${disposition}; filename="${sanitizedFilename}"`,
    },
    __isFileDownload: true as const, // Marca única para detección
  };
}

/**
 * Detects MIME type from file extension.
 * Pure function - no side effects, deterministic.
 *
 * @param filename - Filename with extension
 * @returns MIME type string
 */
function detectMimeType(filename: string): string {
  // Guard clause: require filename
  if (!filename) {
    return 'application/octet-stream';
  }

  // Pure transformation: extract extension
  const ext = filename.split('.').pop()?.toLowerCase();

  // Guard clause: no extension
  if (!ext) {
    return 'application/octet-stream';
  }

  // Immutable lookup table (const + readonly semantics)
  const mimeTypes: Record<string, string> = {
    // Documents
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',

    // Images
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    webp: 'image/webp',
    ico: 'image/x-icon',

    // Video
    mp4: 'video/mp4',
    webm: 'video/webm',
    avi: 'video/x-msvideo',
    mov: 'video/quicktime',

    // Audio
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',

    // Text
    txt: 'text/plain',
    html: 'text/html',
    css: 'text/css',
    js: 'text/javascript',
    json: 'application/json',
    xml: 'application/xml',
    csv: 'text/csv',

    // Archives
    zip: 'application/zip',
    tar: 'application/x-tar',
    gz: 'application/gzip',
    rar: 'application/vnd.rar',
    '7z': 'application/x-7z-compressed',
  };

  // Pure lookup - no mutations
  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Sanitizes filename for safe use in Content-Disposition header.
 * Pure function - escapes special characters.
 *
 * @param filename - Raw filename
 * @returns Sanitized filename safe for HTTP headers
 */
function sanitizeFilename(filename: string): string {
  // Guard clause
  if (!filename) {
    return 'download';
  }

  // Pure transformation: escape quotes
  // RFC 6266: filename should be in quotes, inner quotes must be escaped
  return filename.replace(/"/g, '\\"');
}

/**
 * Type guard: checks if value is a file download response
 * Pure function - no side effects
 *
 * @param value - Value to check
 * @returns true if value matches FileDownloadResponse structure
 */
export function isFileDownloadResponse(value: unknown): value is FileDownloadResponse {
  // Functional: check structure without mutation
  // Guard clauses for type safety - pipeline style

  // Guard 1: Must be object
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Type narrowing requires any for runtime checks
  const candidate = value as any;

  // Guard 2: Fast path - check unique marker first
  if (candidate.__isFileDownload === true) {
    return true;
  }

  // Guard 3: Fallback - check structure (for manually created objects)
  if (!('data' in candidate) || !('headers' in candidate) || !('statusCode' in candidate)) {
    return false;
  }

  // Guard 4: Headers must be object
  if (typeof candidate.headers !== 'object' || candidate.headers === null) {
    return false;
  }

  // Guard 5: Content-Disposition header must exist
  if (!('Content-Disposition' in candidate.headers)) {
    return false;
  }

  // All checks passed
  return true;
}
