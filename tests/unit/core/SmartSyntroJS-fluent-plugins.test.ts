import { beforeEach, describe, expect, it } from 'vitest';
import { SmartSyntroJS } from '../../../src/core/SmartSyntroJS';

describe('SmartSyntroJS Fluent Plugins API', () => {
  let app: SmartSyntroJS;

  beforeEach(() => {
    app = new SmartSyntroJS({ title: 'Test API' });
  });

  it('should enable CORS with default options', () => {
    const result = app.withCors();
    expect(result).toBe(app);
    expect((app as any)._withCors).toBe(true);
  });

  it('should enable CORS with custom options', () => {
    const options = { origin: ['https://example.com'] };
    const result = app.withCors(options);
    expect(result).toBe(app);
    expect((app as any)._corsOptions).toEqual(options);
  });

  it('should enable security headers', () => {
    const result = app.withSecurity();
    expect(result).toBe(app);
    expect((app as any)._withSecurity).toBe(true);
  });

  it('should enable compression', () => {
    const result = app.withCompression();
    expect(result).toBe(app);
    expect((app as any)._withCompression).toBe(true);
  });

  it('should enable rate limiting', () => {
    const result = app.withRateLimit();
    expect(result).toBe(app);
    expect((app as any)._withRateLimit).toBe(true);
  });

  it('should chain multiple plugins', () => {
    const result = app.withCors().withSecurity().withCompression().withRateLimit();

    expect(result).toBe(app);
    expect((app as any)._withCors).toBe(true);
    expect((app as any)._withSecurity).toBe(true);
    expect((app as any)._withCompression).toBe(true);
    expect((app as any)._withRateLimit).toBe(true);
  });

  it('should apply development defaults', () => {
    const result = app.withDevelopmentDefaults();
    expect(result).toBe(app);
    expect((app as any)._withCors).toBe(true);
    expect((app as any)._withSecurity).toBe(true);
    expect((app as any)._withCompression).toBe(true);
    expect((app as any)._withLogging).toBe(true);
    expect((app as any)._withOpenAPI).toBe(true);
  });

  it('should apply production defaults', () => {
    const result = app.withProductionDefaults();
    expect(result).toBe(app);
    expect((app as any)._withCors).toBe(true);
    expect((app as any)._withSecurity).toBe(true);
    expect((app as any)._withCompression).toBe(true);
    expect((app as any)._withRateLimit).toBe(true);
    expect((app as any)._withLogging).toBe(true);
  });

  it('should return default CORS options for development', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const _result = app.withCors();
    expect((app as any)._corsOptions).toMatchObject({
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    });

    process.env.NODE_ENV = originalEnv;
  });

  it('should return default CORS options for production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const _result = app.withCors();
    expect((app as any)._corsOptions).toMatchObject({
      origin: [],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    });

    process.env.NODE_ENV = originalEnv;
  });
});
