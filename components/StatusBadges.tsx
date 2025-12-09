
/**
 * Status Badges
 *
 * Header badges showing active capabilities with monochrome styling.
 * ACTIVE = White/Black with dot. INACTIVE = Hidden or subtle text.
 */

import React from 'react'
import {
  MapPin
} from 'lucide-react'
import Badge from './chat/shared/Badge'

export interface StatusBadgesProps {
  isLocationShared?: boolean | undefined
  isProcessing?: boolean | undefined
  agentMode?: 'idle' | 'listening' | 'thinking' | 'speaking'
  hasActiveTools?: boolean
  className?: string | undefined
  locationData?: { latitude: number; longitude: number; city?: string } | null | undefined
}

const StatusBadges: React.FC<StatusBadgesProps> = ({
  isLocationShared,
  isProcessing: _isProcessing,
  agentMode: _agentMode = 'idle',
  hasActiveTools: _hasActiveTools = false,
  className = '',
  locationData
}) => {
  const [showCoordinates, setShowCoordinates] = React.useState(false)

  // Only show location badge, processing indicator moved to chat messages
  if (!isLocationShared) return null

  const coordinates = locationData && typeof locationData.latitude === 'number' && typeof locationData.longitude === 'number'
    ? `${locationData.latitude.toFixed(6)}, ${locationData.longitude.toFixed(6)}`
    : null

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Location Shared */}
      {isLocationShared && (
        <div 
          className="relative group"
          onMouseEnter={() => setShowCoordinates(true)}
          onMouseLeave={() => setShowCoordinates(false)}
        >
        <Badge
          variant="status"
          icon={<MapPin className="w-3 h-3" />}
          pulse={true}
        >
          <span className="hidden sm:inline">Location Active</span>
        </Badge>
          
          {/* Coordinates Tooltip on Hover */}
          {showCoordinates && coordinates && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 bg-black dark:bg-zinc-900 text-white dark:text-zinc-100 text-[10px] font-mono rounded-lg border border-zinc-700 dark:border-zinc-700 shadow-lg z-50 whitespace-nowrap pointer-events-none">
              <div className="flex items-center gap-2">
                <MapPin className="w-3 h-3 text-orange-400" />
                <span>{coordinates}</span>
              </div>
              {locationData?.city && (
                <div className="text-[9px] text-zinc-400 mt-1 text-center">
                  {locationData.city}
                </div>
              )}
              {/* Tooltip Arrow */}
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black dark:bg-zinc-900 border-l border-t border-zinc-700 dark:border-zinc-700 rotate-45"></div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export const ConnectionStatus: React.FC<{
  connected: boolean
  latency?: number
  className?: string
}> = ({ connected, latency, className = '' }) => (
  <div 
    className={`
      inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full border
      ${connected 
          ? 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300' 
          : 'bg-zinc-50 dark:bg-black border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-600'}
      ${className}
    `}
  >
    <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-orange-500 shadow-sm animate-pulse' : 'bg-zinc-300 dark:bg-zinc-700'}`} />
    <span>{connected ? 'Live' : 'Offline'}</span>
    {connected && latency && (
      <span className="text-zinc-400 dark:text-zinc-500 opacity-60"> {latency}ms</span>
    )}
  </div>
)

export default StatusBadges
