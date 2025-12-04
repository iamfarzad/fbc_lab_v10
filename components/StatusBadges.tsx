/**
 * Status Badges
 * 
 * Header badges showing active capabilities with pulsing indicators.
 */

import React from 'react'
import { 
  Mic, 
  MicOff, 
  Camera, 
  CameraOff, 
  Monitor, 
  MapPin,
  Wifi,
  WifiOff,
  Brain
} from 'lucide-react'

interface BadgeProps {
  active: boolean
  label: string
  icon: React.ReactNode
  activeIcon?: React.ReactNode
  color: string
  pulse?: boolean
}

const Badge: React.FC<BadgeProps> = ({
  active,
  label,
  icon,
  activeIcon,
  color,
  pulse = true
}) => {
  if (!active) return null

  return (
    <div 
      className={`
        inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium
        transition-all duration-300
        ${color}
      `}
    >
      <div className="relative">
        {activeIcon || icon}
        {pulse && (
          <span className="absolute inset-0 animate-ping rounded-full bg-current opacity-20" />
        )}
      </div>
      <span className="hidden sm:inline">{label}</span>
    </div>
  )
}

export interface StatusBadgesProps {
  isVoiceActive?: boolean
  isWebcamActive?: boolean
  isScreenShareActive?: boolean
  isLocationShared?: boolean
  isConnected?: boolean
  isProcessing?: boolean
  className?: string
}

const StatusBadges: React.FC<StatusBadgesProps> = ({
  isVoiceActive,
  isWebcamActive,
  isScreenShareActive,
  isLocationShared,
  isConnected,
  isProcessing,
  className = ''
}) => {
  const hasAnyActive = isVoiceActive || isWebcamActive || isScreenShareActive || isLocationShared

  if (!hasAnyActive && !isProcessing) return null

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Voice Active */}
      <Badge
        active={!!isVoiceActive}
        label="Voice"
        icon={<Mic className="w-3 h-3" />}
        color="bg-orange-100 text-orange-600 border border-orange-200"
      />

      {/* Webcam Active */}
      <Badge
        active={!!isWebcamActive}
        label="Camera"
        icon={<Camera className="w-3 h-3" />}
        color="bg-blue-100 text-blue-600 border border-blue-200"
      />

      {/* Screen Share Active */}
      <Badge
        active={!!isScreenShareActive}
        label="Screen"
        icon={<Monitor className="w-3 h-3" />}
        color="bg-purple-100 text-purple-600 border border-purple-200"
      />

      {/* Location Shared */}
      <Badge
        active={!!isLocationShared}
        label="Location"
        icon={<MapPin className="w-3 h-3" />}
        color="bg-green-100 text-green-600 border border-green-200"
        pulse={false}
      />

      {/* Processing */}
      <Badge
        active={!!isProcessing}
        label="Thinking"
        icon={<Brain className="w-3 h-3 animate-pulse" />}
        color="bg-indigo-100 text-indigo-600 border border-indigo-200"
        pulse={false}
      />
    </div>
  )
}

/**
 * Compact connection status indicator
 */
export const ConnectionStatus: React.FC<{
  connected: boolean
  latency?: number
  className?: string
}> = ({ connected, latency, className = '' }) => (
  <div 
    className={`
      inline-flex items-center gap-1 text-[10px]
      ${connected ? 'text-green-600' : 'text-red-500'}
      ${className}
    `}
  >
    {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
    <span>{connected ? 'Connected' : 'Disconnected'}</span>
    {connected && latency && (
      <span className="text-gray-400">({latency}ms)</span>
    )}
  </div>
)

/**
 * Capability indicator for inactive states
 */
export const CapabilityHint: React.FC<{
  type: 'voice' | 'webcam' | 'screen' | 'location'
  available: boolean
  onClick?: () => void
  className?: string
}> = ({ type, available, onClick, className = '' }) => {
  const configs = {
    voice: { icon: <MicOff className="w-3 h-3" />, label: 'Enable Voice' },
    webcam: { icon: <CameraOff className="w-3 h-3" />, label: 'Enable Camera' },
    screen: { icon: <Monitor className="w-3 h-3" />, label: 'Share Screen' },
    location: { icon: <MapPin className="w-3 h-3" />, label: 'Share Location' }
  }

  const config = configs[type]
  if (!available) return null

  return (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px]
        bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700
        transition-colors
        ${className}
      `}
    >
      {config.icon}
      <span>{config.label}</span>
    </button>
  )
}

/**
 * Modality indicator strip (horizontal)
 */
export const ModalityStrip: React.FC<{
  voice?: boolean
  webcam?: boolean
  screen?: boolean
  location?: boolean
  className?: string
}> = ({ voice, webcam, screen, location, className = '' }) => {
  const items = [
    { active: voice, label: 'Voice', color: 'bg-orange-500' },
    { active: webcam, label: 'Camera', color: 'bg-blue-500' },
    { active: screen, label: 'Screen', color: 'bg-purple-500' },
    { active: location, label: 'Location', color: 'bg-green-500' },
  ].filter(i => i.active)

  if (!items.length) return null

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {items.map((item, i) => (
        <div 
          key={i}
          className={`w-1.5 h-1.5 rounded-full ${item.color}`}
          title={item.label}
        />
      ))}
    </div>
  )
}

export default StatusBadges

