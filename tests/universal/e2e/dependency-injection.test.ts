/**
 * E2E tests for Dependency Injection
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { DependencyInjector, inject } from '../../../src/application/DependencyInjector';
import { SyntroJS } from '../../../src/core';

interface MockDb {
  users: { findAll: () => { id: number; name: string }[] };
  instanceId: number;
}

interface MockDep {
  name: string;
}

interface ResponseData {
  instance: number;
}

interface AsyncDb {
  users: { findAll: () => { id: number; name: string }[] };
}

interface CleanupDb {
  query: () => string;
}

interface LoggerContext {
  correlationId: string;
}

describe('Dependency Injection E2E', () => {
  let app: SyntroJS;
  let server: string | null = null;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    app = new SyntroJS();
    DependencyInjector.clearSingletons();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    if (server) {
      await app.close();
      server = null;
    }
    DependencyInjector.clearSingletons();
    consoleErrorSpy.mockRestore();
  });

  test('injects request-scoped dependency', async () => {
    let instanceCount = 0;

    const getDb = () => {
      instanceCount++;
      return {
        users: {
          findAll: () => [{ id: 1, name: 'Gaby' }],
        },
        instanceId: instanceCount,
      };
    };

    app.get('/users', {
      dependencies: {
        db: inject(getDb), // Request scope
      },
      handler: ({ dependencies }) => {
        return {
          users: (dependencies.db as MockDb).users.findAll(),
          instance: (dependencies.db as MockDb).instanceId,
        };
      },
    });

    server = await app.listen(0);
    const port = new URL(server).port;

    // First request
    const response1 = await fetch(`http://localhost:${port}/users`);
    const data1 = await response1.json();

    // Second request
    const response2 = await fetch(`http://localhost:${port}/users`);
    const data2 = await response2.json();

    // Each request should get a new instance
    expect((data1 as ResponseData).instance).toBe(1);
    expect((data2 as ResponseData).instance).toBe(2);
    expect(instanceCount).toBe(2);
  });

  test('injects singleton dependency', async () => {
    let instanceCount = 0;

    const getConfig = () => {
      instanceCount++;
      return {
        apiKey: 'secret-key',
        instanceId: instanceCount,
      };
    };

    app.get('/config', {
      dependencies: {
        config: inject(getConfig, { scope: 'singleton' }),
      },
      handler: ({ dependencies }) => {
        return { config: dependencies.config };
      },
    });

    server = await app.listen(0);
    const port = new URL(server).port;

    // First request
    const response1 = await fetch(`http://localhost:${port}/config`);
    const data1 = await response1.json();

    // Second request
    const response2 = await fetch(`http://localhost:${port}/config`);
    const data2 = await response2.json();

    // Both requests should get the same instance
    expect(data1.config.instanceId).toBe(1);
    expect(data2.config.instanceId).toBe(1); // Same instance
    expect(instanceCount).toBe(1); // Only created once
  });

  test('injects multiple dependencies', async () => {
    const getDb = () => ({ name: 'db' });
    const getCache = () => ({ name: 'cache' });
    const getLogger = () => ({ name: 'logger' });

    app.get('/multi', {
      dependencies: {
        db: inject(getDb),
        cache: inject(getCache),
        logger: inject(getLogger),
      },
      handler: ({ dependencies }) => {
        return {
          db: (dependencies.db as MockDep).name,
          cache: (dependencies.cache as MockDep).name,
          logger: (dependencies.logger as MockDep).name,
        };
      },
    });

    server = await app.listen(0);
    const port = new URL(server).port;

    const response = await fetch(`http://localhost:${port}/multi`);
    const data = await response.json();

    expect(data).toEqual({
      db: 'db',
      cache: 'cache',
      logger: 'logger',
    });
  });

  test('async dependency injection', async () => {
    const getDb = async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return {
        users: {
          findAll: () => [{ id: 1, name: 'Async User' }],
        },
      };
    };

    app.get('/async-dep', {
      dependencies: {
        db: inject(getDb),
      },
      handler: async ({ dependencies }) => {
        return (dependencies.db as AsyncDb).users.findAll();
      },
    });

    server = await app.listen(0);
    const port = new URL(server).port;

    const response = await fetch(`http://localhost:${port}/async-dep`);
    const data = await response.json();

    expect(data).toEqual([{ id: 1, name: 'Async User' }]);
  });

  test('dependency cleanup is called after request', async () => {
    let cleanupCalled = false;

    const getDb = () => ({
      query: () => 'result',
    });

    app.get('/with-cleanup', {
      dependencies: {
        db: inject(getDb, {
          cleanup: async () => {
            await new Promise((resolve) => setTimeout(resolve, 10));
            cleanupCalled = true;
          },
        }),
      },
      handler: ({ dependencies }) => {
        return { result: (dependencies.db as CleanupDb).query() };
      },
    });

    server = await app.listen(0);
    const port = new URL(server).port;

    await fetch(`http://localhost:${port}/with-cleanup`);

    // Wait for cleanup to execute
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(cleanupCalled).toBe(true);
  });

  test('dependency with request context access', async () => {
    let receivedCorrelationId: string | undefined;

    const getLogger = (context: LoggerContext) => {
      receivedCorrelationId = context.correlationId;
      return {
        log: (msg: string) => msg,
      };
    };

    app.get('/context-dep', {
      dependencies: {
        logger: inject(getLogger),
      },
      handler: ({ dependencies }) => {
        return { ok: true };
      },
    });

    server = await app.listen(0);
    const port = new URL(server).port;

    const correlationId = 'test-correlation-123';

    await fetch(`http://localhost:${port}/context-dep`, {
      headers: {
        'x-correlation-id': correlationId,
      },
    });

    expect(receivedCorrelationId).toBe(correlationId);
  });

  test('mixing singleton and request-scoped dependencies', async () => {
    let configCreations = 0;
    let dbCreations = 0;

    const getConfig = () => {
      configCreations++;
      return { env: 'test' };
    };

    const getDb = () => {
      dbCreations++;
      return { connection: 'active' };
    };

    app.get('/mixed', {
      dependencies: {
        config: inject(getConfig, { scope: 'singleton' }),
        db: inject(getDb), // Request scope
      },
      handler: ({ dependencies }) => {
        return {
          config: dependencies.config,
          db: dependencies.db,
        };
      },
    });

    server = await app.listen(0);
    const port = new URL(server).port;

    // Make 3 requests
    await fetch(`http://localhost:${port}/mixed`);
    await fetch(`http://localhost:${port}/mixed`);
    await fetch(`http://localhost:${port}/mixed`);

    // Config created once (singleton), DB created 3 times (request-scoped)
    expect(configCreations).toBe(1);
    expect(dbCreations).toBe(3);
  });

  test('dependency error handling', async () => {
    const getBrokenDb = () => {
      throw new Error('Database connection failed');
    };

    app.get('/broken-dep', {
      dependencies: {
        db: inject(getBrokenDb),
      },
      handler: ({ dependencies }) => {
        return { ok: true };
      },
    });

    server = await app.listen(0);
    const port = new URL(server).port;

    // Fetching the route should result in a 500 due to dependency error
    const response = await fetch(`http://localhost:${port}/broken-dep`);

    // Should return 500 error
    expect(response.status).toBe(500);
    const errorBody = await response.json();
    expect(errorBody.detail).toBe('Database connection failed');
  });
});
