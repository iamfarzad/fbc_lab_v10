/**
 * Connection Quality Indicator
 * 
 * Real-time connection status with latency display
 * and quality indicators.
 */

import React, { useState, useEffect, useRef } from 'react'
import { 
  Wifi, 
  WifiOff, 
  Signal, 
  SignalHigh, 
  SignalMedium, 
  SignalLow,
  AlertTriangle,
  RefreshCw
} from 'lucide-react'

export type ConnectionQualityLevel = 'excellent' | 'good' | 'fair' | 'poor' | 'disconnected'

interface ConnectionQualityProps {
  latency?: number // ms
  connected: boolean
  isReconnecting?: boolean
  reconnectAttempts?: number
  onReconnect?: () => void
  showDetails?: boolean
  className?: string
}

function getQualityLevel(latency: number | undefined, connected: boolean): ConnectionQualityLevel {
  if (!connected) return 'disconnected'
  if (!latency) return 'good' // Assume good if we don't have latency yet
  if (latency < 100) return 'excellent'
  if (latency < 300) return 'good'
  if (latency < 500) return 'fair'
  return 'poor'
}

function getQualityConfig(level: ConnectionQualityLevel): {
  icon: React.ReactNode
  label: string
  color: string
  bgColor: string
} {
  switch (level) {
    case 'excellent':
      return {
        icon: <SignalHigh className="w-4 h-4" />,
        label: 'Excellent',
        color: 'text-green-500',
        bgColor: 'bg-green-50'
      }
    case 'good':
      return {
        icon: <Signal className="w-4 h-4" />,
        label: 'Good',
        color: 'text-green-500',
        bgColor: 'bg-green-50'
      }
    case 'fair':
      return {
        icon: <SignalMedium className="w-4 h-4" />,
        label: 'Fair',
        color: 'text-amber-500',
        bgColor: 'bg-amber-50'
      }
    case 'poor':
      return {
        icon: <SignalLow className="w-4 h-4" />,
        label: 'Poor',
        color: 'text-red-500',
        bgColor: 'bg-red-50'
      }
    case 'disconnected':
      return {
        icon: <WifiOff className="w-4 h-4" />,
        label: 'Disconnected',
        color: 'text-gray-500',
        bgColor: 'bg-gray-100'
      }
  }
}

const ConnectionQuality: React.FC<ConnectionQualityProps> = ({
  latency,
  connected,
  isReconnecting,
  reconnectAttempts = 0,
  onReconnect,
  showDetails = false,
  className = ''
}) => {
  const level = getQualityLevel(latency, connected)
  const config = getQualityConfig(level)

  return (
    <div 
      className={`
        inline-flex items-center gap-2 px-3 py-1.5 rounded-lg
        ${config.bgColor} ${config.color}
        transition-all duration-300
        ${className}
      `}
    >
      {/* Icon */}
      <div className="relative">
        {isReconnecting ? (
          <RefreshCw className="w-4 h-4 animate-spin" />
        ) : (
          config.icon
        )}
      </div>

      {/* Label */}
      <span className="text-xs font-medium">
        {isReconnecting 
          ? `Reconnecting${reconnectAttempts > 1 ? ` (${reconnectAttempts})` : ''}...` 
          : config.label
        }
      </span>

      {/* Latency */}
      {showDetails && connected && latency && (
        <span className="text-[10px] opacity-70">
          {latency}ms
        </span>
      )}

      {/* Reconnect button */}
      {!connected && !isReconnecting && onReconnect && (
        <button
          onClick={onReconnect}
          className="ml-1 p-0.5 hover:bg-black/10 rounded transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      )}
    </div>
  )
}

/**
 * Compact connection dot
 */
export const ConnectionDot: React.FC<{
  connected: boolean
  latency?: number
  className?: string
}> = ({ connected, latency, className = '' }) => {
  const level = getQualityLevel(latency, connected)
  const colors = {
    excellent: 'bg-green-500',
    good: 'bg-green-500',
    fair: 'bg-amber-500',
    poor: 'bg-red-500',
    disconnected: 'bg-gray-400'
  }

  return (
    <div 
      className={`relative ${className}`}
      title={connected ? `Connected (${latency || '?'}ms)` : 'Disconnected'}
    >
      <div className={`w-2 h-2 rounded-full ${colors[level]}`} />
      {connected && (
        <div className={`absolute inset-0 w-2 h-2 rounded-full ${colors[level]} animate-ping opacity-50`} />
      )}
    </div>
  )
}

/**
 * Connection status bar with history
 */
export const ConnectionStatusBar: React.FC<{
  connected: boolean
  latencyHistory?: number[]
  className?: string
}> = ({ connected, latencyHistory = [], className = '' }) => {
  const maxLatency = Math.max(...latencyHistory, 100)
  
  return (
    <div className={`flex items-end gap-0.5 h-4 ${className}`}>
      {latencyHistory.slice(-20).map((lat, i) => {
        const height = Math.max(10, (lat / maxLatency) * 100)
        const level = getQualityLevel(lat, connected)
        const colors = {
          excellent: 'bg-green-400',
          good: 'bg-green-400',
          fair: 'bg-amber-400',
          poor: 'bg-red-400',
          disconnected: 'bg-gray-300'
        }
        
        return (
          <div
            key={i}
            className={`w-0.5 rounded-full transition-all ${colors[level]}`}
            style={{ height: `${height}%` }}
            title={`${lat}ms`}
          />
        )
      })}
    </div>
  )
}

/**
 * Hook to track connection quality
 */
export function useConnectionQuality(
  connected: boolean,
  measureLatency: () => Promise<number>
) {
  const [latency, setLatency] = useState<number | undefined>()
  const [history, setHistory] = useState<number[]>([])
  const intervalRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (connected) {
      const measure = async () => {
        try {
          const lat = await measureLatency()
          setLatency(lat)
          setHistory(h => [...h.slice(-19), lat])
        } catch {
          // Ignore measurement errors
        }
      }

      void measure()
      intervalRef.current = setInterval(measure, 5000)

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
      }
    } else {
      setLatency(undefined)
    }
  }, [connected, measureLatency])

  return { latency, history, quality: getQualityLevel(latency, connected) }
}

export default ConnectionQuality

