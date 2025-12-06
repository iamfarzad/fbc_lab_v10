
/**
 * Status Badges
 * 
 * Header badges showing active capabilities with monochrome styling.
 * ACTIVE = White/Black with dot. INACTIVE = Hidden or subtle text.
 */

import React from 'react'
import { 
  MapPin,
  Brain
} from 'lucide-react'

interface BadgeProps {
  active: boolean
  label: string
  icon: React.ReactNode
  pulse?: boolean
}

const Badge: React.FC<BadgeProps> = ({
  active,
  label,
  icon,
  pulse = true
}) => {
  if (!active) return null

  return (
    <div 
      className={`
        group relative inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-medium tracking-wide
        border transition-all duration-300
        bg-zinc-100 dark:bg-zinc-900 
        border-zinc-200 dark:border-zinc-800
        text-zinc-600 dark:text-zinc-300
      `}
      title={label}
    >
      <div className="relative flex items-center justify-center">
        {icon}
        {pulse && (
          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse shadow-sm" />
        )}
      </div>
      <span className="hidden sm:inline opacity-90">{label}</span>
    </div>
  )
}

export interface StatusBadgesProps {
  isLocationShared?: boolean | undefined
  isProcessing?: boolean | undefined
  className?: string | undefined
}

const StatusBadges: React.FC<StatusBadgesProps> = ({
  isLocationShared,
  isProcessing,
  className = ''
}) => {
  const hasAnyActive = isLocationShared || isProcessing

  if (!hasAnyActive) return null

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Location Shared */}
      <Badge
        active={!!isLocationShared}
        label="Location Active"
        icon={<MapPin className="w-3 h-3" />}
        pulse={true}
      />

      {/* Processing */}
      <Badge
        active={!!isProcessing}
        label="Thinking..."
        icon={<Brain className="w-3 h-3" />}
        pulse={true}
      />
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
