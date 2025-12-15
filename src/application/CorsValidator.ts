/**
 * CORS Validator - Domain Service
 *
 * Responsibility: Validate CORS configuration and dependencies
 * Pattern: Domain Service (DDD)
 * Principles: SOLID, DDD, Functional Programming, Guard Clauses
 */

import type { CorsOptions } from '../plugins/cors';

/**
 * CORS validation result
 */
export interface CorsValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
}

/**
 * CORS configuration context
 */
export interface CorsConfigContext {
  /** CORS configuration value */
  corsConfig?: boolean | CorsOptions;
  /** Mode: 'rest' or 'lambda' */
  mode: 'rest' | 'lambda';
  /** Whether CORS is configured in fluentConfig.cors (REST mode) */
  isInFluentConfig?: boolean;
  /** Whether CORS is configured directly in config.cors (incorrect) */
  isDirectConfig?: boolean;
}

/**
 * Pure predicate: Check if CORS is enabled
 *
 * @param corsConfig - CORS configuration
 * @returns True if CORS is enabled
 */
export function isCorsEnabled(corsConfig?: boolean | CorsOptions): boolean {
  // Guard clause: no config means disabled
  if (corsConfig === undefined || corsConfig === false || corsConfig === null) {
    return false;
  }

  // Boolean true or CorsOptions object means enabled
  return true;
}

/**
 * Pure function: Validate CORS configuration structure
 *
 * @param context - CORS configuration context
 * @returns Validation result
 */
export function validateCorsConfigStructure(context: CorsConfigContext): CorsValidationResult {
  // Guard clause: validate context exists
  if (!context) {
    throw new Error('CORS configuration context is required');
  }

  // Guard clause: validate context is an object
  if (typeof context !== 'object') {
    throw new Error('CORS configuration context must be an object');
  }

  // Guard clause: validate mode exists
  if (!context.mode) {
    throw new Error('CORS configuration context must have mode property');
  }

  // Guard clause: validate mode is valid
  if (context.mode !== 'rest' && context.mode !== 'lambda') {
    throw new Error('CORS configuration context mode must be "rest" or "lambda"');
  }

  const warnings: string[] = [];
  const errors: string[] = [];

  // Guard clause: no CORS config means no validation needed
  if (!isCorsEnabled(context.corsConfig)) {
    return { isValid: true, warnings, errors };
  }

  // Validation: REST mode must use fluentConfig.cors
  if (context.mode === 'rest' && context.isDirectConfig) {
    errors.push(
      'CORS configuration must be in `fluentConfig.cors`, not directly in `cors`. ' +
        'Example: `new SyntroJS({ fluentConfig: { cors: { ... } } })`',
    );
  }

  // Validation: Lambda mode should use lambdaCors
  if (context.mode === 'lambda' && context.isInFluentConfig) {
    warnings.push(
      'For Lambda mode, use `lambdaCors` instead of `fluentConfig.cors`. ' +
        'Example: `new SyntroJS({ rest: false, lambdaCors: { ... } })`',
    );
  }

  return {
    isValid: errors.length === 0,
    warnings,
    errors,
  };
}

/**
 * Pure function: Check if @fastify/cors package is installed
 *
 * @returns Promise resolving to true if installed, false otherwise
 */
export async function isFastifyCorsInstalled(): Promise<boolean> {
  try {
    // Try to import the package
    await import('@fastify/cors');
    return true;
  } catch {
    return false;
  }
}

/**
 * Pure function: Get @fastify/cors package version
 *
 * @returns Promise resolving to version string or null if not installed or cannot be read
 */
export async function getFastifyCorsVersion(): Promise<string | null> {
  try {
    // Try to use Node.js module resolution
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createRequire } = require('module');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs');

    // Try to resolve the package
    let packagePath: string;
    try {
      packagePath = require.resolve('@fastify/cors/package.json');
    } catch {
      // Fallback: try to find it in node_modules relative to current working directory
      const possiblePaths = [
        path.join(process.cwd(), 'node_modules', '@fastify', 'cors', 'package.json'),
        path.join(process.cwd(), '..', 'node_modules', '@fastify', 'cors', 'package.json'),
      ];

      packagePath = possiblePaths.find((p) => fs.existsSync(p)) || '';
      if (!packagePath) {
        return null;
      }
    }

    // Read and parse package.json
    const packageJsonContent = fs.readFileSync(packagePath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);
    return packageJson.version || null;
  } catch {
    // If we can't read the version, return null (package might not be installed or version unreadable)
    return null;
  }
}

