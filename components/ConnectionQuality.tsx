/**
 * Connection Quality Indicator
 * 
 * Real-time connection status with latency display
 * and quality indicators.
 */

import React, { useState, useEffect, useRef } from 'react'
import { 
  WifiOff, 
  Signal, 
  SignalHigh, 
  SignalMedium, 
  SignalLow,
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
        group relative flex items-center justify-center
        ${className}
      `}
      title={connected ? `Connected (${latency}ms)` : 'Disconnected'}
    >
      {/* Status Dot */}
      <div className={`
        relative w-2 h-2 rounded-full transition-colors duration-500
        ${isReconnecting ? 'bg-amber-500 animate-pulse' : level === 'disconnected' ? 'bg-red-500' : 'bg-green-500'}
      `}>
        {connected && (
          <div className={`absolute inset-0 w-full h-full rounded-full animate-ping opacity-30 ${level === 'excellent' ? 'bg-green-400' : 'bg-green-600'}`} />
        )}
      </div>

      {/* Tooltip / Expanded View on Hover */}
      <div className="
        absolute right-0 top-full mt-2 
        opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto
        transition-all duration-200 translate-y-1 group-hover:translate-y-0
        z-50
      ">
        <div className="bg-white/90 dark:bg-black/90 backdrop-blur-md rounded-lg shadow-xl border border-white/20 p-2 text-xs whitespace-nowrap">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-medium">
            {isReconnecting ? <RefreshCw className="w-3 h-3 animate-spin" /> : config.icon}
            <span>
              {isReconnecting 
                ? `Reconnecting (${reconnectAttempts})...` 
                : `${config.label} (${latency || '?'}ms)`
              }
            </span>
          </div>
          {!connected && !isReconnecting && onReconnect && (
            <button
              onClick={onReconnect}
              className="mt-1 w-full px-2 py-1 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 rounded text-[10px] text-center transition-colors"
            >
              Reconnect
            </button>
          )}
        </div>
      </div>
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

