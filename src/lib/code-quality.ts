/**
 * Code Quality Utilities
 * Comprehensive code formatting, linting, and validation utilities
 * TypeScript type guards, error handling patterns, and coding standards
 */

import { truncateText as truncateTextUtil } from './text-utils.js'
import { safeParseJson } from './json.js'
import { AppError } from './errors.js'
import { logger } from './logger.js'

// Type guards for runtime type checking
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

export function isFunction(value: unknown): value is (...args: unknown[]) => unknown {
  return typeof value === 'function';
}

export function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

// Enhanced error handling with error codes
/**
 * @deprecated Use `AppError` from `src/lib/errors` instead.
 */
export class EnhancedError extends AppError {
  constructor(message: string, code: string, context?: Record<string, unknown>) {
    super({
      message,
      code,
      statusCode: 500,
      context: context ?? undefined
    })
  }
}

// Error codes for consistent error handling
export const ERROR_CODES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  DEVICE_NOT_FOUND: 'DEVICE_NOT_FOUND',
  INVALID_STATE: 'INVALID_STATE',
  OPERATION_FAILED: 'OPERATION_FAILED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  RATE_LIMITED: 'RATE_LIMITED',
  RESOURCE_EXHAUSTED: 'RESOURCE_EXHAUSTED',
} as const;

// Create typed errors with proper error codes
export function createError(message: string, code: keyof typeof ERROR_CODES, context?: Record<string, unknown>): EnhancedError {
  return new EnhancedError(message, ERROR_CODES[code], context);
}

// Utility function for safe JSON parsing
/**
 * Safe JSON parsing for STRING inputs (synchronous)
 * Use this when you have a JSON string and need a parsed object
 * 
 * For Response objects, use parseJsonSafe() from src/lib/json
 * 
 * @param json - JSON string to parse
 * @param fallback - Fallback value if parsing fails
 * @returns Parsed object or fallback value
 */
export function safeJSONParse<T>(json: string, fallback: T): T {
  return safeParseJson<T>(json, fallback, {
    onError: (error) => {
      console.warn('JSON parse failed:', error);
    }
  })
}

// Utility function for deep cloning objects
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }

  if (obj instanceof Array) {
    const cloned = obj.map((item: unknown) => deepClone(item))
    return cloned as T
  }

  if (typeof obj === 'object') {
    const cloned = {} as T;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }

  return obj;
}

// Utility function for debouncing function calls
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

// Utility function for throttling function calls
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

// Utility function for retrying async operations
export async function retry<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  delay: number = 1000,
  backoffMultiplier: number = 2,
  shouldRetry?: (error: Error, attempt: number) => boolean
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Check if we should retry this error
      if (shouldRetry && !shouldRetry(lastError, attempt)) {
        throw lastError; // Don't retry - throw immediately
      }
      
      if (attempt === maxAttempts) {
        throw lastError;
      }
      
      // Exponential backoff
      const currentDelay = delay * Math.pow(backoffMultiplier, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, currentDelay));
    }
  }
  
  throw lastError!;
}

// Utility function for timeout promises
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage?: string
): Promise<T> {
  const message = errorMessage ?? 'Timeout'
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => {
        reject(createError(message, 'TIMEOUT_ERROR', { timeoutMs }));
      }, timeoutMs)
    ),
  ]);
}

// Utility function for creating promise with abort signal
export function createAbortablePromise<T>(
  executor: (signal: AbortSignal) => Promise<T>
): { promise: Promise<T>; abort: () => void } {
  const controller = new AbortController();
  
  const promise = executor(controller.signal);
  
  const abort = () => {
    controller.abort();
  };
  
  return { promise, abort };
}

// Code formatting utilities
export class CodeFormatter {
  /**
   * Format file size in human readable format
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Format duration in human readable format
   */
  static formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
    
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  }

  /**
   * Format number with thousands separator
   */
  static formatNumber(num: number): string {
    return num.toLocaleString();
  }

  /**
   * Truncate text to specified length
   */
  static truncateText(text: string, maxLength: number, suffix = '...'): string {
    if (text.length <= maxLength) return text;
    // Delegate to text-utils for consistency
    return truncateTextUtil(text, maxLength - suffix.length) + suffix;
  }

  /**
   * Capitalize first letter of string
   */
  static capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }

  /**
   * Convert string to title case
   */
  static toTitleCase(text: string): string {
    return text.replace(/\w\S*/g, (match) => match.charAt(0).toUpperCase() + match.slice(1).toLowerCase());
  }

}

// Performance monitoring utilities
export class PerformanceMonitor {
  private static timers = new Map<string, number>();

  /**
   * Start timing a performance measurement
   */
  static startTimer(label: string): void {
    this.timers.set(label, performance.now());
  }

  /**
   * End timing and log performance measurement
   */
  static endTimer(label: string): number {
    const startTime = this.timers.get(label);
    if (!startTime) {
      console.warn(`Timer "${label}" was not started`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.timers.delete(label);
    
    logger.debug(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
    return duration;
  }

  /**
   * Measure function execution time
   */
  static async measureTime<T>(
    label: string,
    fn: () => Promise<T>
  ): Promise<{ result: T; duration: number }> {
    this.startTimer(label);
    const result = await fn();
    const duration = this.endTimer(label);
    
    return { result, duration };
  }

  /**
   * Get current memory usage
   */
  static getMemoryUsage(): number {
    interface PerformanceWithMemory extends Performance {
      memory?: {
        usedJSHeapSize: number
      }
    }
    if (typeof window !== 'undefined' && (performance as PerformanceWithMemory).memory) {
      return (performance as PerformanceWithMemory).memory!.usedJSHeapSize / 1024 / 1024; // MB
    }
    return 0;
  }

  /**
   * Log memory usage
   */
  static logMemoryUsage(): void {
    const usage = this.getMemoryUsage();
    logger.debug(`💾 Memory usage: ${usage.toFixed(2)} MB`);
  }
}

