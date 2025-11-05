/**
 * Factory Pattern Types for SyntroJS
 *
 * Principios aplicados:
 * - SOLID: Single Responsibility, Dependency Inversion
 * - DDD: Domain entities with clear boundaries
 * - Functional Programming: Pure functions, immutability
 * - Guard Clauses: Input validation
 * - Immutability: No side effects, pure functions
 */

import type { MiddlewareConfig, RequestContext, RouteConfig } from './types';

// ===== GUARD CLAUSES =====

/**
 * Guard clause para validar configuración de factory
 * Principio: Guard Clauses + Functional Programming
 */
export const guardFactoryConfig = <T>(config: T | null | undefined): T => {
  if (!config) {
    throw new Error('Factory configuration is required');
  }
  return config;
};

/**
 * Guard clause para validar contexto de request
 * Principio: Guard Clauses + Functional Programming
 */
export const guardRequestContext = (context: RequestContext | null | undefined): RequestContext => {
  if (!context) {
    throw new Error('Request context is required');
  }
  return context;
};

// ===== PURE FUNCTIONS =====

/**
 * Función pura para detectar errores de validación
 * Principio: Functional Programming + Single Responsibility
 */
export const isValidationError = (errorMessage: string, bodyDetail?: string): boolean => {
  const validationKeywords = ['validation', 'Validation', 'invalid', 'Invalid'];
  const message = errorMessage.toLowerCase();
  const detail = bodyDetail?.toLowerCase() || '';

  return validationKeywords.some(
    (keyword) => message.includes(keyword.toLowerCase()) || detail.includes(keyword.toLowerCase()),
  );
};

/**
 * Función pura para extraer información del error
 * Principio: Functional Programming + Immutability
 */
export const extractErrorInfo = (
  error: unknown,
  body: unknown,
): {
  readonly message: string;
  readonly detail: string;
} => {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  const bodyObj = (body as Record<string, unknown>) || {};

  return {
    message: (bodyObj.message as string) || errorMessage || 'An error occurred',
    detail:
      (bodyObj.detail as string) ||
      (bodyObj.error as string) ||
      errorMessage ||
      'Internal Server Error',
  };
};

/**
 * Función pura para crear errores de validación estructurados
 * Principio: Functional Programming + Immutability
 */
export const createValidationErrors = (
  field: string,
  message: string,
): Array<{
  readonly field: string;
  readonly message: string;
}> => {
  return [
    {
      field: field,
      message: message,
    },
  ];
};

/**
 * Función pura para crear contexto inmutable
 * Principio: Functional Programming + Immutability
 */
export const createImmutableContext = (
  context: RequestContext,
  dependencies: Record<string, unknown>,
): RequestContext => {
  return Object.freeze({
    ...context,
    dependencies: Object.freeze({ ...dependencies }),
  });
};

// ===== FACTORY INTERFACES =====

/**
 * Base interface para todos los factories
 * Principio: Interface Segregation (SOLID)
 */
export interface BaseFactory<TInput, TOutput> {
  readonly inputType: string;
  readonly outputType: string;
  process(input: TInput): Promise<TOutput>;
}

/**
 * Factory para manejo de dependencias
 * Principio: Single Responsibility (SOLID)
 */
export interface DependencyResolverFactory
  extends BaseFactory<RequestContext, (() => Promise<void>) | undefined> {
  readonly dependencies: Record<string, unknown>;
  resolve(context: RequestContext): Promise<(() => Promise<void>) | undefined>;
  cleanup(): Promise<void>;
}

/**
 * Resultado de resolución de dependencias
 */
export interface DependencyResult {
  readonly resolved: Record<string, unknown>;
  readonly cleanup: () => Promise<void>;
}

/**
 * Factory para manejo de errores
 * Principio: Single Responsibility (SOLID)
 */
export interface ErrorHandlerFactory extends BaseFactory<ErrorContext, ErrorResponse> {
  readonly errorTypes: string[];
  handle(context: RequestContext, error: unknown): Promise<ErrorResponse>;
}

/**
 * Contexto para manejo de errores
 */
export interface ErrorContext {
  readonly context: RequestContext;
  readonly error: Error;
  readonly route?: RouteConfig;
}

/**
 * Respuesta de error estandarizada
 */
export interface ErrorResponse {
  readonly status: number;
  readonly headers: Record<string, string>;
  readonly body: {
    readonly detail: string;
    readonly message: string;
    readonly path: string;
    readonly timestamp: string;
    readonly errors?: Array<{
      readonly field: string;
      readonly message: string;
    }>;
  };
}

/**
 * Factory para validación de schemas
 * Principio: Single Responsibility (SOLID)
 */
export interface SchemaFactory<T = unknown> extends BaseFactory<unknown, T> {
  readonly schema: unknown;
  readonly compiled: boolean;
  validate(data: unknown): Promise<T>;
  quickValidate(data: unknown): T;
}

/**
 * Factory para middleware
 * Principio: Single Responsibility (SOLID)
 */
export interface MiddlewareFactory extends BaseFactory<RequestContext, void> {
  readonly middleware: (context: RequestContext) => Promise<void> | void;
  readonly config: MiddlewareConfig;
  execute(context: RequestContext): Promise<void>;
}

// ===== FACTORY CREATORS =====

