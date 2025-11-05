/**
 * SchemaValidator - Application Service
 *
 * Responsibility: Validate data against Zod schemas
 * Pattern: Singleton (Module Pattern)
 * Principles: SOLID (Single Responsibility), Guard Clauses, Functional
 */

import type { ZodError, ZodSchema } from 'zod';
import { ZodObject } from 'zod';
import { ValidationException } from '../domain/HTTPException';

/**
 * Validation result (Functional - Railway Oriented Programming)
 */
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: Array<{ field: string; message: string }> };

/**
 * Schema validator implementation
 */
class SchemaValidatorImpl {
  /**
   * Validates data against a Zod schema
   *
   * Pure function: same input → same output, no side effects
   *
   * @param schema - Zod schema to validate against
   * @param data - Data to validate
   * @returns Validation result
   */
  validate<T>(schema: ZodSchema<T>, data: unknown): ValidationResult<T> {
    // Guard clause: schema required
    if (!schema) {
      throw new Error('Schema is required');
    }

    // Validate with Zod (safeParse doesn't throw)
    const result = schema.safeParse(data);

    // Railway pattern: success or failure
    if (result.success) {
      return {
        success: true,
        data: result.data,
      };
    }

    // Transform Zod errors to simple format
    // Explicitly cast result.error to ZodError to satisfy TypeScript
    const errors = this.formatZodErrors(result.error as ZodError);

    return {
      success: false as const, // Explicitly define as literal 'false'
      errors,
    };
  }

  /**
   * Validates data and throws exception if validation fails
   *
   * @param schema - Zod schema
   * @param data - Data to validate
   * @returns Validated data
   * @throws ValidationException if validation fails
   */
  validateOrThrow<T>(schema: ZodSchema<T>, data: unknown): T {
    // Guard clause
    if (!schema) {
      throw new Error('Schema is required');
    }

    const result = this.validate(schema, data);

    // Guard clause: throw if fails
    if (!result.success) {
      throw new ValidationException(result.errors);
    }

    // Happy path
    return result.data;
  }

  /**
   * Validates multiple data against their schemas
   *
   * Functional: processes array without mutation
   *
   * @param validations - Array of {schema, data} tuples
   * @returns Array of validation results
   */
  validateMany(
    validations: ReadonlyArray<{ schema: ZodSchema; data: unknown }>,
  ): ReadonlyArray<ValidationResult<unknown>> {
    // Guard clause
    if (!validations) {
      throw new Error('Validations array is required');
    }

    // Functional programming: map (doesn't mutate)
    return validations.map(({ schema, data }) => this.validate(schema, data));
  }

  /**
   * Checks if data is valid according to schema
   *
   * @param schema - Zod schema
   * @param data - Data to check
   * @returns true if valid, false otherwise
   */
  isValid<T>(schema: ZodSchema<T>, data: unknown): boolean {
    // Guard clause
    if (!schema) {
      throw new Error('Schema is required');
    }

    const result = this.validate(schema, data);
    return result.success;
  }

  /**
   * Formats Zod errors to simple format
   *
   * Pure function: transforms ZodError to simple array
   *
   * @param error - Zod error
   * @returns Array of formatted errors
   */
  private formatZodErrors(error: ZodError): Array<{ field: string; message: string }> {
    // Functional programming: map to transform
    return error.errors.map((err) => ({
      field: err.path.join('.') || 'root',
      message: err.message,
    }));
  }

  /**
   * Validates partially (only present fields)
   *
   * @param schema - Zod schema
   * @param data - Partial data to validate
   * @returns Validation result
   */
  validatePartial<T>(schema: ZodSchema<T>, data: unknown): ValidationResult<Partial<T>> {
    // Guard clause
    if (!schema) {
      throw new Error('Schema is required');
    }

    // Zod supports partial() for partial validation
    if (!(schema instanceof ZodObject)) {
      throw new Error('Schema must be a ZodObject to be partially validated');
    }
    const partialSchema = schema.partial();

    return this.validate(partialSchema, data) as ValidationResult<Partial<T>>;
  }

  /**
   * Extracts default values from schema
   *
   * @param schema - Zod schema
   * @returns Object with default values or undefined
   */
  getDefaults<T>(schema: ZodSchema<T>): Partial<T> | undefined {
    // Guard clause
    if (!schema) {
      throw new Error('Schema is required');
    }

    try {
      // Try parsing empty object to get defaults
      const result = (schema as ZodSchema<T>).safeParse({});

      if (result.success) {
        return result.data as Partial<T>;
      }

      return undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Validates and transforms data in a single step
   *
   * Functional: composition of validation + transformation
   *
   * @param schema - Zod schema
   * @param data - Data to validate
   * @param transform - Transformation function
   * @returns Transformed result or errors
   */
  validateAndTransform<T, R>(
    schema: ZodSchema<T>,
    data: unknown,
    transform: (validated: T) => R,
  ): ValidationResult<R> {
    // Guard clauses
    if (!schema) {
      throw new Error('Schema is required');
    }

    if (!transform) {
      throw new Error('Transform function is required');
    }

    const result = this.validate(schema, data);

    // Railway pattern: if validation fails, return error
    if (!result.success) {
      return result;
    }

    // Happy path: transform validated data
    try {
      const transformed = transform(result.data);

      return {
        success: true,
        data: transformed,
      };
    } catch (error) {
      // If transform fails, return as validation error
      return {
        success: false,
        errors: [
          {
            field: 'transform',
            message: error instanceof Error ? error.message : 'Transformation failed',
          },
        ],
      };
    }
  }
}

/**
 * Exported singleton (Module Pattern)
 */
export const SchemaValidator = new SchemaValidatorImpl();

/**
 * Factory for testing
 */
export const createSchemaValidator = (): SchemaValidatorImpl => new SchemaValidatorImpl();
