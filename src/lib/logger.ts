/**
 * Centralized logging utility
 * Handles logging for both development and production
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: any
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'
  private isProduction = process.env.NODE_ENV === 'production'

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
      // Send to Sentry, LogRocket, etc.
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
}

export const logger = new Logger()

