/**
 * Client-side logging utility (for browser)
 * Handles logging for frontend code
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: any
}

class ClientLogger {
  private isDevelopment = import.meta.env.DEV
  private isProduction = import.meta.env.PROD

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString()
    const contextStr = context ? ` ${JSON.stringify(context)}` : ''
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`
  }

  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.debug(this.formatMessage('debug', message, context))
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.info(this.formatMessage('info', message, context))
    }
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage('warn', message, context))
    
    // In production, could send to monitoring service
    if (this.isProduction) {
      // Send to error tracking service
    }
  }

  error(message: string, error?: Error, context?: LogContext): void {
    const errorContext = {
      ...context,
      error: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      } : undefined,
    }
    
    console.error(this.formatMessage('error', message, errorContext))
    
    // In production, send to error tracking service
    if (this.isProduction) {
      // Send to Sentry, LogRocket, etc.
      // Example: Sentry.captureException(error, { extra: context })
    }
  }

  // Group related logs
  group(label: string): void {
    if (this.isDevelopment) {
      console.group(label)
    }
  }

  groupEnd(): void {
    if (this.isDevelopment) {
      console.groupEnd()
    }
  }

  // Table for structured data
  table(data: any): void {
    if (this.isDevelopment) {
      console.table(data)
    }
  }

  // Network logging
  logRequest(url: string, method: string, data?: any): void {
    if (this.isDevelopment) {
      console.log(`[REQUEST] ${method} ${url}`, data)
    }
  }

  logResponse(url: string, status: number, data?: any): void {
    if (this.isDevelopment) {
      const level = status >= 400 ? 'error' : 'info'
      console[level](`[RESPONSE] ${status} ${url}`, data)
    }
  }
}

export const logger = new ClientLogger()

