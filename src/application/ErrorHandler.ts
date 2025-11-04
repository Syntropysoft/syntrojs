/**
 * ErrorHandler - Application Service
 *
 * Responsibility: Handle exceptions and convert to HTTP responses
 * Pattern: Singleton (Module Pattern)
 * Principles: SOLID (Single Responsibility), Guard Clauses, Functional
 */

import { z } from 'zod';
import {
  HTTPException,
  ValidationException,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
  InternalServerException,
  ServiceUnavailableException,
} from '../domain/HTTPException';
import type { ExceptionHandler, RequestContext, RouteResponse } from '../domain/types';
import { getComponentLogger } from '../infrastructure/LoggerHelper';
import { buildGenericErrorResponse, buildUnhandledErrorResponse } from './ErrorResponseBuilder';

/**
 * Error handler implementation
 */
class ErrorHandlerImpl {
  // Immutable: Map is never replaced
  private readonly handlers = new Map<new (...args: any[]) => Error, ExceptionHandler>();

  constructor() {
    // No default handlers registered
    // We use structural typing (statusCode check) instead for reliability
    // Custom handlers can be registered via .register() for overrides
    // This avoids the instanceof paradox with dynamic imports
  }

  /**
   * Registers a custom exception handler
   *
   * @param errorClass - Error class constructor
   * @param handler - Handler function
   */
  register<E extends Error>(
    errorClass: new (...args: any[]) => E,
    handler: ExceptionHandler<E>,
  ): void {
    // Guard clauses
    if (!errorClass) {
      throw new Error('Error class is required');
    }

    if (!handler) {
      throw new Error('Handler function is required');
    }

    // Happy path
    this.handlers.set(errorClass, handler as ExceptionHandler);
  }

