/**
 * Documentation endpoints E2E tests
 * Testing /, /docs, /redoc, and /openapi.json
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ErrorHandler } from '../../src/application/ErrorHandler';
import { RouteRegistry } from '../../src/application/RouteRegistry';
import { SyntroJS } from '../../src/core';

describe('Documentation Endpoints E2E', () => {
  let app: SyntroJS;
  let server: string;

  beforeEach(() => {
    app = new SyntroJS({
      title: 'Test API',
      version: '1.0.0',
      description: 'Test API description',
    });
    RouteRegistry.clear();
    ErrorHandler.clearCustomHandlers();
  });

  afterEach(async () => {
    if (server) {
      try {
        await app.close();
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  describe('Root route (/)', () => {
    it('should serve welcome page', async () => {
      server = await app.listen(0);
      const port = new URL(server).port;

      const response = await fetch(`http://localhost:${port}/`);
      const html = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/html');
      expect(html).toContain('Test API');
      expect(html).toContain('API is running successfully');
      expect(html).toContain('Swagger UI');
      expect(html).toContain('ReDoc');
      expect(html).toContain('Powered by SyntroJS');
    });

    it('should include links to docs endpoints', async () => {
      server = await app.listen(0);
      const port = new URL(server).port;

      const response = await fetch(`http://localhost:${port}/`);
      const html = await response.text();

      expect(html).toContain('href="/docs"');
      expect(html).toContain('href="/redoc"');
      expect(html).toContain('href="/openapi.json"');
    });
  });

  describe('/openapi.json', () => {
    it('should serve OpenAPI spec', async () => {
      app.get('/users', {
        tags: ['users'],
        summary: 'List users',
        handler: () => ({ users: [] }),
      });

      server = await app.listen(0);
      const port = new URL(server).port;

      const response = await fetch(`http://localhost:${port}/openapi.json`);
      const spec = await response.json();

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('application/json');
      expect(spec.openapi).toBe('3.1.0');
      expect(spec.info.title).toBe('Test API');
      expect(spec.paths['/users']).toBeDefined();
    });
  });

  describe('/docs (Swagger UI)', () => {
    it('should serve Swagger UI HTML', async () => {
      server = await app.listen(0);
      const port = new URL(server).port;

      const response = await fetch(`http://localhost:${port}/docs`);
      const html = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/html');
      expect(html).toContain('Swagger UI');
      expect(html).toContain('/openapi.json');
      expect(html).toContain('swagger-ui-bundle.js');
    });

    it('should include API title in Swagger UI', async () => {
      server = await app.listen(0);
      const port = new URL(server).port;

      const response = await fetch(`http://localhost:${port}/docs`);
      const html = await response.text();

      expect(html).toContain('Test API');
    });
  });

  describe('/redoc (ReDoc)', () => {
    it('should serve ReDoc HTML', async () => {
      server = await app.listen(0);
      const port = new URL(server).port;

      const response = await fetch(`http://localhost:${port}/redoc`);
      const html = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/html');
      expect(html).toContain('ReDoc');
      expect(html).toContain('/openapi.json');
      expect(html).toContain('redoc.standalone.js');
    });

    it('should include API title in ReDoc', async () => {
      server = await app.listen(0);
      const port = new URL(server).port;

      const response = await fetch(`http://localhost:${port}/redoc`);
      const html = await response.text();

      expect(html).toContain('Test API');
    });
  });

  describe('Integration', () => {
    it('should have all documentation endpoints working together', async () => {
      app.get('/test', {
        tags: ['test'],
        summary: 'Test endpoint',
        handler: () => ({ message: 'test' }),
      });

      server = await app.listen(0);
      const port = new URL(server).port;
      const baseUrl = `http://localhost:${port}`;

      // Check all endpoints respond
      const [rootRes, openApiRes, docsRes, redocRes] = await Promise.all([
        fetch(`${baseUrl}/`),
        fetch(`${baseUrl}/openapi.json`),
        fetch(`${baseUrl}/docs`),
        fetch(`${baseUrl}/redoc`),
      ]);

      expect(rootRes.status).toBe(200);
      expect(openApiRes.status).toBe(200);
      expect(docsRes.status).toBe(200);
      expect(redocRes.status).toBe(200);

      // Verify OpenAPI spec is valid
      const spec = await openApiRes.json();
      expect(spec.paths['/test']).toBeDefined();
    });
  });
});
