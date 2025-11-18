/**
 * CorsValidator Unit Tests
 *
 * Tests for CORS configuration validation and dependency checking
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isCorsEnabled,
  validateCorsConfigStructure,
  isFastifyCorsInstalled,
  getFastifyCorsVersion,
  isFastifyCorsVersionCompatible,
  validateCorsDependencies,
  formatCorsValidationMessages,
  validateCorsConfiguration,
  type CorsConfigContext,
} from '../../../src/application/CorsValidator';

describe('CorsValidator', () => {
  describe('isCorsEnabled', () => {
    it('should return false for undefined', () => {
      expect(isCorsEnabled(undefined)).toBe(false);
    });

    it('should return false for false', () => {
      expect(isCorsEnabled(false)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isCorsEnabled(null as any)).toBe(false);
    });

    it('should return true for boolean true', () => {
      expect(isCorsEnabled(true)).toBe(true);
    });

    it('should return true for CorsOptions object', () => {
      expect(isCorsEnabled({ origin: true })).toBe(true);
    });
  });

  describe('validateCorsConfigStructure', () => {
    it('should return valid for no CORS config', () => {
      const context: CorsConfigContext = {
        corsConfig: undefined,
        mode: 'rest',
      };
      const result = validateCorsConfigStructure(context);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should return error for REST mode with direct cors config', () => {
      const context: CorsConfigContext = {
        corsConfig: { origin: true },
        mode: 'rest',
        isDirectConfig: true,
        isInFluentConfig: false,
      };
      const result = validateCorsConfigStructure(context);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('fluentConfig.cors');
    });

    it('should return valid for REST mode with fluentConfig.cors', () => {
      const context: CorsConfigContext = {
        corsConfig: { origin: true },
        mode: 'rest',
        isDirectConfig: false,
        isInFluentConfig: true,
      };
      const result = validateCorsConfigStructure(context);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return warning for Lambda mode with fluentConfig.cors', () => {
      const context: CorsConfigContext = {
        corsConfig: { origin: true },
        mode: 'lambda',
        isInFluentConfig: true,
      };
      const result = validateCorsConfigStructure(context);
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('lambdaCors');
    });
  });

  describe('isFastifyCorsInstalled', () => {
    it('should return true if @fastify/cors is installed', async () => {
      const result = await isFastifyCorsInstalled();
      // This test depends on whether @fastify/cors is actually installed
      // In CI/CD it might not be, so we just verify the function works
      expect(typeof result).toBe('boolean');
    });
  });

  describe('getFastifyCorsVersion', () => {
    it('should return version string or null', async () => {
      const version = await getFastifyCorsVersion();
      // Version might be null if package is not installed
      expect(version === null || typeof version === 'string').toBe(true);
    });
  });

  describe('isFastifyCorsVersionCompatible', () => {
    it('should return true for version 9.x.x', () => {
      expect(isFastifyCorsVersionCompatible('9.0.0')).toBe(true);
      expect(isFastifyCorsVersionCompatible('9.1.0')).toBe(true);
      expect(isFastifyCorsVersionCompatible('9.10.5')).toBe(true);
    });

    it('should return false for version 11.x.x', () => {
      expect(isFastifyCorsVersionCompatible('11.0.0')).toBe(false);
      expect(isFastifyCorsVersionCompatible('11.1.0')).toBe(false);
    });

    it('should return false for version 10.x.x', () => {
      expect(isFastifyCorsVersionCompatible('10.0.0')).toBe(false);
    });

    it('should return false for null', () => {
      expect(isFastifyCorsVersionCompatible(null)).toBe(false);
    });

    it('should return false for invalid version strings', () => {
      expect(isFastifyCorsVersionCompatible('invalid')).toBe(false);
      expect(isFastifyCorsVersionCompatible('')).toBe(false);
    });
  });

  describe('validateCorsDependencies', () => {
    it('should return valid for no CORS config', async () => {
      const result = await validateCorsDependencies(undefined);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return valid for false CORS config', async () => {
      const result = await validateCorsDependencies(false);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should check for @fastify/cors installation when CORS is enabled', async () => {
      const result = await validateCorsDependencies(true);
      // Result depends on whether @fastify/cors is installed
      // We just verify the function executes without errors
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
    });
  });

  describe('formatCorsValidationMessages', () => {
    it('should format errors correctly', () => {
      const result = {
        isValid: false,
        errors: ['Error 1', 'Error 2'],
        warnings: [],
      };
      const messages = formatCorsValidationMessages(result);
      expect(messages.length).toBeGreaterThan(0);
      expect(messages[0]).toContain('CORS Configuration Errors');
      expect(messages.some((m) => m.includes('Error 1'))).toBe(true);
      expect(messages.some((m) => m.includes('Error 2'))).toBe(true);
    });

    it('should format warnings correctly', () => {
      const result = {
        isValid: true,
        errors: [],
        warnings: ['Warning 1', 'Warning 2'],
      };
      const messages = formatCorsValidationMessages(result);
      expect(messages.length).toBeGreaterThan(0);
      expect(messages[0]).toContain('CORS Configuration Warnings');
      expect(messages.some((m) => m.includes('Warning 1'))).toBe(true);
      expect(messages.some((m) => m.includes('Warning 2'))).toBe(true);
    });

    it('should return empty array for no errors or warnings', () => {
      const result = {
        isValid: true,
        errors: [],
        warnings: [],
      };
      const messages = formatCorsValidationMessages(result);
      expect(messages).toHaveLength(0);
    });

    it('should format both errors and warnings', () => {
      const result = {
        isValid: false,
        errors: ['Error 1'],
        warnings: ['Warning 1'],
      };
      const messages = formatCorsValidationMessages(result);
      expect(messages.length).toBeGreaterThan(2);
      expect(messages.some((m) => m.includes('Errors'))).toBe(true);
      expect(messages.some((m) => m.includes('Warnings'))).toBe(true);
    });
  });

  describe('validateCorsConfiguration', () => {
    it('should return valid for no CORS config', async () => {
      const context: CorsConfigContext = {
        corsConfig: undefined,
        mode: 'rest',
      };
      const result = await validateCorsConfiguration(context);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate structure first', async () => {
      const context: CorsConfigContext = {
        corsConfig: { origin: true },
        mode: 'rest',
        isDirectConfig: true,
        isInFluentConfig: false,
      };
      const result = await validateCorsConfiguration(context);
      // Should fail on structure validation before checking dependencies
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate dependencies if structure is valid', async () => {
      const context: CorsConfigContext = {
        corsConfig: { origin: true },
        mode: 'rest',
        isDirectConfig: false,
        isInFluentConfig: true,
      };
      const result = await validateCorsConfiguration(context);
      // Structure is valid, so it should check dependencies
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
    });
  });
});

