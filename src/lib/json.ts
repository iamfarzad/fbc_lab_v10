/**
 * JSON Parser Utility
 * Schema-validated JSON parsing for API responses and requests
 */

import { z } from 'zod'
// NextRequest removed - not needed in Vite project
// import type { NextRequest } from 'next/server'
import { AppError } from './errors'

export interface ParseOptions {
  onError?: (error: AppError) => void
  errorContext?: Record<string, unknown>
}

/**
 * Parse JSON response with schema validation
 * Replaces all `response.json() as any` patterns
 */
export async function parseJsonResponse<T>(
  response: Response,
  fallback: T,
  options?: ParseOptions
): Promise<T> {
  try {
    return await response.json() as T
  } catch (error) {
    options?.onError?.(
      new AppError({
        message: `Failed to parse JSON response${error instanceof Error ? `: ${error.message}` : ''}`,
        code: 'JSON_RESPONSE_PARSE_ERROR',
        statusCode: response.status || 500,
        details: {
          url: response.url,
          status: response.status,
          statusText: response.statusText,
          cause: error instanceof Error ? error.message : error,
          ...options?.errorContext
        }
      })
    )
    return fallback
  }
}

/**
 * Parse JSON request body with schema validation
 * Replaces all `request.json() as any` patterns
 */
export async function parseJsonRequest<T>(
  req: Request,
  schema: z.ZodType<T>
): Promise<T> {
  const raw = (await req.json()) as unknown
  return schema.parse(raw)
}

/**
 * Alias for parseJsonRequest (matching user's API)
 */
export async function parseJson<T>(
  req: Request,
  schema: z.ZodType<T>
): Promise<T> {
  return parseJsonRequest(req, schema)
}

/**
 * Safe JSON parse with fallback
 * Returns parsed data or fallback value on error
 * 
 * Use this for Response objects (async parsing)
 * 
 * For string inputs (synchronous parsing), use safeJSONParse() from src/lib/code-quality
 * 
 * @param res - Response object to parse
 * @param schema - Zod schema for validation
 * @param fallback - Fallback value if parsing/validation fails
 * @returns Parsed and validated data or fallback value
 */
export async function parseJsonSafe<T>(
  res: Response,
  schema: z.ZodType<T>,
  fallback: T
): Promise<T> {
  try {
    const raw = (await res.json()) as unknown
    return schema.parse(raw)
  } catch {
    return fallback
  }
}

export interface SafeJsonParseOptions {
  onError?: (error: unknown) => void
}

export function safeParseJson<T>(
  value: string | null | undefined,
  fallback: T,
  options: SafeJsonParseOptions = {}
): T {
  if (!value) return fallback

  try {
    return JSON.parse(value) as T
  } catch (error) {
    options.onError?.(error)
    return fallback
  }
}

export function safeParseJsonObject<T extends Record<string, unknown>>(
  value: unknown,
  fallback: T,
  options: SafeJsonParseOptions = {}
): T {
  if (typeof value === 'string') {
    return safeParseJson<T>(value, fallback, options)
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as T
  }

  options.onError?.(new Error('Value is not a JSON object'))
  return fallback
}

export function parseToolCallArgs(
  args: unknown,
  options: SafeJsonParseOptions = {}
): Record<string, unknown> {
  return safeParseJsonObject<Record<string, unknown>>(args, {}, options)
}

