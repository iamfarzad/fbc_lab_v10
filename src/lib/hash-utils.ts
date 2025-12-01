/**
 * Hash Generation Utilities
 * Single source of truth for content hashing (SHA-256)
 * Used for caching duplicate content analyses
 */

import { createHash } from 'crypto'

/**
 * Generate a consistent hash for content (URL, document, image, etc.)
 * Uses SHA-256 algorithm and returns first 16 characters
 * 
 * @param input - String or Buffer to hash
 * @param length - Length of hash substring to return (default: 16)
 * @returns Hex hash string
 */
export function generateHash(input: string | Buffer, length = 16): string {
  return createHash('sha256').update(input).digest('hex').substring(0, length)
}

