/**
 * AI Cache Utilities - Stub
 * TODO: Implement caching functionality
 */

export const CACHE_TTL = {
  SHORT: 60 * 5, // 5 minutes
  MEDIUM: 60 * 30, // 30 minutes
  LONG: 60 * 60 * 2, // 2 hours
  VERY_LONG: 60 * 60 * 24, // 24 hours
} as const

export function createCachedFunction<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  _options?: {
    ttl?: number
    keyPrefix?: string
    keyGenerator?: (...args: Parameters<T>) => string
  }
): T {
  // Stub: Return function as-is without caching
  console.warn('createCachedFunction() called but caching not implemented')
  return fn
}