  /**
   * Handles an error and converts it to HTTP response
   *
   * @param error - Error to handle
   * @param context - Request context
   * @returns HTTP response
   */
  async handle(error: Error, context: RequestContext): Promise<RouteResponse> {
    // Guard clauses
    if (!error) {
      throw new Error('Error is required');
    }

    if (!context) {
      throw new Error('Context is required');
    }

    // PRIORITY 1: Check for custom handlers registered with .register()
    // This allows users to override default behavior (NestJS style)
    // Uses findHandlerByNameOrInstance which works with both instanceof AND class name matching
    // This handles dynamic imports by matching class names when instanceof fails
    const customHandler = this.findHandlerByNameOrInstance(error);
    if (customHandler) {
      return await customHandler(context, error);
    }

    // PRIORITY 2: Check for HTTPException with statusCode (NestJS-style)
    // This handles ALL HTTPException subclasses when no custom handler is registered
    // CRITICAL: Structural typing works across module boundaries
    // Dynamic imports break instanceof checks, so we rely on statusCode property
    if ((error as any).statusCode !== undefined) {
      const httpError = error as HTTPException;
      
      // Check if it's ValidationException (has errors array)
      if (
        error.name === 'ValidationException' ||
        error.constructor?.name === 'ValidationException' ||
        (httpError as any).errors
      ) {
        const validationError = error as ValidationException;
        return {
          status: 422,
          body: {
            detail: validationError.detail,
            errors: validationError.errors,
            path: context.path,
          },
        };
      }
      
      // Generic HTTPException (uses statusCode)
      return {
        status: httpError.statusCode,
        body: {
          detail: httpError.detail,
          path: context.path,
        },
        headers: httpError.headers,
      };
    }

    // PRIORITY 3: Fallback instanceof checks for specific exceptions
    // Note: These may fail with dynamic imports, but kept for backward compatibility
    
    // 422 - ValidationException (most specific, has special errors array)
    if (
      error instanceof ValidationException ||
      error.name === 'ValidationException' ||
      error.constructor?.name === 'ValidationException'
    ) {
      const validationError = error as ValidationException;
      return {
        status: 422,
        body: {
          detail: validationError.detail,
          errors: validationError.errors,
          path: context.path,
        },
      };
    }

    // 400 - BadRequestException
    if (
      error instanceof BadRequestException ||
      error.name === 'BadRequestException' ||
      error.constructor?.name === 'BadRequestException'
    ) {
      const badRequest = error as BadRequestException;
      return {
        status: 400,
        body: {
          detail: badRequest.detail,
          path: context.path,
        },
        headers: badRequest.headers,
      };
    }

    // 401 - UnauthorizedException
    if (
      error instanceof UnauthorizedException ||
      error.name === 'UnauthorizedException' ||
      error.constructor?.name === 'UnauthorizedException'
    ) {
      const unauthorized = error as UnauthorizedException;
      return {
        status: 401,
        body: {
          detail: unauthorized.detail,
          path: context.path,
        },
        headers: unauthorized.headers,
      };
    }

    // 403 - ForbiddenException
    if (
      error instanceof ForbiddenException ||
      error.name === 'ForbiddenException' ||
      error.constructor?.name === 'ForbiddenException'
    ) {
      const forbidden = error as ForbiddenException;
      return {
        status: 403,
        body: {
          detail: forbidden.detail,
          path: context.path,
        },
        headers: forbidden.headers,
      };
    }

    // 404 - NotFoundException
    if (
      error instanceof NotFoundException ||
      error.name === 'NotFoundException' ||
      error.constructor?.name === 'NotFoundException'
    ) {
      const notFound = error as NotFoundException;
      return {
        status: 404,
        body: {
          detail: notFound.detail,
          path: context.path,
        },
        headers: notFound.headers,
      };
    }

    // 409 - ConflictException
    if (error instanceof ConflictException) {
      const conflict = error as ConflictException;
      return {
        status: 409,
        body: {
          detail: conflict.detail,
          path: context.path,
        },
        headers: conflict.headers,
      };
    }

    // 500 - InternalServerException
    if (error instanceof InternalServerException) {
      const internal = error as InternalServerException;
      return {
        status: 500,
        body: {
          detail: internal.detail,
          path: context.path,
        },
        headers: internal.headers,
      };
    }

    // 503 - ServiceUnavailableException
    if (error instanceof ServiceUnavailableException) {
      const unavailable = error as ServiceUnavailableException;
      return {
        status: 503,
        body: {
          detail: unavailable.detail,
          path: context.path,
        },
        headers: unavailable.headers,
      };
    }

    // Generic HTTPException (catches any HTTPException not caught above)
    if (
      error instanceof HTTPException ||
      error.name === 'HTTPException' ||
      error.constructor?.name === 'HTTPException' ||
      (error as any).statusCode !== undefined
    ) {
      const httpError = error as HTTPException;
      return {
        status: httpError.statusCode,
        body: {
          detail: httpError.detail,
          path: context.path,
        },
        headers: httpError.headers,
      };
    }

    // ZodError handler (422)
    if (error instanceof z.ZodError || error.name === 'ZodError' || error.constructor?.name === 'ZodError') {
      const zodError = error as z.ZodError;
      return {
        status: 422,
        body: {
          detail: 'Validation Error',
          errors: zodError.errors.map((err) => ({
            field: err.path.join('.'),
            ...err,
          })),
          path: context.path,
        },
      };
    }

    // Fallback: use generic error handler
    return this.handleGenericError(error, context);
  }

  /**
   * Finds handler by name or instanceof (for dynamic import compatibility)
   * 
   * Strategy: Try instanceof first, then fallback to class name matching
   * This handles both regular imports and dynamic imports
   *
   * @param error - Error instance
   * @returns Handler if found, undefined otherwise
   */
  private findHandlerByNameOrInstance(error: Error): ExceptionHandler | undefined {
    // First try: instanceof (works for regular imports)
    const instanceofMatch = this.findHandler(error);
    if (instanceofMatch) {
      return instanceofMatch;
    }

    // Second try: Match by class name (works for dynamic imports)
    const errorClassName = error.constructor?.name || error.name;
    
    for (const [errorClass, handler] of this.handlers.entries()) {
      if (errorClass.name === errorClassName) {
        return handler;
      }
    }

    return undefined;
  }

