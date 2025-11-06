/**
 * BunBackgroundTasks - Bun-specific Background Tasks Implementation
 *
 * Responsibility: Execute non-blocking background tasks in Bun runtime
 * Pattern: Strategy Pattern (IBackgroundTasks implementation)
 * Principles: SOLID, Guard Clauses, Functional
 *
 * Key Differences from Node.js:
 * - Bun has stricter unhandled rejection detection
 * - Uses queueMicrotask instead of setImmediate
 * - All promises explicitly handled to prevent warnings
 */

import type {
  BackgroundTask,
  BackgroundTaskOptions,
  IBackgroundTasks,
} from '../domain/IBackgroundTasks';
import { extractLoggerErrorInfo } from '../infrastructure/ErrorExtractor';
import { getComponentLogger } from '../infrastructure/LoggerHelper';

/**
 * Bun-specific Background tasks implementation
 */
export class BunBackgroundTasks implements IBackgroundTasks {
  /** Warning threshold in milliseconds */
  private readonly WARNING_THRESHOLD_MS = 100;

  /** Default timeout in milliseconds */
  private readonly DEFAULT_TIMEOUT_MS = 30000;

  /** Tasks counter for debugging */
  private tasksExecuted = 0;

  /**
   * Adds a task to be executed in the background
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
   * Bun-specific: Uses queueMicrotask and explicit Promise handling
   */
  private executeTask(task: BackgroundTask, options?: BackgroundTaskOptions): void {
    const taskName = options?.name ?? `task-${++this.tasksExecuted}`;
    const timeout = options?.timeout ?? this.DEFAULT_TIMEOUT_MS;
    const startTime = Date.now();

    // Use queueMicrotask (Bun-optimized) instead of setImmediate
    queueMicrotask(() => {
      this.runTask(task, taskName, timeout, startTime, options);
    });
  }

  /**
   * Run task with full error handling
   * All errors are caught - this method never throws
   * Bun-specific: Wraps everything in try-catch to prevent unhandled rejections
   */
  private runTask(
    task: BackgroundTask,
    taskName: string,
    timeout: number,
    startTime: number,
    options?: BackgroundTaskOptions,
  ): void {
    // Create a promise that NEVER rejects
    (async () => {
      try {
        // Execute task with timeout
        await Promise.race([
          this.executeWithMonitoring(task, taskName, startTime, options),
          this.createTimeout(timeout, taskName),
        ]);
      } catch (error: unknown) {
        // All errors (task errors + timeouts) land here
        const errorInfo = extractLoggerErrorInfo(error);
        const logger = getComponentLogger('background-tasks');
        logger.error(
          {
            taskName,
            error: errorInfo,
          },
          'Background task failed or timed out',
        );
      }
    })().catch(() => {
      // Safety net: Should never reach here
      // But Bun requires explicit handling
    });
  }

  /**
   * Execute task with performance monitoring
   */
  private async executeWithMonitoring(
    task: BackgroundTask,
    taskName: string,
    startTime: number,
    options?: BackgroundTaskOptions,
  ): Promise<void> {
    try {
      await task();

      const duration = Date.now() - startTime;

      // Warn if task took too long
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
    } catch (error: unknown) {
      // Log error
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

      // Re-throw to be caught by runTask
      throw error;
    }
  }

  /**
   * Create timeout promise
   */
  private async createTimeout(timeout: number, taskName: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Background task '${taskName}' timed out after ${timeout}ms`));
      }, timeout);
    });
  }

  /**
   * Gets total number of tasks executed
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
