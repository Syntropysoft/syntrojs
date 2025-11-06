/**
 * IBackgroundTasks - Domain Interface
 *
 * Contract for background task execution
 * Allows different implementations for Node.js vs Bun
 */

/**
 * Background task function type
 */
export type BackgroundTask = () => void | Promise<void>;

/**
 * Background task options
 */
export interface BackgroundTaskOptions {
  /** Task name for logging/debugging */
  name?: string;

  /** Timeout in milliseconds (default: 30000 = 30s) */
  timeout?: number;

  /** Callback when task completes */
  onComplete?: () => void;

  /** Callback when task fails */
  onError?: (error: unknown) => void;
}

/**
 * Background Tasks Interface
 * Strategy Pattern: Different implementations for Node.js vs Bun
 */
export interface IBackgroundTasks {
  /**
   * Adds a task to be executed in the background
   *
   * @param task - Task function to execute
   * @param options - Task options
   */
  addTask(task: BackgroundTask, options?: BackgroundTaskOptions): void;

  /**
   * Gets total number of tasks executed
   * Useful for testing and monitoring
   */
  getTasksExecuted(): number;

  /**
   * Resets task counter (useful for testing)
   */
  resetCounter(): void;
}
