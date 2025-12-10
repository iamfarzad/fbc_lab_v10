/**
 * Client-side logging utility (for browser)
 * Handles logging for frontend code
 * Also works in Node.js by falling back to process.env
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: any
}

class ClientLogger {
  private isDevelopment: boolean

  constructor() {
    // Always use process.env in Node.js (server-side)
    // import.meta.env is only available in Vite/browser builds
    if (typeof process !== 'undefined' && process.env) {
      this.isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV
    } else {
      // Browser environment - safely access import.meta.env
      let metaEnv: any = null
      try {
        if (typeof import.meta !== 'undefined') {
          metaEnv = import.meta.env
        }
      } catch {
        // Ignore if import.meta is not available
      }
      
      // Check localStorage for debug override (useful for testing in production builds)
      let localStorageDebug = false
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorageDebug = localStorage.getItem('debug') === 'true'
        }
      } catch {
        // Ignore localStorage errors (e.g., in private browsing)
      }
      
      if (metaEnv) {
        this.isDevelopment = metaEnv.DEV === true || localStorageDebug
      } else {
        // Fallback to localStorage check
        this.isDevelopment = localStorageDebug
      }
    }
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString()
    const contextStr = context ? ` ${JSON.stringify(context)}` : ''
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`
  }

  debug(_message: string, _context?: LogContext): void {
    // Suppress debug logs to avoid DevTools floods during local runs
    return
  }

  info(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.info(this.formatMessage('info', message, context))
    }
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage('warn', message, context))
  }

  log(...args: any[]) { if (this.isDevelopment) console.log('[FBC]', ...args); }
  // warn(...args: any[]) { if (this.isDevelopment) console.warn('[FBC]', ...args); } // Duplicate warn
  error(...args: any[]) { console.error('[FBC]', ...args); }
  // debug(...args: any[]) { if (this.isDevelopment) console.debug('[FBC]', ...args); } // Duplicate debug
  // info(...args: any[]) { if (this.isDevelopment) console.info('[FBC]', ...args); } // Duplicate info
  
  group(label: string) { if (this.isDevelopment) console.group(label); }
  groupEnd() { if (this.isDevelopment) console.groupEnd(); }
  table(data: any) { if (this.isDevelopment) console.table(data); }

  logRequest(method: string, url: string, data?: any) {
    if (this.isDevelopment) {
      this.group(`🚀 API Request: ${method} ${url}`);
      if (data) this.log('Data:', data);
      this.groupEnd();
    }
  }

  logResponse(method: string, url: string, status: number, data?: any) {
    if (this.isDevelopment) {
      const icon = status >= 200 && status < 300 ? '✅' : '❌';
      this.group(`${icon} API Response: ${method} ${url} (${status})`);
      if (data) this.log('Data:', data);
      this.groupEnd();
    }
  }
}

export const logger = new ClientLogger();
