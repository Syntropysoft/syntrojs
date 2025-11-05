/**
 * Unit tests for JWT utilities
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  decodeJWT,
  JWTError,
  type JWTPayload,
  signJWT,
  verifyJWT,
} from '../../../src/security/jwt';

describe('JWT Utilities', () => {
  const SECRET = 'test-secret-key';
  const PAYLOAD: JWTPayload = {
    sub: 'user123',
    role: 'admin',
  };

  beforeEach(() => {
    // Reset time mocks
    vi.restoreAllMocks();
  });

  // ============================================
  // signJWT
  // ============================================

  describe('signJWT', () => {
    test('should sign a JWT token with basic payload', () => {
      const token = signJWT(PAYLOAD, { secret: SECRET });

      expect(token).toBeTypeOf('string');
      expect(token.split('.')).toHaveLength(3); // header.payload.signature
    });

    test('should include iat (issued at) claim', () => {
      const now = Math.floor(Date.now() / 1000);
      const token = signJWT(PAYLOAD, { secret: SECRET });

      const decoded = decodeJWT(token);
      expect(decoded.iat).toBeTypeOf('number');
      expect(decoded.iat).toBeGreaterThanOrEqual(now);
      expect(decoded.iat).toBeLessThanOrEqual(now + 1);
    });

    test('should include exp claim when expiresIn is provided', () => {
      const token = signJWT(PAYLOAD, { secret: SECRET, expiresIn: '1h' });

      const decoded = decodeJWT(token);
      expect(decoded.exp).toBeTypeOf('number');
      expect(decoded.exp).toBeGreaterThan(decoded.iat!);
    });

    test('should parse expiresIn correctly', () => {
      const _now = Math.floor(Date.now() / 1000);

      // 30 seconds
      const token1 = signJWT(PAYLOAD, { secret: SECRET, expiresIn: '30s' });
      const decoded1 = decodeJWT(token1);
      expect(decoded1.exp).toBe(decoded1.iat! + 30);

      // 30 minutes
      const token2 = signJWT(PAYLOAD, { secret: SECRET, expiresIn: '30m' });
      const decoded2 = decodeJWT(token2);
      expect(decoded2.exp).toBe(decoded2.iat! + 30 * 60);

      // 2 hours
      const token3 = signJWT(PAYLOAD, { secret: SECRET, expiresIn: '2h' });
      const decoded3 = decodeJWT(token3);
      expect(decoded3.exp).toBe(decoded3.iat! + 2 * 3600);

      // 7 days
      const token4 = signJWT(PAYLOAD, { secret: SECRET, expiresIn: '7d' });
      const decoded4 = decodeJWT(token4);
      expect(decoded4.exp).toBe(decoded4.iat! + 7 * 86400);
    });

    test('should include issuer when provided', () => {
      const token = signJWT(PAYLOAD, { secret: SECRET, issuer: 'my-api' });

      const decoded = decodeJWT(token);
      expect(decoded.iss).toBe('my-api');
    });

    test('should include audience when provided', () => {
      const token = signJWT(PAYLOAD, { secret: SECRET, audience: 'my-app' });

      const decoded = decodeJWT(token);
      expect(decoded.aud).toBe('my-app');
    });

    test('should preserve custom claims', () => {
      const customPayload = { sub: 'user123', role: 'admin', custom: 'value' };
      const token = signJWT(customPayload, { secret: SECRET });

      const decoded = decodeJWT(token);
      expect(decoded.sub).toBe('user123');
      expect(decoded.role).toBe('admin');
      expect(decoded.custom).toBe('value');
    });

    // Guard clauses
    test('should throw if secret is empty', () => {
      expect(() => signJWT(PAYLOAD, { secret: '' })).toThrow('JWT secret is required');
    });

    test('should throw if secret is whitespace', () => {
      expect(() => signJWT(PAYLOAD, { secret: '   ' })).toThrow('JWT secret is required');
    });

    test('should throw if payload is not an object', () => {
      expect(() => signJWT(null as any, { secret: SECRET })).toThrow(
        'JWT payload must be an object',
      );
      expect(() => signJWT(undefined as any, { secret: SECRET })).toThrow(
        'JWT payload must be an object',
      );
      expect(() => signJWT('invalid' as any, { secret: SECRET })).toThrow(
        'JWT payload must be an object',
      );
    });

    test('should throw if expiresIn format is invalid', () => {
      expect(() => signJWT(PAYLOAD, { secret: SECRET, expiresIn: '' })).toThrow(
        'expiresIn cannot be empty',
      );
      expect(() => signJWT(PAYLOAD, { secret: SECRET, expiresIn: 'invalid' })).toThrow(
        'Invalid expiresIn format',
      );
      expect(() => signJWT(PAYLOAD, { secret: SECRET, expiresIn: '10' })).toThrow(
        'Invalid expiresIn format',
      );
      expect(() => signJWT(PAYLOAD, { secret: SECRET, expiresIn: '10x' })).toThrow(
        'Invalid expiresIn format',
      );
    });
  });

  // ============================================
  // verifyJWT
  // ============================================

  describe('verifyJWT', () => {
    test('should verify a valid JWT token', () => {
      const token = signJWT(PAYLOAD, { secret: SECRET });

      const decoded = verifyJWT(token, { secret: SECRET });

      expect(decoded.sub).toBe('user123');
      expect(decoded.role).toBe('admin');
      expect(decoded.iat).toBeTypeOf('number');
    });

    test('should verify token with issuer', () => {
      const token = signJWT(PAYLOAD, { secret: SECRET, issuer: 'my-api' });

      const decoded = verifyJWT(token, { secret: SECRET, issuer: 'my-api' });

      expect(decoded.iss).toBe('my-api');
    });

    test('should verify token with audience', () => {
      const token = signJWT(PAYLOAD, { secret: SECRET, audience: 'my-app' });

      const decoded = verifyJWT(token, { secret: SECRET, audience: 'my-app' });

      expect(decoded.aud).toBe('my-app');
    });

    test('should throw if token has expired', () => {
      const token = signJWT(PAYLOAD, { secret: SECRET, expiresIn: '1s' });

      // Wait for expiration
      vi.useFakeTimers();
      vi.advanceTimersByTime(2000);

      expect(() => verifyJWT(token, { secret: SECRET })).toThrow(JWTError);
      expect(() => verifyJWT(token, { secret: SECRET })).toThrow('JWT token has expired');

      const error = (() => {
        try {
          verifyJWT(token, { secret: SECRET });
        } catch (e) {
          return e as JWTError;
        }
      })();
      expect(error?.code).toBe('EXPIRED_TOKEN');

      vi.useRealTimers();
    });

    test('should throw if signature is invalid', () => {
      const token = signJWT(PAYLOAD, { secret: SECRET });
      const tamperedToken = `${token.slice(0, -5)}XXXXX`; // Tamper with signature

      expect(() => verifyJWT(tamperedToken, { secret: SECRET })).toThrow(JWTError);
      expect(() => verifyJWT(tamperedToken, { secret: SECRET })).toThrow('Invalid JWT signature');

      const error = (() => {
        try {
          verifyJWT(tamperedToken, { secret: SECRET });
        } catch (e) {
          return e as JWTError;
        }
      })();
      expect(error?.code).toBe('INVALID_SIGNATURE');
    });

    test('should throw if wrong secret is used', () => {
      const token = signJWT(PAYLOAD, { secret: SECRET });

      expect(() => verifyJWT(token, { secret: 'wrong-secret' })).toThrow(JWTError);
      expect(() => verifyJWT(token, { secret: 'wrong-secret' })).toThrow('Invalid JWT signature');
    });

    test('should throw if issuer does not match', () => {
      const token = signJWT(PAYLOAD, { secret: SECRET, issuer: 'api-a' });

      expect(() => verifyJWT(token, { secret: SECRET, issuer: 'api-b' })).toThrow(JWTError);
      expect(() => verifyJWT(token, { secret: SECRET, issuer: 'api-b' })).toThrow('Invalid issuer');
    });

    test('should throw if audience does not match', () => {
      const token = signJWT(PAYLOAD, { secret: SECRET, audience: 'app-a' });

      expect(() => verifyJWT(token, { secret: SECRET, audience: 'app-b' })).toThrow(JWTError);
      expect(() => verifyJWT(token, { secret: SECRET, audience: 'app-b' })).toThrow(
        'Invalid audience',
      );
    });

    test('should throw if payload is not valid JSON', () => {
      const token = 'header.invalid-json.signature';

      expect(() => verifyJWT(token, { secret: SECRET })).toThrow(JWTError);
      // Signature check fails first before JSON parsing
      expect(() => verifyJWT(token, { secret: SECRET })).toThrow('Invalid JWT signature');
    });

    // Guard clauses
    test('should throw if token is empty', () => {
      expect(() => verifyJWT('', { secret: SECRET })).toThrow(JWTError);
      expect(() => verifyJWT('', { secret: SECRET })).toThrow('JWT token is required');

      const error = (() => {
        try {
          verifyJWT('', { secret: SECRET });
        } catch (e) {
          return e as JWTError;
        }
      })();
      expect(error?.code).toBe('INVALID_TOKEN');
    });

    test('should throw if token is whitespace', () => {
      expect(() => verifyJWT('   ', { secret: SECRET })).toThrow('JWT token is required');
    });

    test('should throw if secret is empty', () => {
      const token = signJWT(PAYLOAD, { secret: SECRET });

      expect(() => verifyJWT(token, { secret: '' })).toThrow(JWTError);
      expect(() => verifyJWT(token, { secret: '' })).toThrow('JWT secret is required');
    });

    test('should throw if token format is invalid', () => {
      expect(() => verifyJWT('invalid', { secret: SECRET })).toThrow(JWTError);
      expect(() => verifyJWT('invalid', { secret: SECRET })).toThrow('Invalid JWT format');

      const error = (() => {
        try {
          verifyJWT('invalid', { secret: SECRET });
        } catch (e) {
          return e as JWTError;
        }
      })();
      expect(error?.code).toBe('INVALID_FORMAT');
    });

    test('should throw if token has too many parts', () => {
      expect(() => verifyJWT('a.b.c.d', { secret: SECRET })).toThrow('Invalid JWT format');
    });

    test('should throw if token has too few parts', () => {
      expect(() => verifyJWT('a.b', { secret: SECRET })).toThrow('Invalid JWT format');
    });
  });

  // ============================================
  // decodeJWT
  // ============================================

  describe('decodeJWT', () => {
    test('should decode a JWT token without verification', () => {
      const token = signJWT(PAYLOAD, { secret: SECRET });

      const decoded = decodeJWT(token);

      expect(decoded.sub).toBe('user123');
      expect(decoded.role).toBe('admin');
      expect(decoded.iat).toBeTypeOf('number');
    });

    test('should decode expired token (no verification)', () => {
      const token = signJWT(PAYLOAD, { secret: SECRET, expiresIn: '1s' });

      vi.useFakeTimers();
      vi.advanceTimersByTime(2000);

      // Should NOT throw (no verification)
      const decoded = decodeJWT(token);
      expect(decoded.sub).toBe('user123');

      vi.useRealTimers();
    });

    test('should decode token with invalid signature (no verification)', () => {
      const token = signJWT(PAYLOAD, { secret: SECRET });
      const tamperedToken = `${token.slice(0, -5)}XXXXX`;

      // Should NOT throw (no verification)
      const decoded = decodeJWT(tamperedToken);
      expect(decoded.sub).toBe('user123');
    });

    // Guard clauses
    test('should throw if token is empty', () => {
      expect(() => decodeJWT('')).toThrow(JWTError);
      expect(() => decodeJWT('')).toThrow('JWT token is required');

      const error = (() => {
        try {
          decodeJWT('');
        } catch (e) {
          return e as JWTError;
        }
      })();
      expect(error?.code).toBe('INVALID_TOKEN');
    });

    test('should throw if token is whitespace', () => {
      expect(() => decodeJWT('   ')).toThrow('JWT token is required');
    });

    test('should throw if token format is invalid', () => {
      expect(() => decodeJWT('invalid')).toThrow(JWTError);
      expect(() => decodeJWT('invalid')).toThrow('Invalid JWT format');

      const error = (() => {
        try {
          decodeJWT('invalid');
        } catch (e) {
          return e as JWTError;
        }
      })();
      expect(error?.code).toBe('INVALID_FORMAT');
    });

    test('should throw if payload is not valid JSON', () => {
      // Create a token with invalid JSON payload manually
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString(
        'base64url',
      );
      const payload = Buffer.from('invalid-json').toString('base64url');
      const token = `${header}.${payload}.signature`;

      expect(() => decodeJWT(token)).toThrow(JWTError);
      expect(() => decodeJWT(token)).toThrow('Invalid JWT payload');

      const error = (() => {
        try {
          decodeJWT(token);
        } catch (e) {
          return e as JWTError;
        }
      })();
      expect(error?.code).toBe('INVALID_FORMAT');
    });
  });

  // ============================================
  // Integration tests
  // ============================================

  describe('Integration: sign + verify', () => {
    test('should sign and verify a complete flow', () => {
      const payload = {
        sub: 'user123',
        email: 'gaby@example.com',
        role: 'admin',
      };

      // Sign
      const token = signJWT(payload, {
        secret: SECRET,
        expiresIn: '1h',
        issuer: 'my-api',
        audience: 'my-app',
      });

      // Verify
      const decoded = verifyJWT(token, {
        secret: SECRET,
        issuer: 'my-api',
        audience: 'my-app',
      });

      expect(decoded.sub).toBe('user123');
      expect(decoded.email).toBe('gaby@example.com');
      expect(decoded.role).toBe('admin');
      expect(decoded.iss).toBe('my-api');
      expect(decoded.aud).toBe('my-app');
      expect(decoded.iat).toBeTypeOf('number');
      expect(decoded.exp).toBeTypeOf('number');
    });

    test('should fail verification with wrong secret', () => {
      const token = signJWT(PAYLOAD, { secret: 'secret-1' });

      expect(() => verifyJWT(token, { secret: 'secret-2' })).toThrow(JWTError);
    });

    test('should fail verification after expiration', () => {
      const token = signJWT(PAYLOAD, { secret: SECRET, expiresIn: '1s' });

      // Verify immediately (should pass)
      const decoded1 = verifyJWT(token, { secret: SECRET });
      expect(decoded1.sub).toBe('user123');

      // Wait for expiration
      vi.useFakeTimers();
      vi.advanceTimersByTime(2000);

      // Verify after expiration (should fail)
      expect(() => verifyJWT(token, { secret: SECRET })).toThrow('JWT token has expired');

      vi.useRealTimers();
    });
  });

  // ============================================
  // JWTError
  // ============================================

  describe('JWTError', () => {
    test('should have correct error codes', () => {
      const token = signJWT(PAYLOAD, { secret: SECRET, expiresIn: '1s' });

      vi.useFakeTimers();
      vi.advanceTimersByTime(2000);

      try {
        verifyJWT(token, { secret: SECRET });
      } catch (error) {
        expect(error).toBeInstanceOf(JWTError);
        expect((error as JWTError).code).toBe('EXPIRED_TOKEN');
        expect((error as JWTError).name).toBe('JWTError');
      }

      vi.useRealTimers();
    });

    test('should have INVALID_SIGNATURE code', () => {
      const token = signJWT(PAYLOAD, { secret: SECRET });
      const tamperedToken = `${token.slice(0, -5)}XXXXX`;

      try {
        verifyJWT(tamperedToken, { secret: SECRET });
      } catch (error) {
        expect((error as JWTError).code).toBe('INVALID_SIGNATURE');
      }
    });

    test('should have INVALID_FORMAT code', () => {
      try {
        decodeJWT('invalid');
      } catch (error) {
        expect((error as JWTError).code).toBe('INVALID_FORMAT');
      }
    });

    test('should have INVALID_TOKEN code', () => {
      try {
        verifyJWT('', { secret: SECRET });
      } catch (error) {
        expect((error as JWTError).code).toBe('INVALID_TOKEN');
      }
    });
  });
});
