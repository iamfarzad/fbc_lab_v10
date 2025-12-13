/**
 * Enhanced Error Message
 * 
 * Contextual error display with retry functionality
 * and helpful suggestions.
 */

import React from 'react'
import { 
  AlertTriangle, 
  WifiOff, 
  Clock, 
  RefreshCw, 
  HelpCircle,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react'

export type ErrorType = 
  | 'network' 
  | 'rate_limit' 
  | 'auth' 
  | 'quota' 
  | 'timeout' 
  | 'server' 
  | 'unknown'

export interface ErrorInfo {
  type: ErrorType
  message: string
  details?: string
  timestamp?: number
  retryable?: boolean
  retryAfter?: number // seconds
}

interface ErrorMessageProps {
  error: ErrorInfo
  onRetry?: () => void
  onDismiss?: () => void
  compact?: boolean
  className?: string
}

const ERROR_CONFIG: Record<ErrorType, {
  icon: React.ReactNode
  title: string
  color: string
  suggestion: string
}> = {
  network: {
    icon: <WifiOff className="w-4 h-4" />,
    title: 'Connection Lost',
    color: 'text-zinc-700 bg-zinc-100 border-zinc-300 dark:text-zinc-300 dark:bg-zinc-800 dark:border-zinc-700',
    suggestion: 'Check your internet connection and try again.'
  },
  rate_limit: {
    icon: <Clock className="w-4 h-4" />,
    title: 'Too Many Requests',
    color: 'text-zinc-700 bg-zinc-100 border-zinc-300 dark:text-zinc-300 dark:bg-zinc-800 dark:border-zinc-700',
    suggestion: 'Please wait a moment before trying again.'
  },
  auth: {
    icon: <AlertTriangle className="w-4 h-4" />,
    title: 'Authentication Error',
    color: 'text-zinc-700 bg-zinc-100 border-zinc-300 dark:text-zinc-300 dark:bg-zinc-800 dark:border-zinc-700',
    suggestion: 'Your session may have expired. Try refreshing the page.'
  },
  quota: {
    icon: <AlertTriangle className="w-4 h-4" />,
    title: 'Usage Limit Reached',
    color: 'text-zinc-700 bg-zinc-100 border-zinc-300 dark:text-zinc-300 dark:bg-zinc-800 dark:border-zinc-700',
    suggestion: 'Daily usage limit reached. Try again tomorrow or upgrade your plan.'
  },
  timeout: {
    icon: <Clock className="w-4 h-4" />,
    title: 'Request Timeout',
    color: 'text-zinc-700 bg-zinc-100 border-zinc-300 dark:text-zinc-300 dark:bg-zinc-800 dark:border-zinc-700',
    suggestion: 'The request took too long. Try again with a simpler query.'
  },
  server: {
    icon: <AlertTriangle className="w-4 h-4" />,
    title: 'Server Error',
    color: 'text-zinc-700 bg-zinc-100 border-zinc-300 dark:text-zinc-300 dark:bg-zinc-800 dark:border-zinc-700',
    suggestion: 'Something went wrong on our end. Please try again shortly.'
  },
  unknown: {
    icon: <HelpCircle className="w-4 h-4" />,
    title: 'Something Went Wrong',
    color: 'text-zinc-600 bg-zinc-100 border-zinc-300 dark:text-zinc-400 dark:bg-zinc-800 dark:border-zinc-700',
    suggestion: 'An unexpected error occurred. Please try again.'
  }
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({
  error,
  onRetry,
  onDismiss,
  compact = false,
  className = ''
}) => {
  const [showDetails, setShowDetails] = React.useState(false)
  const [retrying, setRetrying] = React.useState(false)
  const [countdown, setCountdown] = React.useState(error.retryAfter || 0)

  const config = ERROR_CONFIG[error.type]

  // Countdown timer for rate limits
  React.useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const handleRetry = async () => {
    if (!onRetry || retrying) return
    setRetrying(true)
    try {
      await onRetry()
    } finally {
      setRetrying(false)
    }
  }

  if (compact) {
    return (
      <div 
        className={`
          inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs
          ${config.color} border
          ${className}
        `}
      >
        {config.icon}
        <span>{error.message || config.title}</span>
        {error.retryable !== false && onRetry && countdown === 0 && (
          <button 
            onClick={handleRetry}
            disabled={retrying}
            className="ml-1 p-0.5 hover:bg-black/5 rounded transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${retrying ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>
    )
  }

  return (
    <div 
      className={`
        rounded-lg border p-4 space-y-3
        ${config.color}
        backdrop-blur-sm shadow-sm transition-all duration-300
        ${className}
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {config.icon}
          <span className="font-medium">{config.title}</span>
        </div>
        {onDismiss && (
          <button 
            onClick={onDismiss}
            className="p-1 hover:bg-black/5 rounded transition-colors -mr-1 -mt-1"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Message */}
      <p className="text-sm opacity-90">
        {error.message || config.suggestion}
      </p>

      {/* Countdown */}
      {countdown > 0 && (
        <p className="text-xs opacity-75">
          Retry available in {countdown} second{countdown !== 1 ? 's' : ''}...
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        {error.retryable !== false && onRetry && (
          <button
            onClick={handleRetry}
            disabled={retrying || countdown > 0}
            className={`
              inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
              bg-white border border-current/20 hover:bg-black/5
              transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            <RefreshCw className={`w-3 h-3 ${retrying ? 'animate-spin' : ''}`} />
            {retrying ? 'Retrying...' : 'Try Again'}
          </button>
        )}

        {error.details && (
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="inline-flex items-center gap-1 text-xs opacity-75 hover:opacity-100 transition-opacity"
          >
            {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>
        )}
      </div>

      {/* Details (collapsible) */}
      {showDetails && error.details && (
        <div className="mt-2 p-2 bg-black/5 rounded text-xs font-mono overflow-x-auto">
          {error.details}
        </div>
      )}
    </div>
  )
}

/**
 * Parse error response into ErrorInfo
 */
export function parseError(error: unknown): ErrorInfo {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    
    if (message.includes('network') || message.includes('fetch')) {
      return { type: 'network', message: error.message, retryable: true }
    }
    if (message.includes('rate limit') || message.includes('429')) {
      return { type: 'rate_limit', message: error.message, retryable: true, retryAfter: 30 }
    }
    if (message.includes('quota')) {
      return { type: 'quota', message: error.message, retryable: false }
    }
    if (message.includes('timeout')) {
      return { type: 'timeout', message: error.message, retryable: true }
    }
    if (message.includes('401') || message.includes('403') || message.includes('auth')) {
      return { type: 'auth', message: error.message, retryable: false }
    }
    if (message.includes('500') || message.includes('server')) {
      return { type: 'server', message: error.message, retryable: true }
    }
    
    return { type: 'unknown', message: error.message, retryable: true }
  }
  
  return { 
    type: 'unknown', 
    message: 'An unexpected error occurred', 
    retryable: true 
  }
}

/**
 * Inline error indicator
 */
export const InlineError: React.FC<{
  message: string
  onRetry?: () => void
  className?: string
}> = ({ message, onRetry, className = '' }) => (
  <span 
    className={`
      inline-flex items-center gap-1 text-xs text-red-500
      ${className}
    `}
  >
    <AlertTriangle className="w-3 h-3" />
    {message}
    {onRetry && (
      <button 
        onClick={onRetry}
        className="underline hover:no-underline"
      >
        Retry
      </button>
    )}
  </span>
)

export default ErrorMessage
