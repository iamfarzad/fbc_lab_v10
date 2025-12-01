/**
 * Json Type Guards and Utilities
 * 
 * Type-safe utilities for working with Supabase Json types.
 * Supabase's Json type is: string | number | boolean | null | { [key: string]: Json | undefined } | Json[]
 */

import type { Json } from 'src/core/database.types'

/**
 * Type guard to check if a Json value is an object (not array, not primitive)
 */
export function isJsonObject(
  value: Json | null | undefined
): value is { [key: string]: Json | undefined } {
  return value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Type guard to check if a Json value is an array
 */
export function isJsonArray(value: Json | null | undefined): value is Json[] {
  return Array.isArray(value)
}

/**
 * Safely convert Json to object, returning undefined if not an object
 */
export function asJsonObject(
  value: Json | null | undefined
): { [key: string]: Json | undefined } | undefined {
  return isJsonObject(value) ? value : undefined
}

/**
 * Convert Json object to Record<string, unknown>
 * Useful for working with Json fields that need to be treated as generic records
 */
export function jsonToRecord(
  value: Json | null | undefined
): Record<string, unknown> | undefined {
  if (!isJsonObject(value)) return undefined
  return value as unknown as Record<string, unknown>
}

/**
 * Safely access a nested property from a Json object
 */
export function getJsonProperty(
  obj: Json | null | undefined,
  key: string
): Json | undefined {
  const jsonObj = asJsonObject(obj)
  return jsonObj?.[key]
}

/**
 * Serialize an object to Json-compatible format
 * Ensures the value can be safely stored in a Json column
 */
export function toJson(value: unknown): Json {
  // Explicitly handle undefined first so JSON.parse(undefined) never executes
  if (value === undefined) {
    return null as Json
  }

  // For primitive Json types, return as-is
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value as Json
  }

  // For arrays, recursively convert
  if (Array.isArray(value)) {
    return value.map(toJson)
  }

  // For objects, recursively convert (skip undefined properties)
  if (typeof value === 'object') {
    const result: { [key: string]: Json | undefined } = {}
    for (const [key, val] of Object.entries(value)) {
      if (val !== undefined) {
        result[key] = toJson(val)
      }
    }
    return result
  }

  // Fallback: serialize via JSON, guarding against non-serializable values
  try {
    const serialized = JSON.stringify(value)
    if (serialized === undefined) {
      return null as Json
    }
    return JSON.parse(serialized) as Json
  } catch {
    return null as Json
  }
}

/**
 * Parse a Json value as a specific type with runtime validation
 * Uses Zod schema for validation if provided
 */
export function parseJsonField<T>(
  value: Json | null | undefined,
  validator?: (val: unknown) => val is T
): T | undefined {
  if (value === null || value === undefined) return undefined

  if (validator) {
    return validator(value) ? value : undefined
  }

  return value as unknown as T
}
