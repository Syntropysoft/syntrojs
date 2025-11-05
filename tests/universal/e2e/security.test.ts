/**
 * E2E tests for Security module
 */

import type { FastifyRequest } from 'fastify';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { inject } from '../../../src/application/DependencyInjector';
import { SyntroJS } from '../../../src/core';
import {
  APIKeyHeader,
  APIKeyQuery,
  HTTPBasic,
  HTTPBearer,
  OAuth2PasswordBearer,
} from '../../../src/security';
import { signJWT, verifyJWT } from '../../../src/security/jwt';

describe('Security E2E', () => {
  let app: SyntroJS;
  let server: string;

  beforeAll(async () => {
    try {
      app = new SyntroJS();

      // ============================================
      // OAuth2PasswordBearer Example
      // ============================================

      const oauth2Scheme = new OAuth2PasswordBearer('/token', {
        'read:user': 'Read user data',
        'write:user': 'Write user data',
      });

      // Token endpoint (issues JWT)
      app.post('/token', {
        handler: () => {
          const token = signJWT(
            { sub: 'user123', role: 'admin' },
            { secret: 'test-secret', expiresIn: '1h' },
          );
          return { access_token: token, token_type: 'bearer' };
        },
      });

      // Protected endpoint using OAuth2
      app.get('/oauth2/me', {
        dependencies: {
          token: inject(async (req: FastifyRequest) => oauth2Scheme.validate(req)),
        },
        handler: ({ dependencies }) => {
          // Verify JWT
          const payload = verifyJWT(dependencies.token, { secret: 'test-secret' });
          return { user: payload.sub, role: payload.role };
        },
      });

      // ============================================
      // HTTPBearer Example
      // ============================================

      const bearerScheme = new HTTPBearer();

      app.get('/bearer/protected', {
        dependencies: {
          token: inject(async (req: FastifyRequest) => bearerScheme.validate(req)),
        },
        handler: ({ dependencies }) => {
          return { message: 'Protected resource', token: dependencies.token };
        },
      });

      // ============================================
      // HTTPBasic Example
      // ============================================

      const basicScheme = new HTTPBasic();

      app.get('/basic/protected', {
        dependencies: {
          credentials: inject(async (req: FastifyRequest) => basicScheme.validate(req)),
        },
        handler: ({ dependencies }) => {
          const { username, password } = dependencies.credentials;

          // In real app: verify against database
          if (username === 'admin' && password === 'secret') {
            return { message: 'Authenticated', username };
          }

          return { error: 'Invalid credentials' };
        },
      });

      // ============================================
      // APIKey Examples (Header, Query)
      // ============================================

      const apiKeyHeaderScheme = new APIKeyHeader('X-API-Key');
      const apiKeyQueryScheme = new APIKeyQuery('api_key');

      app.get('/apikey/header', {
        dependencies: {
          apiKey: inject(async (req: FastifyRequest) => apiKeyHeaderScheme.validate(req)),
        },
        handler: ({ dependencies }) => {
          // In real app: verify against database
          if (dependencies.apiKey === 'valid-key-123') {
            return { message: 'Authenticated', apiKey: dependencies.apiKey };
          }
          return { error: 'Invalid API key' };
        },
      });

      app.get('/apikey/query', {
        dependencies: {
          apiKey: inject(async (req: FastifyRequest) => apiKeyQueryScheme.validate(req)),
        },
        handler: ({ dependencies }) => {
          // In real app: verify against database
          if (dependencies.apiKey === 'valid-key-456') {
            return { message: 'Authenticated', apiKey: dependencies.apiKey };
          }
          return { error: 'Invalid API key' };
        },
      });

      // ============================================
      // Combined Example: JWT + OAuth2
      // ============================================

      app.get('/protected/user-data', {
        dependencies: {
          token: inject(async (req: FastifyRequest) => oauth2Scheme.validate(req)),
        },
        handler: ({ dependencies }) => {
          const payload = verifyJWT(dependencies.token, { secret: 'test-secret' });

          // Check role
          if (payload.role !== 'admin') {
            throw new Error('Insufficient permissions');
          }

          return {
            user: payload.sub,
            role: payload.role,
            data: { email: 'gaby@example.com', age: 30 },
          };
        },
      });

      server = await app.listen(0); // Random port
    } catch (error) {
      console.error('Failed to start security test server:', error);
      throw error;
    }
  });

  afterAll(async () => {
    try {
      if (app) {
        await app.close();
      }
    } catch (_error) {
      // Ignore close errors if server never started
    }
  });

  // ============================================
  // OAuth2PasswordBearer Tests
  // ============================================

  describe('OAuth2PasswordBearer', () => {
    test('should issue token from /token endpoint', async () => {
      const port = new URL(server).port;
      const response = await fetch(`http://localhost:${port}/token`, {
        method: 'POST',
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('access_token');
      expect(data.token_type).toBe('bearer');
    });

    test('should access protected endpoint with valid token', async () => {
      const port = new URL(server).port;
      // Get token
      const tokenResponse = await fetch(`http://localhost:${port}/token`, {
        method: 'POST',
      });
      const { access_token } = await tokenResponse.json();

      // Access protected endpoint
      const response = await fetch(`http://localhost:${port}/oauth2/me`, {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toEqual({
        user: 'user123',
        role: 'admin',
      });
    });

    test('should reject request without Authorization header', async () => {
      const port = new URL(server).port;
      const response = await fetch(`http://localhost:${port}/oauth2/me`);

      expect(response.status).toBe(401);
      expect(response.headers.get('WWW-Authenticate')).toBe('Bearer');

      const data = await response.json();
      expect(data.detail).toBe('Not authenticated');
    });

    test('should reject request with invalid token format', async () => {
      const port = new URL(server).port;
      const response = await fetch(`http://localhost:${port}/oauth2/me`, {
        headers: {
          Authorization: 'Basic dXNlcjpwYXNz',
        },
      });

      expect(response.status).toBe(401);
      expect(response.headers.get('WWW-Authenticate')).toBe('Bearer');
    });

    test('should reject request with empty token', async () => {
      const port = new URL(server).port;
      const response = await fetch(`http://localhost:${port}/oauth2/me`, {
        headers: {
          Authorization: 'Bearer ',
        },
      });

      expect(response.status).toBe(401);
    });
  });

  // ============================================
  // HTTPBearer Tests
  // ============================================

  describe('HTTPBearer', () => {
    test('should access protected endpoint with valid Bearer token', async () => {
      const port = new URL(server).port;
      const response = await fetch(`http://localhost:${port}/bearer/protected`, {
        headers: {
          Authorization: 'Bearer my-secret-token',
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toEqual({
        message: 'Protected resource',
        token: 'my-secret-token',
      });
    });

    test('should reject request without Authorization header', async () => {
      const port = new URL(server).port;
      const response = await fetch(`http://localhost:${port}/bearer/protected`);

      expect(response.status).toBe(401);
      expect(response.headers.get('WWW-Authenticate')).toBe('Bearer');
    });

    test('should reject request with invalid format', async () => {
      const port = new URL(server).port;
      const response = await fetch(`http://localhost:${port}/bearer/protected`, {
        headers: {
          Authorization: 'Token my-token',
        },
      });

      expect(response.status).toBe(401);
    });
  });

  // ============================================
  // HTTPBasic Tests
  // ============================================

  describe('HTTPBasic', () => {
    test('should access protected endpoint with valid credentials', async () => {
      const port = new URL(server).port;
      const credentials = Buffer.from('admin:secret').toString('base64');
      const response = await fetch(`http://localhost:${port}/basic/protected`, {
        headers: {
          Authorization: `Basic ${credentials}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toEqual({
        message: 'Authenticated',
        username: 'admin',
      });
    });

    test('should reject invalid credentials', async () => {
      const port = new URL(server).port;
      const credentials = Buffer.from('admin:wrong').toString('base64');
      const response = await fetch(`http://localhost:${port}/basic/protected`, {
        headers: {
          Authorization: `Basic ${credentials}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toEqual({
        error: 'Invalid credentials',
      });
    });

    test('should reject request without Authorization header', async () => {
      const port = new URL(server).port;
      const response = await fetch(`http://localhost:${port}/basic/protected`);

      expect(response.status).toBe(401);
      expect(response.headers.get('WWW-Authenticate')).toBe('Basic');
    });

    test('should reject request with invalid format', async () => {
      const port = new URL(server).port;
      const response = await fetch(`http://localhost:${port}/basic/protected`, {
        headers: {
          Authorization: 'Bearer my-token',
        },
      });

      expect(response.status).toBe(401);
    });

    test('should handle special characters in credentials', async () => {
      const port = new URL(server).port;
      const credentials = Buffer.from('user@example.com:P@ssw0rd!').toString('base64');
      const response = await fetch(`http://localhost:${port}/basic/protected`, {
        headers: {
          Authorization: `Basic ${credentials}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toEqual({
        error: 'Invalid credentials', // Wrong username/password
      });
    });
  });

  // ============================================
  // APIKey Tests
  // ============================================

  describe('APIKey', () => {
    describe('APIKeyHeader', () => {
      test('should access protected endpoint with valid API key in header', async () => {
        const port = new URL(server).port;
        const response = await fetch(`http://localhost:${port}/apikey/header`, {
          headers: {
            'X-API-Key': 'valid-key-123',
          },
        });

        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data).toEqual({
          message: 'Authenticated',
          apiKey: 'valid-key-123',
        });
      });

      test('should reject invalid API key', async () => {
        const port = new URL(server).port;
        const response = await fetch(`http://localhost:${port}/apikey/header`, {
          headers: {
            'X-API-Key': 'invalid-key',
          },
        });

        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data).toEqual({
          error: 'Invalid API key',
        });
      });

      test('should reject request without API key header', async () => {
        const port = new URL(server).port;
        const response = await fetch(`http://localhost:${port}/apikey/header`);

        expect(response.status).toBe(403);

        const data = await response.json();
        expect(data.detail).toBe('Not authenticated');
      });
    });

    describe('APIKeyQuery', () => {
      test('should access protected endpoint with valid API key in query', async () => {
        const port = new URL(server).port;
        const response = await fetch(`http://localhost:${port}/apikey/query?api_key=valid-key-456`);

        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data).toEqual({
          message: 'Authenticated',
          apiKey: 'valid-key-456',
        });
      });

      test('should reject invalid API key', async () => {
        const port = new URL(server).port;
        const response = await fetch(`http://localhost:${port}/apikey/query?api_key=invalid-key`);

        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data).toEqual({
          error: 'Invalid API key',
        });
      });

      test('should reject request without API key query parameter', async () => {
        const port = new URL(server).port;
        const response = await fetch(`http://localhost:${port}/apikey/query`);

        expect(response.status).toBe(403);

        const data = await response.json();
        expect(data.detail).toBe('Not authenticated');
      });
    });
  });

  // ============================================
  // Combined: JWT + OAuth2
  // ============================================

  describe('Combined: JWT + OAuth2', () => {
    test('should access endpoint with valid JWT and admin role', async () => {
      const port = new URL(server).port;
      // Get token
      const tokenResponse = await fetch(`http://localhost:${port}/token`, {
        method: 'POST',
      });
      const { access_token } = await tokenResponse.json();

      // Access protected endpoint
      const response = await fetch(`http://localhost:${port}/protected/user-data`, {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toEqual({
        user: 'user123',
        role: 'admin',
        data: { email: 'gaby@example.com', age: 30 },
      });
    });
  });
});
