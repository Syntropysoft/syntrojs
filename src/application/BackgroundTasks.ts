/**
 * BackgroundTasks - Application Service (Node.js Implementation)
 *
 * Responsibility: Execute non-blocking background tasks
 * Pattern: Strategy Pattern (IBackgroundTasks implementation for Node.js)
 * Principles: SOLID, Guard Clauses, Functional
 *
 * ⚠️ CRITICAL WARNING:
 * Background tasks are IN-PROCESS and designed ONLY for light I/O operations
 * (sending emails, logging events, cache updates).
 *
 * For CPU-bound operations (video processing, PDF generation, heavy computations),
 * use external job queues like BullMQ + Redis to avoid blocking the Event Loop.
 *
 * @example
 * ```typescript
 * // ✅ CORRECT: Light I/O
 * background.addTask(() => sendEmail(email));
 * background.addTask(() => logEvent(data));
 *
 * // ❌ WRONG: CPU-bound (blocks Event Loop)
 * background.addTask(() => processVideo(file)); // DON'T DO THIS!
 *
 * // ✅ CORRECT: Delegate to external queue
 * background.addTask(() => videoQueue.add({ url }));
 * ```
 */

import type {
  BackgroundTask,
  BackgroundTaskOptions,
  IBackgroundTasks,
} from '../domain/IBackgroundTasks';
import { extractLoggerErrorInfo } from '../infrastructure/ErrorExtractor';
import { getComponentLogger } from '../infrastructure/LoggerHelper';

// Re-export types for backwards compatibility
export type { BackgroundTask, BackgroundTaskOptions } from '../domain/IBackgroundTasks';

/**
 * Background tasks implementation (Node.js)
 */
class NodeBackgroundTasksImpl implements IBackgroundTasks {
  /** Warning threshold in milliseconds */
  private readonly WARNING_THRESHOLD_MS = 100;

  /** Default timeout in milliseconds */
  private readonly DEFAULT_TIMEOUT_MS = 30000;

  /** Tasks counter for debugging */
  private tasksExecuted = 0;

  /**
   * Adds a task to be executed in the background
   *
   * The task is executed asynchronously and does not block the response.
   * Tasks are "fire and forget" - errors are logged but do not affect the request.
   *
   * @param task - Task function to execute
   * @param options - Task options
   */
  addTask(task: BackgroundTask, options?: BackgroundTaskOptions): void {
    // Guard clause
    if (!task) {
      throw new Error('Task function is required');
    }

    if (typeof task !== 'function') {
      throw new Error('Task must be a function');
    }

    // Execute task asynchronously (don't await)
    this.executeTask(task, options);
  }

  /**
   * Executes a background task with monitoring
   *
   * @param task - Task function
   * @param options - Task options
   */
  private executeTask(task: BackgroundTask, options?: BackgroundTaskOptions): void {
    const taskName = options?.name ?? `task-${++this.tasksExecuted}`;
    const timeout = options?.timeout ?? this.DEFAULT_TIMEOUT_MS;
    const startTime = Date.now();

    // Execute task with timeout protection
    const taskPromise = Promise.resolve()
      .then(() => task())
      .then(() => {
        const duration = Date.now() - startTime;

        // Warn if task took too long (potential Event Loop blocking)
        if (duration > this.WARNING_THRESHOLD_MS) {
          const logger = getComponentLogger('background-tasks');
          logger.warn(
            {
              taskName,
              duration,
              threshold: this.WARNING_THRESHOLD_MS,
            },
            `Background task took too long (>${this.WARNING_THRESHOLD_MS}ms threshold). Consider using a job queue (BullMQ) for heavy operations.`,
          );
        }

        // Call onComplete callback
        if (options?.onComplete) {
          options.onComplete();
        }
      })
      .catch((error: unknown) => {
        // Log error but don't crash the server
        // Functional approach: extract error info safely
        const errorInfo = extractLoggerErrorInfo(error);
        const logger = getComponentLogger('background-tasks');
        logger.error(
          {
            taskName,
            error: errorInfo,
          },
          'Background task failed',
        );

        // Call onError callback
        if (options?.onError) {
          options.onError(error);
        }
      });

    // Apply timeout
    const timeoutPromise = new Promise<void>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Background task '${taskName}' timed out after ${timeout}ms`));
      }, timeout);
    });

    // Race: task vs timeout
    Promise.race([taskPromise, timeoutPromise]).catch((error: unknown) => {
      // Functional approach: extract error info safely
      const errorInfo = extractLoggerErrorInfo(error);
      const logger = getComponentLogger('background-tasks');
      logger.error(
        {
          taskName,
          error: errorInfo,
        },
        'Background task error',
      );
    });
  }

  /**
   * Gets total number of tasks executed
   * Useful for testing and monitoring
   */
  getTasksExecuted(): number {
    return this.tasksExecuted;
  }

  /**
   * Resets task counter (useful for testing)
   */
  resetCounter(): void {
    this.tasksExecuted = 0;
  }
}

/**
 * Factory: Create BackgroundTasks instance based on runtime
 * Strategy Pattern: Returns correct implementation for Node.js vs Bun
 */
function createBackgroundTasksForRuntime(): IBackgroundTasks {
  // Detect Bun runtime
  if (typeof (globalThis as any).Bun !== 'undefined') {
    const { BunBackgroundTasks } = require('./BunBackgroundTasks');
    return new BunBackgroundTasks();
  }

  // Default: Node.js
  return new NodeBackgroundTasksImpl();
}

/**
 * Exported singleton (Module Pattern)
 * Uses runtime-specific implementation
 */
export const BackgroundTasks = createBackgroundTasksForRuntime();

/**
 * Factory for testing
 */
export const createBackgroundTasks = (): IBackgroundTasks => createBackgroundTasksForRuntime();
