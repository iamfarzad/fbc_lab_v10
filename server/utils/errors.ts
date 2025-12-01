

const DEFAULT_STATUS_CODE = 500
const DEFAULT_ERROR_CODE = 'INTERNAL_ERROR'

export interface AppErrorInit {
  message: string
  statusCode?: number
  code?: string
  details?: unknown
  context?: Record<string, unknown>
  cause?: unknown
}

export interface AppErrorJSON {
  code: string
  message: string
  statusCode: number
  details?: unknown
  context?: Record<string, unknown>
  timestamp: string
}

export class AppError extends Error {
  public readonly statusCode: number
  public readonly code: string
  public readonly details?: unknown
  public readonly context?: Record<string, unknown> | undefined
  public readonly timestamp: string
  public readonly cause?: unknown

  constructor(init: AppErrorInit) {
    super(init.message)
    this.name = 'AppError'
    this.statusCode = init.statusCode ?? DEFAULT_STATUS_CODE
    this.code = init.code ?? DEFAULT_ERROR_CODE
    this.details = init.details
    if (init.context !== undefined) {
      this.context = init.context
    }
    this.timestamp = new Date().toISOString()
    this.cause = init.cause

    if (init.cause instanceof Error && init.cause.stack && !this.stack) {
      this.stack = init.cause.stack
    }
  }

  toJSON(): AppErrorJSON {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
      ...(this.context ? { context: this.context } : {}),
      timestamp: this.timestamp
    }
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

function deriveMetadata(error: Error): Partial<AppErrorInit> {
  if (error.name === 'ZodError') {
    return {
      code: 'VALIDATION_ERROR',
      statusCode: 400,
      details: error.message
    }
  }

  const message = error.message.toLowerCase()

  if (message.includes('rate limit')) {
    return {
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429,
      details: error.message
    }
  }

  if (message.includes('timeout')) {
    return {
      code: 'TIMEOUT',
      statusCode: 408,
      details: error.message
    }
  }

  if (message.includes('unauthorized') || message.includes('forbidden')) {
    return {
      code: 'UNAUTHORIZED',
      statusCode: 401,
      details: error.message
    }
  }

  return {}
}

export function parseError(error: unknown, fallback: Partial<AppErrorInit> = {}): AppError {
  if (isAppError(error)) {
    return error
  }

  if (error instanceof Error) {
    const derived = deriveMetadata(error)
    return new AppError({
      message: error.message || fallback.message || 'Internal server error',
      ...(derived.statusCode ?? fallback.statusCode ? { statusCode: derived.statusCode ?? fallback.statusCode } : {}),
      ...(derived.code ?? fallback.code ? { code: derived.code ?? fallback.code ?? DEFAULT_ERROR_CODE } : {}),
      ...(fallback.details ?? derived.details ? { details: fallback.details ?? derived.details } : {}),
      ...(fallback.context ? { context: fallback.context } : {}),
      ...(error ? { cause: error } : {})
    })
  }

  if (typeof error === 'string') {
    return new AppError({
      message: error,
      ...(fallback.statusCode ? { statusCode: fallback.statusCode ?? DEFAULT_STATUS_CODE } : {}),
      ...(fallback.code ? { code: fallback.code ?? DEFAULT_ERROR_CODE } : {}),
      ...(fallback.details ? { details: fallback.details } : {}),
      ...(fallback.context ? { context: fallback.context } : {})
    })
  }

  return new AppError({
    message: fallback.message ?? 'Internal server error',
    ...(fallback.statusCode ? { statusCode: fallback.statusCode ?? DEFAULT_STATUS_CODE } : {}),
    ...(fallback.code ? { code: fallback.code ?? DEFAULT_ERROR_CODE } : {}),
    ...(error ?? fallback.details ? { details: error ?? fallback.details } : {}),
    ...(fallback.context ? { context: fallback.context } : {})
  })
}



export function toWsErrorPayload(
  error: AppError,
  extras: { requestId?: string } = {}
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    type: 'error',
    error: {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      timestamp: error.timestamp
    }
  }

  if (extras.requestId) {
    (payload.error as Record<string, unknown>).requestId = extras.requestId
  }

  if (error.details !== undefined) {
    (payload.error as Record<string, unknown>).details = error.details
  }

  if (error.context !== undefined) {
    (payload.error as Record<string, unknown>).context = error.context
  }

  return payload
}

