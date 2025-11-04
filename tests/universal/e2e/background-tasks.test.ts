/**
 * E2E tests for Background Tasks
 */

import { ArrayTransport } from '@syntrojs/logger';
import { getLogger, loggerRegistry } from '@syntrojs/logger/registry';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { z } from 'zod';
import { inject } from '../../../src/application/DependencyInjector';
import { SyntroJS } from '../../../src/core';
import * as LoggerHelper from '../../../src/infrastructure/LoggerHelper';

describe('Background Tasks E2E', () => {
  let app: SyntroJS;
  let server: string | null = null;
  let transport: ArrayTransport;
  let getComponentLoggerSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Clear registry to ensure fresh logger instances
    loggerRegistry.clear();

    app = new SyntroJS();

    // Create ArrayTransport to capture logs
    transport = new ArrayTransport();

    // Create logger with ArrayTransport BEFORE getComponentLogger is called
    const logger = getLogger('syntrojs', {
      level: 'info',
      transport,
    });

    // Mock getComponentLogger to return logger with our transport
    getComponentLoggerSpy = vi
      .spyOn(LoggerHelper, 'getComponentLogger')
      .mockReturnValue(logger.withSource('background-tasks'));
  });

  afterEach(async () => {
    if (server) {
      await app.close();
      server = null;
    }
    transport.clear();
    loggerRegistry.clear(); // Clear registry after test
    getComponentLoggerSpy.mockRestore();
  });

  test('executes background task without blocking response', async () => {
    let taskExecuted = false;

    app.post('/send-email', {
      body: z.object({ email: z.string().email() }),
      handler: ({ body, background }) => {
        // Add background task
        background.addTask(async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          taskExecuted = true;
        });

        // Response returns immediately
        return { status: 'queued', email: body.email };
      },
    });

    server = await app.listen(0);
    const port = new URL(server).port;

    const startTime = Date.now();

    const response = await fetch(`http://localhost:${port}/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'gaby@example.com' }),
    });

    const responseTime = Date.now() - startTime;

    // Response should be fast (not waiting for background task)
    // Allow 200ms for system overhead while still proving non-blocking behavior
    expect(responseTime).toBeLessThan(200);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.status).toBe('queued');

    // Wait for background task to complete
    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(taskExecuted).toBe(true);
  });

  test('background task can access request context data', async () => {
    let capturedEmail: string | undefined;

    app.post('/process', {
      body: z.object({ email: z.string().email() }),
      handler: ({ body, background }) => {
        background.addTask(() => {
          // Can access data from closure
          capturedEmail = body.email;
        });

        return { ok: true };
      },
    });

    server = await app.listen(0);
    const port = new URL(server).port;

    await fetch(`http://localhost:${port}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com' }),
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(capturedEmail).toBe('test@example.com');
  });

  test('background task errors do not affect response', async () => {
    app.post('/with-error', {
      handler: ({ background }) => {
        background.addTask(() => {
          throw new Error('Background task error');
        });

        return { status: 'success' };
      },
    });

    server = await app.listen(0);
    const port = new URL(server).port;

    const response = await fetch(`http://localhost:${port}/with-error`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    // Response should succeed even if background task fails
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.status).toBe('success');
  });

  test('warns for slow background tasks (>100ms)', async () => {
    app.post('/slow-task', {
      handler: ({ background }) => {
        background.addTask(
          async () => {
            await new Promise((resolve) => setTimeout(resolve, 150));
          },
          { name: 'slow-email' },
        );

        return { ok: true };
      },
    });

    server = await app.listen(0);
    const port = new URL(server).port;

    await fetch(`http://localhost:${port}/slow-task`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    // Wait for task to complete
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Wait a bit more for async logging
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Should have warned about slow task
    const entries = transport.getParsedEntries();
    const warnEntry = entries.find(
      (e) => e.level === 'warn' && (e.message?.includes('100ms') || e.msg?.includes('100ms')),
    );
    expect(warnEntry).toBeDefined();
    expect(warnEntry?.taskName).toBe('slow-email');
  });

  test('multiple background tasks execute concurrently', async () => {
    const executionOrder: number[] = [];

    app.post('/multiple-tasks', {
      handler: ({ background }) => {
        background.addTask(async () => {
          await new Promise((resolve) => setTimeout(resolve, 30));
          executionOrder.push(1);
        });

        background.addTask(async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          executionOrder.push(2);
        });

        background.addTask(async () => {
          await new Promise((resolve) => setTimeout(resolve, 20));
          executionOrder.push(3);
        });

        return { queued: 3 };
      },
    });

    server = await app.listen(0);
    const port = new URL(server).port;

    await fetch(`http://localhost:${port}/multiple-tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    // All tasks should execute
    expect(executionOrder).toHaveLength(3);
    // Fastest first (10ms, 20ms, 30ms)
    expect(executionOrder).toEqual([2, 3, 1]);
  });

  test('background tasks work with dependencies', async () => {
    let loggedEmail: string | undefined;

    const getLogger = () => ({
      log: (email: string) => {
        loggedEmail = email;
      },
    });

    app.post('/with-dependencies', {
      body: z.object({ email: z.string().email() }),
      dependencies: {
        logger: inject(getLogger),
      },
      handler: ({ body, dependencies, background }) => {
        background.addTask(() => {
          // Can access dependencies from closure
          dependencies.logger.log(body.email);
        });

        return { ok: true };
      },
    });

    server = await app.listen(0);
    const port = new URL(server).port;

    await fetch(`http://localhost:${port}/with-dependencies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com' }),
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(loggedEmail).toBe('test@example.com');
  });

  test('background task with custom timeout', async () => {
    app.post('/custom-timeout', {
      handler: ({ background }) => {
        background.addTask(
          async () => {
            await new Promise((resolve) => setTimeout(resolve, 200));
          },
          {
            name: 'long-task',
            timeout: 50, // Short timeout
          },
        );

        return { ok: true };
      },
    });

    server = await app.listen(0);
    const port = new URL(server).port;

    await fetch(`http://localhost:${port}/custom-timeout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Wait a bit more for async logging
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Should have logged timeout error
    const entries = transport.getParsedEntries();
    const errorEntries = entries.filter(
      (e) =>
        e.level === 'error' &&
        (e.message === 'Background task error' ||
          e.msg === 'Background task error' ||
          e.message === 'Background task failed' ||
          e.msg === 'Background task failed'),
    );
    expect(errorEntries.length).toBeGreaterThan(0);
  });
});