  /**
   * Finds the appropriate handler for an error using instanceof
   *
   * Pure function: searches for handler without side effects
   * Finds the MOST SPECIFIC handler in the inheritance chain
   *
   * @param error - Error instance
   * @returns Handler if found, undefined otherwise
   */
  private findHandler(error: Error): ExceptionHandler | undefined {
    // Find all matching handlers in inheritance chain using instanceof
    const matches: Array<{ errorClass: new (...args: any[]) => Error; handler: ExceptionHandler }> =
      [];

    for (const [errorClass, handler] of this.handlers.entries()) {
      if (error instanceof errorClass) {
        matches.push({ errorClass, handler });
      }
    }

    // If no matches, return undefined
    if (matches.length === 0) {
      return undefined;
    }

    // If only one match, return it
    if (matches.length === 1) {
      return matches[0]?.handler;
    }

    // Multiple matches: find most specific (child class wins over parent class)
    // Strategy: Find the class that is the deepest in the inheritance chain
    // (the one that is NOT a parent of any other matched class)
    
    // Filter out generic Error handler (only use it as last resort)
    const specificMatches = matches.filter((m) => m.errorClass !== Error);
    
    if (specificMatches.length === 0) {
      // Only Error handler matched - return it
      return matches.find((m) => m.errorClass === Error)?.handler;
    }

    // If only one specific handler, return it
    if (specificMatches.length === 1) {
      return specificMatches[0]?.handler;
    }

    // Multiple specific handlers: find most specific by checking prototype chain
    // The most specific is the one that is the CHILD of all others (deepest in inheritance)
    // Strategy: Find the class that is NOT a parent of any other, but IS a child of at least one other
    
    // Sort matches by inheritance depth: child classes come after parent classes
    // Find the class that is NOT a parent of any other
    for (let i = 0; i < specificMatches.length; i++) {
      const candidate = specificMatches[i];
      if (!candidate) continue;

      let isMostSpecific = true;

      // Check if candidate is a parent of any other match
      // If candidate is parent of other, then other is more specific (child)
      for (let j = 0; j < specificMatches.length; j++) {
        if (i === j) continue;
        const other = specificMatches[j];
        if (!other) continue;

        // If candidate.prototype is in other's prototype chain, candidate is a parent
        // This means other extends candidate, so candidate is NOT most specific
        const candidateIsParent = candidate.errorClass.prototype.isPrototypeOf(
          other.errorClass.prototype,
        );
        if (candidateIsParent) {
          isMostSpecific = false;
          break;
        }
      }

      if (isMostSpecific) {
        // Found the most specific handler (child class, not a parent of any other)
        return candidate.handler;
      }
    }

    // Fallback: if no clear winner, return the first one (shouldn't happen with proper inheritance)
    return specificMatches[0]?.handler;
  }

