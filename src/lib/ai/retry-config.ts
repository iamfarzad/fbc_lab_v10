/**
 * Configuration for AI retry logic
 * Adjust these settings based on your needs
 */

import { GEMINI_MODELS } from '../../config/constants.js'

export const RETRY_CONFIG = {
  // Timeout settings (in milliseconds)
  timeouts: {
    fast: 15_000,      // 15 seconds - for quick responses
    standard: 30_000,  // 30 seconds - for normal requests
    reliable: 45_000,  // 45 seconds - for critical requests
    batch: 20_000,     // 20 seconds - for batch processing
  },

  // Model preferences
  models: {
    // Primary models (auto-update to latest)
    primary: GEMINI_MODELS.FLASH_LATEST,
    primaryStream: GEMINI_MODELS.FLASH_LATEST,
    primaryReliable: GEMINI_MODELS.DEFAULT_CHAT,

    // Fallback models (faster/more available)
    fallback: GEMINI_MODELS.FLASH_LATEST,
    fallbackFast: GEMINI_MODELS.FLASH_LITE_LATEST,
    fallbackReliable: GEMINI_MODELS.FLASH_LATEST,

    // Final fallback (most available)
    final: GEMINI_MODELS.FLASH_LITE_LATEST,
  },

  // Retry behavior
  retry: {
    maxAttempts: 5,           // Maximum number of retry attempts
    baseDelay: 1000,          // Base delay between retries (ms)
    maxDelay: 10000,          // Maximum delay between retries (ms)
    backoffMultiplier: 2,     // Exponential backoff multiplier
  },

  // Rate limiting
  rateLimit: {
    requestsPerMinute: 50,    // Conservative limit
    burstLimit: 10,           // Burst requests allowed
    delayBetweenBatches: 100, // Delay between batch requests (ms)
  },

  // Error handling
  errors: {
    retryable: [
      'rate_limit_exceeded',
      'request_timeout',
      'service_unavailable',
      'internal_server_error',
      'too_many_requests',
    ],
    notRetryable: [
      'invalid_api_key',
      'quota_exceeded',
      'model_not_found',
      'bad_request',
      'forbidden',
    ],
  },
};

/**
 * Get timeout based on request type
 */
export function getTimeout(type: 'fast' | 'standard' | 'reliable' | 'batch' = 'standard'): number {
  return RETRY_CONFIG.timeouts[type];
}

/**
 * Check if an error should be retried
 */
export function shouldRetry(error: Error): boolean {
  const errorMessage = error.message.toLowerCase();

  return RETRY_CONFIG.errors.retryable.some(retryableError =>
    errorMessage.includes(retryableError.toLowerCase())
  );
}

export interface RetryConfig {
  maxAttempts: number
  baseDelay: number
  maxDelay: number
  backoffMultiplier: number
}

export interface RetryBackoffConfig {
  baseDelay: number
  maxDelay: number
  backoffMultiplier: number
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: RETRY_CONFIG.retry.maxAttempts,
  baseDelay: RETRY_CONFIG.retry.baseDelay,
  maxDelay: RETRY_CONFIG.retry.maxDelay,
  backoffMultiplier: RETRY_CONFIG.retry.backoffMultiplier
}

export const DEFAULT_RETRY_BACKOFF_CONFIG: RetryBackoffConfig = {
  baseDelay: DEFAULT_RETRY_CONFIG.baseDelay,
  maxDelay: DEFAULT_RETRY_CONFIG.maxDelay,
  backoffMultiplier: DEFAULT_RETRY_CONFIG.backoffMultiplier
}

export const DEFAULT_MAX_ATTEMPTS = DEFAULT_RETRY_CONFIG.maxAttempts
export const DEFAULT_BASE_RETRY_DELAY = DEFAULT_RETRY_CONFIG.baseDelay
export const DEFAULT_MAX_RETRY_DELAY = DEFAULT_RETRY_CONFIG.maxDelay
export const DEFAULT_BACKOFF_MULTIPLIER = DEFAULT_RETRY_CONFIG.backoffMultiplier

/**
 * Calculate exponential backoff delay with max cap
 */
export function calculateBackoffDelay(
  attempt: number,
  config: RetryBackoffConfig = DEFAULT_RETRY_BACKOFF_CONFIG
): number {
  if (attempt <= 0) return 0
  const delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1)
  return Math.min(delay, config.maxDelay)
}

/**
 * Get delay for retry attempt (exponential backoff)
 */
export function getRetryDelay(attempt: number): number {
  return calculateBackoffDelay(attempt, DEFAULT_RETRY_BACKOFF_CONFIG)
}

