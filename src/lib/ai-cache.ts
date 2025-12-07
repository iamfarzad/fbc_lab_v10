/**
 * AI Cache Utilities
 * Uses Vercel KV for production-ready caching with in-memory fallback for local development.
 * 
 * NOTE: @vercel/kv is Vercel-specific and not available on Fly.io.
 * This file uses lazy dynamic imports to gracefully handle missing package.
 */

export const CACHE_TTL = {
  SHORT: 60 * 5, // 5 minutes
  MEDIUM: 60 * 30, // 30 minutes
  LONG: 60 * 60 * 2, // 2 hours
  VERY_LONG: 60 * 60 * 24, // 24 hours
} as const

// In-memory cache for local dev
const memoryCache = new Map<string, { value: any; expires: number }>()

// Lazy load @vercel/kv - may not be available on Fly.io
// Check environment first to avoid import attempts on Fly.io
const isFlyIO = process.env.FLY_APP_NAME !== undefined || process.env.FLY_REGION !== undefined;
let kv: any = null;
let kvLoadAttempted = false;

async function getKV(): Promise<any> {
  // Skip entirely on Fly.io
  if (isFlyIO) {
    return null;
  }
  
  if (kvLoadAttempted) {
    return kv;
  }
  
  kvLoadAttempted = true;
  
  try {
    // Only attempt import if not on Fly.io
    const kvModule = await import('@vercel/kv');
    kv = kvModule.kv;
  } catch (error) {
    // @vercel/kv not available - will use in-memory cache only
    kv = null;
  }
  
  return kv;
}

export function createCachedFunction<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options?: {
    ttl?: number
    keyPrefix?: string
    keyGenerator?: (...args: Parameters<T>) => string
  }
): T {
  const ttl = options?.ttl ?? CACHE_TTL.MEDIUM
  const prefix = options?.keyPrefix ?? 'ai-cache'
  
  return (async (...args: Parameters<T>) => {
    const key = options?.keyGenerator 
      ? `${prefix}:${options.keyGenerator(...args)}`
      : `${prefix}:${JSON.stringify(args)}`
    
    // 1. Try Vercel KV first (production) - only if available
    try {
      const kvClient = await getKV();
      if (kvClient && process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
        const cached = await kvClient.get(key)
        if (cached) return cached
      }
    } catch (err) {
      // Ignore KV errors, fall back to memory/fresh fetch
    }

    // 2. Fallback to in-memory cache (local/backup)
    const memEntry = memoryCache.get(key)
    if (memEntry && memEntry.expires > Date.now()) {
      return memEntry.value
    }
    
    // 3. Execute function
    const result = await fn(...args)
    
    // 4. Store in cache
    const now = Date.now()
    
    // Store in KV (if available)
    try {
      const kvClient = await getKV();
      if (kvClient && process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
        // fire-and-forget
        void kvClient.setex(key, ttl, result).catch(() => {})
      }
    } catch { /* ignore */ }

    // Store in memory
    memoryCache.set(key, { value: result, expires: now + ttl * 1000 })
    
    // Cleanup expired memory entries periodically (simple probabilistic check)
    if (Math.random() < 0.01) { 
      for (const [k, v] of memoryCache.entries()) {
        if (v.expires < now) memoryCache.delete(k)
      }
    }
    
    return result
  }) as T
}

