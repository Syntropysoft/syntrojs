/**
 * FileValidator - Application Service
 *
 * Responsibility: Validate uploaded files
 * Pattern: Singleton (Module Pattern)
 * Principles: SOLID (Single Responsibility), Guard Clauses, Fail Fast
 */

import { ValidationException } from '../domain/HTTPException';
import type { UploadedFile } from '../domain/types';

/**
 * File validation constraints
 */
export interface FileConstraints {
  /** Maximum file size in bytes */
  maxSize?: number;

  /** Minimum file size in bytes */
  minSize?: number;

  /** Allowed MIME types (e.g., ['image/png', 'image/jpeg']) */
  allowedTypes?: string[];

  /** Allowed file extensions (e.g., ['.png', '.jpg']) */
  allowedExtensions?: string[];

  /** Is file required? */
  required?: boolean;

  /** Maximum number of files */
  maxFiles?: number;
}

/**
 * File validator implementation
 */
class FileValidatorImpl {
  /**
   * Validate a single uploaded file
   *
   * @param file - File to validate
   * @param constraints - Validation constraints
   * @throws ValidationException if file doesn't meet constraints
   */
  validate(file: UploadedFile | undefined, constraints: FileConstraints): void {
    // Guard: required file
    if (constraints.required && !file) {
      throw new ValidationException([
        {
          field: 'file',
          message: 'File is required',
        },
      ]);
    }

    // If file is optional and not provided, skip validation
    if (!file) {
      return;
    }

    // Guard: max size
    if (constraints.maxSize && file.size > constraints.maxSize) {
      throw new ValidationException([
        {
          field: file.fieldname,
          message: `File too large: ${this.formatBytes(file.size)} (max ${this.formatBytes(constraints.maxSize)})`,
        },
      ]);
    }

    // Guard: min size
    if (constraints.minSize && file.size < constraints.minSize) {
      throw new ValidationException([
        {
          field: file.fieldname,
          message: `File too small: ${this.formatBytes(file.size)} (min ${this.formatBytes(constraints.minSize)})`,
        },
      ]);
    }

    // Guard: allowed MIME types
    if (constraints.allowedTypes && constraints.allowedTypes.length > 0) {
      if (!constraints.allowedTypes.includes(file.mimetype)) {
        throw new ValidationException([
          {
            field: file.fieldname,
            message: `Invalid file type: ${file.mimetype} (allowed: ${constraints.allowedTypes.join(', ')})`,
          },
        ]);
      }
    }

    // Guard: allowed extensions
    if (constraints.allowedExtensions && constraints.allowedExtensions.length > 0) {
      const extension = this.getExtension(file.filename);
      if (!constraints.allowedExtensions.includes(extension)) {
        throw new ValidationException([
          {
            field: file.fieldname,
            message: `Invalid file extension: ${extension} (allowed: ${constraints.allowedExtensions.join(', ')})`,
          },
        ]);
      }
    }
  }

  /**
   * Validate multiple uploaded files
   *
   * @param files - Files to validate
   * @param constraints - Validation constraints
   * @throws ValidationException if files don't meet constraints
   */
  validateMultiple(files: UploadedFile[] | undefined, constraints: FileConstraints): void {
    // Guard: required files
    if (constraints.required && (!files || files.length === 0)) {
      throw new ValidationException([
        {
          field: 'files',
          message: 'At least one file is required',
        },
      ]);
    }

    // If files are optional and not provided, skip validation
    if (!files || files.length === 0) {
      return;
    }

    // Guard: max files
    if (constraints.maxFiles && files.length > constraints.maxFiles) {
      throw new ValidationException([
        {
          field: 'files',
          message: `Too many files: ${files.length} (max ${constraints.maxFiles})`,
        },
      ]);
    }

    // Validate each file
    for (const file of files) {
      this.validate(file, constraints);
    }
  }

  /**
   * Get file extension (with dot)
   *
   * Pure function
   *
   * @param filename - Filename
   * @returns Extension (e.g., '.png')
   */
  private getExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    if (lastDot === -1) {
      return '';
    }
    return filename.substring(lastDot).toLowerCase();
  }

  /**
   * Format bytes to human-readable string
   *
   * Pure function
   *
   * @param bytes - Number of bytes
   * @returns Formatted string (e.g., '1.5 MB')
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }
}

/**
 * Exported singleton (Module Pattern)
 */
class FileValidatorSingleton {
  private static instance: FileValidatorImpl = new FileValidatorImpl();

  static validate(file: UploadedFile | undefined, constraints: FileConstraints): void {
    return FileValidatorSingleton.instance.validate(file, constraints);
  }

  static validateMultiple(files: UploadedFile[] | undefined, constraints: FileConstraints): void {
    return FileValidatorSingleton.instance.validateMultiple(files, constraints);
  }
}

export const FileValidator = FileValidatorSingleton;

