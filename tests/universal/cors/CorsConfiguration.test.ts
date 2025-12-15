/**
 * Tests for CORS Configuration
 *
 * Verifies that CORS is configured correctly with options
 */

import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { RouteRegistry } from '../../../src/application/RouteRegistry';
import { SyntroJS } from '../../../src/core/SyntroJS';

describe('CORS Configuration', () => {
  beforeEach(() => {
    RouteRegistry.clear();
  });

  describe('Boolean CORS configuration', () => {
    it('should enable CORS with default options when cors: true', async () => {
      const app = new SyntroJS({
        fluentConfig: {
          cors: true,
        },
      });

      app.get('/test', {
        handler: () => ({ message: 'test' }),
      });

      const server = await app.listen(0);
      const port = new URL(server).port;

      // Test OPTIONS request (preflight)
      const response = await fetch(`http://localhost:${port}/test`, {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://localhost:3000',
          'Access-Control-Request-Method': 'GET',
        },
      });

      expect(response.status).toBe(204); // No Content for OPTIONS
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeTruthy();
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('OPTIONS');

      await app.close();
    });
  });

  describe('CORS Options configuration', () => {
    it('should configure CORS with custom options', async () => {
      const app = new SyntroJS({
        fluentConfig: {
          cors: {
            origin: 'http://localhost:3000',
            credentials: true,
            methods: ['GET', 'POST', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization'],
          },
        },
      });

      app.get('/test', {
        handler: () => ({ message: 'test' }),
      });

      const server = await app.listen(0);
      const port = new URL(server).port;

      // Test OPTIONS request (preflight)
      const response = await fetch(`http://localhost:${port}/test`, {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://localhost:3000',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Content-Type',
        },
      });

      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
      expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('OPTIONS');

      await app.close();
    });

    it('should handle CORS preflight requests correctly', async () => {
      const app = new SyntroJS({
        fluentConfig: {
          cors: {
            origin: true,
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'x-user-id', 'Authorization'],
          },
        },
      });

      app.post('/users', {
        handler: () => ({ id: 1 }),
      });

      const server = await app.listen(0);
      const port = new URL(server).port;

      // Test OPTIONS preflight request
      const preflightResponse = await fetch(`http://localhost:${port}/users`, {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://localhost:3000',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type,Authorization',
        },
      });

      expect(preflightResponse.status).toBe(204);
      expect(preflightResponse.headers.get('Access-Control-Allow-Origin')).toBeTruthy();
      expect(preflightResponse.headers.get('Access-Control-Allow-Methods')).toContain('POST');
      expect(preflightResponse.headers.get('Access-Control-Allow-Headers')).toContain(
        'Content-Type',
      );
      expect(preflightResponse.headers.get('Access-Control-Allow-Headers')).toContain(
        'Authorization',
      );

      // Test actual POST request
      const postResponse = await fetch(`http://localhost:${port}/users`, {
        method: 'POST',
        headers: {
          Origin: 'http://localhost:3000',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Test' }),
      });

      expect(postResponse.status).toBe(200);
      expect(postResponse.headers.get('Access-Control-Allow-Origin')).toBeTruthy();

      await app.close();
    });
  });

  describe('CORS disabled', () => {
    it('should not add CORS headers when cors is false', async () => {
      const app = new SyntroJS({
        fluentConfig: {
          cors: false,
        },
      });

      app.get('/test', {
        handler: () => ({ message: 'test' }),
      });

      const server = await app.listen(0);
      const port = new URL(server).port;

      const response = await fetch(`http://localhost:${port}/test`, {
        method: 'GET',
        headers: {
          Origin: 'http://localhost:3000',
        },
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();

      await app.close();
    });
  });
});
