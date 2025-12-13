/**
 * Context Sources Indicator
 * 
 * Shows what context the AI is using beyond grounding:
 * - Research context (company/person info)
 * - Location data
 * - Previous conversation
 * - Uploaded files
 * - Screen/webcam analysis
 */

import React, { useState } from 'react'
import { 
  Building, 
  User, 
  MapPin, 
  MessageSquare, 
  FileText, 
  Camera, 
  Monitor,
  ChevronDown,
  ChevronUp,
  Globe,
  Info
} from 'lucide-react'
import { Tooltip } from './UIHelpers'
import { WebPreviewCard } from './Attachments'

export interface ContextSource {
  type: 'company' | 'person' | 'location' | 'conversation' | 'file' | 'webcam' | 'screen' | 'web'
  label: string
  value?: string
  url?: string
  confidence?: number
  timestamp?: number
}

interface ContextSourcesProps {
  sources: ContextSource[]
  compact?: boolean
  className?: string
}

const SOURCE_ICONS: Record<ContextSource['type'], React.ReactNode> = {
  company: <Building className="w-3 h-3" />,
  person: <User className="w-3 h-3" />,
  location: <MapPin className="w-3 h-3" />,
  conversation: <MessageSquare className="w-3 h-3" />,
  file: <FileText className="w-3 h-3" />,
  webcam: <Camera className="w-3 h-3" />,
  screen: <Monitor className="w-3 h-3" />,
  web: <Globe className="w-3 h-3" />,
}

const SOURCE_COLORS: Record<ContextSource['type'], string> = {
  company: 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700',
  person: 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700',
  location: 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700',
  conversation: 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700',
  file: 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700',
  webcam: 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700',
  screen: 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700',
  web: 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700',
}

const ContextSources: React.FC<ContextSourcesProps> = ({
  sources,
  compact = false,
  className = ''
}) => {
  const [expanded, setExpanded] = useState(false)

  if (!sources.length) return null

  if (compact) {
    // Just show icons with tooltips
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        <Tooltip text="Context sources">
          <Info className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
        </Tooltip>
        {sources.slice(0, 4).map((source, i) => (
          <Tooltip key={i} text={`${source.label}: ${source.value || 'Active'}`}>
            <div 
              className={`p-1.5 rounded ${SOURCE_COLORS[source.type]} border cursor-help hover:scale-110 transition-transform`}
            >
              {SOURCE_ICONS[source.type]}
            </div>
          </Tooltip>
        ))}
        {sources.length > 4 && (
          <Tooltip text={`${sources.length - 4} more context sources`}>
            <span className="text-xs text-zinc-400 dark:text-zinc-500 cursor-help font-medium">+{sources.length - 4}</span>
          </Tooltip>
        )}
      </div>
    )
  }

  return (
    <div className={`rounded-lg border border-zinc-200/50 dark:border-zinc-800/50 bg-white/50 dark:bg-black/40 backdrop-blur-sm overflow-hidden transition-all duration-300 hover:bg-white/80 dark:hover:bg-black/60 ${className}`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-zinc-400" />
          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Context Sources ({sources.length})
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-zinc-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-zinc-400" />
        )}
      </button>

      {/* Source List */}
      {expanded && (
        <div className="border-t border-gray-100 divide-y divide-gray-100 p-2 space-y-2">
            {/* Standard Sources */}
            <div className="space-y-1">
                {sources.filter(s => s.type !== 'web').map((source, index) => (
                    <div 
                    key={index}
                    className="flex items-start gap-3 px-2 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                    <div className={`p-1.5 rounded ${SOURCE_COLORS[source.type]} border mt-0.5 shrink-0`}>
                        {SOURCE_ICONS[source.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                {source.label}
                            </span>
                            {source.confidence && (
                                <span className="text-[10px] text-gray-400">
                                {Math.round(source.confidence * 100)}%
                                </span>
                            )}
                        </div>
                        {source.value && (
                        <p className="text-xs text-gray-500 truncate">
                            {source.value}
                        </p>
                        )}
                    </div>
                    </div>
                ))}
            </div>

           {/* Web Sources Grid */}
           {sources.some(s => s.type === 'web') && (
                <div className="grid grid-cols-2 gap-2 pt-2">
                    {sources.filter(s => s.type === 'web').map((source, i) => (
                        <WebPreviewCard 
                            key={i}
                            title={source.value || 'Web Source'}
                            url={source.url || '#'}
                            type="web"
                        />
                    ))}
                </div>
           )}
        </div>
      )}
    </div>
  )
}

/**
 * Inline context badge
 */
export const ContextBadge: React.FC<{
  type: ContextSource['type']
  label: string
  className?: string
}> = ({ type, label, className = '' }) => (
  <span 
    className={`
      inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border
      ${SOURCE_COLORS[type]}
      ${className}
    `}
  >
    {SOURCE_ICONS[type]}
    {label}
  </span>
)

/**
 * Build context sources from intelligence context
 */
export function buildContextSources(context: {
  company?: { name?: string; domain?: string }
  person?: { fullName?: string; role?: string }
  location?: { city?: string; country?: string }
  hasConversation?: boolean
  uploadedFiles?: string[]
  hasWebcam?: boolean
  hasScreen?: boolean
  webSources?: Array<{ title: string; url: string }>
}): ContextSource[] {
  const sources: ContextSource[] = []

  if (context.company?.name) {
    const companySource: ContextSource = {
      type: 'company',
      label: 'Company',
      value: context.company.name,
    }
    if (context.company.domain) {
      companySource.url = `https://${context.company.domain}`
    }
    sources.push(companySource)
  }

  if (context.person?.fullName) {
    sources.push({
      type: 'person',
      label: 'Contact',
      value: `${context.person.fullName}${context.person.role ? ` (${context.person.role})` : ''}`
    })
  }

  if (context.location?.city) {
    sources.push({
      type: 'location',
      label: 'Location',
      value: `${context.location.city}${context.location.country ? `, ${context.location.country}` : ''}`
    })
  }

  if (context.hasConversation) {
    sources.push({
      type: 'conversation',
      label: 'Previous Messages',
      value: 'Using conversation history'
    })
  }

  if (context.uploadedFiles?.length) {
    context.uploadedFiles.forEach(file => {
      sources.push({
        type: 'file',
        label: 'File',
        value: file
      })
    })
  }

  if (context.hasWebcam) {
    sources.push({
      type: 'webcam',
      label: 'Webcam',
      value: 'Analyzing visual input'
    })
  }

  if (context.hasScreen) {
    sources.push({
      type: 'screen',
      label: 'Screen Share',
      value: 'Analyzing screen content'
    })
  }

  if (context.webSources?.length) {
    context.webSources.forEach(source => {
      sources.push({
        type: 'web',
        label: 'Web',
        value: source.title,
        url: source.url
      })
    })
  }

  return sources
}

export default ContextSources
