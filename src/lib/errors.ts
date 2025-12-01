const DEFAULT_STATUS_CODE = 500
const DEFAULT_ERROR_CODE = 'INTERNAL_ERROR'

export interface AppErrorInit {
  message: string
  statusCode?: number
  code?: string
  details?: unknown
  context?: Record<string, unknown> | undefined
  cause?: unknown
}

export interface AppErrorJSON {
  code: string
  message: string
  statusCode: number
  details?: unknown
  context?: Record<string, unknown> | undefined
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
    this.context = init.context
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
      context: this.context ?? undefined,
      timestamp: this.timestamp
    }
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