  /**
   * Registers default exception handlers
   * Called on initialization
   */
  private registerDefaultHandlers(): void {
    // DISABLED: Default handlers removed to avoid instanceof paradox with dynamic imports
    // We use structural typing (statusCode check) instead, which works reliably
    // Custom handlers can still be registered via .register() for overrides
    // All handler logic is now in the handle() method using statusCode property
    return;

    // 400 - BadRequestException
    this.register(BadRequestException, (context, error) => {
      const badRequest = error as BadRequestException;
      return {
        status: 400,
        body: {
          detail: badRequest.detail,
          path: context.path,
        },
        headers: badRequest.headers,
      };
    });

    // 401 - UnauthorizedException
    this.register(UnauthorizedException, (context, error) => {
      const unauthorized = error as UnauthorizedException;
      return {
        status: 401,
        body: {
          detail: unauthorized.detail,
          path: context.path,
        },
        headers: unauthorized.headers,
      };
    });

    // 403 - ForbiddenException
    this.register(ForbiddenException, (context, error) => {
      const forbidden = error as ForbiddenException;
      return {
        status: 403,
        body: {
          detail: forbidden.detail,
          path: context.path,
        },
        headers: forbidden.headers,
      };
    });

    // 404 - NotFoundException
    this.register(NotFoundException, (context, error) => {
      const notFound = error as NotFoundException;
      return {
        status: 404,
        body: {
          detail: notFound.detail,
          path: context.path,
        },
        headers: notFound.headers,
      };
    });

    // 409 - ConflictException
    this.register(ConflictException, (context, error) => {
      const conflict = error as ConflictException;
      return {
        status: 409,
        body: {
          detail: conflict.detail,
          path: context.path,
        },
        headers: conflict.headers,
      };
    });

    // 500 - InternalServerException
    this.register(InternalServerException, (context, error) => {
      const internal = error as InternalServerException;
      return {
        status: 500,
        body: {
          detail: internal.detail,
          path: context.path,
        },
        headers: internal.headers,
      };
    });

    // 503 - ServiceUnavailableException
    this.register(ServiceUnavailableException, (context, error) => {
      const unavailable = error as ServiceUnavailableException;
      return {
        status: 503,
        body: {
          detail: unavailable.detail,
          path: context.path,
        },
        headers: unavailable.headers,
      };
    });

    // Generic HTTPException handler - catches any HTTPException without specific handler
    // Register AFTER all specific exceptions
    this.register(HTTPException, (context, error) => {
      const httpError = error as HTTPException;
      return {
        status: httpError.statusCode,
        body: {
          detail: httpError.detail,
          path: context.path,
        },
        headers: httpError.headers,
      };
    });

    // ZodError handler (422) - Convert ZodError to ValidationException format
    this.register(z.ZodError, (context, error) => {
      const zodError = error as z.ZodError;

      return {
        status: 422,
        body: {
          detail: 'Validation Error',
          errors: zodError.errors.map((err) => ({
            field: err.path.join('.'),
            ...err,
          })),
          path: context.path,
        },
      };
    });

    // Generic Error handler - uses ErrorResponseBuilder (Strategy Pattern)
    // Note: This should be the last fallback, but only for truly unhandled errors
    // HTTPException and ValidationException should be caught by their specific handlers
    this.register(Error, (context, error) => {
      // Log error for debugging
      const logger = getComponentLogger('error-handler');
      logger.error(
        {
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
          },
          path: context.path,
          method: context.method,
        },
        'Unhandled error in request handler',
      );

      return buildGenericErrorResponse(error, context);
    });
  }

  /**
   * Handles generic errors not matched by specific handlers
   * Uses ErrorResponseBuilder for consistent error responses
   *
   * @param error - Error instance
   * @param context - Request context
   * @returns Generic 500 response
   */
  private handleGenericError(error: Error, context: RequestContext): RouteResponse {
    // Guard clause: validate error
    if (!error) {
      throw new Error('Error is required');
    }

    // Log error for debugging
    const logger = getComponentLogger('error-handler');
    logger.error(
      {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        path: context.path,
        method: context.method,
      },
      'Unhandled generic error',
    );

    // Use ErrorResponseBuilder for consistent error responses
    return buildUnhandledErrorResponse(error, context);
  }

  /**
   * Checks if a handler is registered for an error class
   *
   * @param errorClass - Error class to check
   * @returns true if handler exists
   */
  hasHandler(errorClass: new (...args: any[]) => Error): boolean {
    // Guard clause
    if (!errorClass) {
      throw new Error('Error class is required');
    }

    return this.handlers.has(errorClass);
  }

  /**
   * Gets all registered error classes
   *
   * @returns Immutable array of error classes
   */
  getRegisteredErrorClasses(): ReadonlyArray<new (...args: any[]) => Error> {
    return [...this.handlers.keys()];
  }

  /**
   * Clears all custom handlers (keeps defaults)
   * Useful for testing
   */
  clearCustomHandlers(): void {
    this.handlers.clear();
    this.registerDefaultHandlers();
  }
}

/**
 * Exported singleton (Module Pattern)
 */
export const ErrorHandler = new ErrorHandlerImpl();

/**
 * Factory for testing
 */
export const createErrorHandler = (): ErrorHandlerImpl => new ErrorHandlerImpl();
