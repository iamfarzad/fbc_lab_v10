
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
}

const StatusBadges: React.FC<StatusBadgesProps> = ({
  isLocationShared,
  isProcessing: _isProcessing,
  agentMode: _agentMode = 'idle',
  hasActiveTools: _hasActiveTools = false,
  className = ''
}) => {
  // Only show location badge, processing indicator moved to chat messages
  if (!isLocationShared) return null

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Location Shared */}
      {isLocationShared && (
        <Badge
          variant="status"
          icon={<MapPin className="w-3 h-3" />}
          pulse={true}
        >
          <span className="hidden sm:inline">Location Active</span>
        </Badge>
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
