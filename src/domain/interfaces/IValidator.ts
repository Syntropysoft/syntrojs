/**
 * IValidator - Validation Contract
 *
 * Domain Layer Interface (Dependency Inversion Principle)
 * Abstracts validation logic from implementation details (Zod, Joi, etc.)
 */

import type { ZodSchema } from 'zod';

/**
 * Validator Interface
 * Defines contract for data validation
 */
export interface IValidator {
  /**
   * Validate data against schema and throw if invalid
   * Guard clause contract: Throws on validation failure
   *
   * @param schema - Validation schema
   * @param data - Data to validate
   * @returns Validated and typed data
   * @throws ValidationException if data is invalid
   */
  validateOrThrow<T>(schema: ZodSchema, data: unknown): T;

  /**
   * Check if data is valid without throwing
   * Pure function contract: boolean result
   *
   * @param schema - Validation schema
   * @param data - Data to validate
   * @returns True if valid, false otherwise
   */
  isValid(schema: ZodSchema, data: unknown): boolean;
}