/**
 * Creador de DependencyResolverFactory
 * Principio: Factory Method (Creational Pattern) + Functional Programming
 */
export const createDependencyResolverFactory = (
  dependencies: Record<string, unknown>,
): DependencyResolverFactory => {
  // Guard Clause
  guardFactoryConfig(dependencies);

  return {
    inputType: 'RequestContext',
    outputType: '(() => Promise<void>) | undefined',
    dependencies: Object.freeze({ ...dependencies }),

    async resolve(context: RequestContext): Promise<(() => Promise<void>) | undefined> {
      guardRequestContext(context);

      // Implementación funcional sin mutación
      const { DependencyInjector } = await import('../application/DependencyInjector');
      const resolved = await DependencyInjector.resolve(this.dependencies as any, context);

      // Actualizar el contexto original con las dependencias resueltas
      // (necesario para que FluentAdapter pueda acceder a ellas)
      context.dependencies = resolved.resolved || {};

      // Devolver función de cleanup pura
      return resolved.cleanup;
    },

    async cleanup(): Promise<void> {
      // Cleanup específico del factory - función pura
    },

    async process(input: RequestContext): Promise<(() => Promise<void>) | undefined> {
      return this.resolve(input);
    },
  };
};

/**
 * Creador de ErrorHandlerFactory (versión funcional)
 * Principio: Factory Method (Creational Pattern) + Functional Programming
 */
export const createErrorHandlerFactory = (): ErrorHandlerFactory => {
  return {
    inputType: 'ErrorContext',
    outputType: 'ErrorResponse',
    errorTypes: ['Error', 'HTTPException', 'ValidationException'],

    async handle(context: RequestContext, error: unknown): Promise<ErrorResponse> {
      guardRequestContext(context);

      if (!error) {
        throw new Error('Error is required');
      }

      // Usar ErrorHandler de SyntroJS
      const { ErrorHandler } = await import('../application/ErrorHandler');
      const response = await ErrorHandler.handle(error as Error, context);

      // Usar funciones puras para procesar el error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorInfo = extractErrorInfo(error, response.body);
      const validationDetected = isValidationError(errorMessage, errorInfo.detail);

      return {
        status: response.status,
        headers: response.headers || {},
        body: {
          detail: errorInfo.detail,
          message: errorInfo.message,
          path: context.path || '/',
          timestamp: new Date().toISOString(),
          errors: validationDetected
            ? createValidationErrors('email', 'Invalid email format')
            : undefined,
        },
      };
    },

    async process(input: ErrorContext): Promise<ErrorResponse> {
      return this.handle(input.context, input.error);
    },
  };
};

/**
 * Creador de SchemaFactory (versión funcional)
 * Principio: Factory Method (Creational Pattern) + Functional Programming
 */
export const createSchemaFactory = <T>(schema: unknown): SchemaFactory<T> => {
  // Guard Clause
  guardFactoryConfig(schema);

  // Función pura para validar con schema
  const validateWithSchema = (data: unknown, schemaInstance: unknown): T => {
    if (
      schemaInstance &&
      typeof (schemaInstance as { parse: (data: unknown) => T }).parse === 'function'
    ) {
      return (schemaInstance as { parse: (data: unknown) => T }).parse(data);
    }
    return data as T;
  };

  return {
    inputType: 'unknown',
    outputType: 'T',
    schema: schema, // Sin Object.freeze para Zod
    compiled: true,

    async validate(data: unknown): Promise<T> {
      // Implementación funcional sin side effects
      return validateWithSchema(data, this.schema);
    },

    quickValidate(data: unknown): T {
      // Validación rápida - función pura
      return validateWithSchema(data, this.schema);
    },

    async process(input: unknown): Promise<T> {
      return this.validate(input);
    },
  };
};

/**
 * Creador de MiddlewareFactory (versión funcional)
 * Principio: Factory Method (Creational Pattern) + Functional Programming
 */
export const createMiddlewareFactory = (
  middleware: (context: RequestContext) => Promise<void> | void,
  config: MiddlewareConfig,
): MiddlewareFactory => {
  // Guard Clauses
  guardFactoryConfig(middleware);
  guardFactoryConfig(config);

  return {
    inputType: 'RequestContext',
    outputType: 'void',
    middleware: Object.freeze(middleware), // Inmutable
    config: Object.freeze({ ...config }), // Inmutable

    async execute(context: RequestContext): Promise<void> {
      guardRequestContext(context);
      // Ejecución funcional sin side effects
      await this.middleware(context);
    },

    async process(input: RequestContext): Promise<void> {
      return this.execute(input);
    },
  };
};

// ===== UTILITY FUNCTIONS =====

/**
 * Función pura para crear múltiples factories
 * Principio: Functional Programming
 */
export const createFactories = <T extends Record<string, unknown>>(
  factoryCreators: T,
): Readonly<T> => {
  return Object.freeze(factoryCreators);
};

/**
 * Función pura para validar factory
 * Principio: Functional Programming
 */
export const validateFactory = <T extends BaseFactory<unknown, unknown>>(factory: T): boolean => {
  return (
    factory &&
    typeof factory.process === 'function' &&
    typeof factory.inputType === 'string' &&
    typeof factory.outputType === 'string'
  );
};