/**
 * Pure function: Check if @fastify/cors version is compatible
 *
 * @param version - Version string (e.g., "9.0.1" or "11.1.0")
 * @returns True if version is compatible (^9.0.0)
 */
export function isFastifyCorsVersionCompatible(version: string | null): boolean {
  // Guard clause: no version means not installed
  if (!version) {
    return false;
  }

  // Parse major version
  const majorVersion = parseInt(version.split('.')[0] || '0', 10);

  // Compatible versions: ^9.0.0 (major version 9)
  // Incompatible: v11+ requires Fastify v5, but SyntroJS uses Fastify v4
  return majorVersion === 9;
}

/**
 * Pure function: Validate CORS dependencies
 *
 * @param corsConfig - CORS configuration
 * @returns Promise resolving to validation result
 */
export async function validateCorsDependencies(
  corsConfig?: boolean | CorsOptions,
): Promise<CorsValidationResult> {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Guard clause: no CORS config means no validation needed
  if (!isCorsEnabled(corsConfig)) {
    return { isValid: true, warnings, errors };
  }

  // Check if @fastify/cors is installed
  const isInstalled = await isFastifyCorsInstalled();
  if (!isInstalled) {
    errors.push('@fastify/cors is not installed. Install with: npm install @fastify/cors@^9.0.0');
    return { isValid: false, warnings, errors };
  }

  // Check version compatibility
  const version = await getFastifyCorsVersion();
  if (version && !isFastifyCorsVersionCompatible(version)) {
    errors.push(
      `@fastify/cors version ${version} is incompatible. ` +
        'SyntroJS requires @fastify/cors@^9.0.0 (Fastify v4 compatible). ' +
        `Install with: npm install @fastify/cors@^9.0.0`,
    );
  }

  return {
    isValid: errors.length === 0,
    warnings,
    errors,
  };
}

/**
 * Pure function: Format validation warnings/errors for console output
 *
 * @param result - Validation result
 * @returns Formatted message array
 */
export function formatCorsValidationMessages(result: CorsValidationResult): string[] {
  const messages: string[] = [];

  if (result.errors.length > 0) {
    messages.push('⚠️  CORS Configuration Errors:');
    result.errors.forEach((error) => {
      messages.push(`   ❌ ${error}`);
    });
  }

  if (result.warnings.length > 0) {
    messages.push('⚠️  CORS Configuration Warnings:');
    result.warnings.forEach((warning) => {
      messages.push(`   ⚠️  ${warning}`);
    });
  }

  return messages;
}

/**
 * Pure function: Display CORS validation messages
 *
 * @param messages - Formatted messages
 */
export function displayCorsValidationMessages(messages: string[]): void {
  if (messages.length === 0) {
    return;
  }

  console.error('\n');
  messages.forEach((message) => {
    console.error(message);
  });
  console.error('\n');
}

/**
 * Composite function: Validate CORS configuration and dependencies
 *
 * @param context - CORS configuration context
 * @returns Promise resolving to validation result
 */
export async function validateCorsConfiguration(
  context: CorsConfigContext,
): Promise<CorsValidationResult> {
  // Validate structure first (synchronous)
  const structureResult = validateCorsConfigStructure(context);

  // If structure is invalid, return early
  if (!structureResult.isValid) {
    return structureResult;
  }

  // Validate dependencies (asynchronous)
  const dependenciesResult = await validateCorsDependencies(context.corsConfig);

  // Combine results
  return {
    isValid: structureResult.isValid && dependenciesResult.isValid,
    warnings: [...structureResult.warnings, ...dependenciesResult.warnings],
    errors: [...structureResult.errors, ...dependenciesResult.errors],
  };
}
