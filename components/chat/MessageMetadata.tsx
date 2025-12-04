/**
 * Message Metadata Component
 * 
 * Expandable metadata display for chat messages:
 * - Timestamp (relative + absolute)
 * - Response time
 * - Model used
 * - Token count
 * - Tools called
 */

import React, { useState } from 'react'
import { 
  Clock, 
  Cpu, 
  Hash, 
  ChevronDown, 
  ChevronUp,
  Wrench,
  Zap
} from 'lucide-react'

export interface MessageMeta {
  timestamp: Date
  responseTime?: number // ms
  model?: string
  tokenCount?: number
  inputTokens?: number
  outputTokens?: number
  toolsUsed?: string[]
}

interface MessageMetadataProps {
  meta: MessageMeta
  expandable?: boolean
  defaultExpanded?: boolean
  className?: string
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return date.toLocaleDateString()
}

function formatAbsoluteTime(date: Date): string {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatResponseTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

const MessageMetadata: React.FC<MessageMetadataProps> = ({
  meta,
  expandable = true,
  defaultExpanded = false,
  className = ''
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded)

  const hasDetails = meta.model || meta.tokenCount || meta.toolsUsed?.length

  // Compact view
  if (!expanded) {
    return (
      <div 
        className={`flex items-center gap-2 text-[10px] text-gray-400 ${className}`}
        onClick={() => expandable && hasDetails && setExpanded(true)}
      >
        <span title={formatAbsoluteTime(meta.timestamp)}>
          {formatRelativeTime(meta.timestamp)}
        </span>
        
        {meta.responseTime && (
          <>
            <span>•</span>
            <span className="flex items-center gap-0.5">
              <Zap className="w-2.5 h-2.5" />
              {formatResponseTime(meta.responseTime)}
            </span>
          </>
        )}
        
        {expandable && hasDetails && (
          <button className="p-0.5 hover:bg-gray-100 rounded transition-colors">
            <ChevronDown className="w-3 h-3" />
          </button>
        )}
      </div>
    )
  }

  // Expanded view
  return (
    <div className={`space-y-2 ${className}`}>
      {/* Header with collapse button */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium text-gray-500">Message Details</span>
        {expandable && (
          <button 
            onClick={() => setExpanded(false)}
            className="p-0.5 hover:bg-gray-100 rounded transition-colors"
          >
            <ChevronUp className="w-3 h-3 text-gray-400" />
          </button>
        )}
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {/* Timestamp */}
        <div className="flex items-center gap-1.5 text-gray-500">
          <Clock className="w-3 h-3" />
          <div>
            <div className="font-medium">{formatAbsoluteTime(meta.timestamp)}</div>
            <div className="text-[10px] text-gray-400">{formatRelativeTime(meta.timestamp)}</div>
          </div>
        </div>

        {/* Response Time */}
        {meta.responseTime && (
          <div className="flex items-center gap-1.5 text-gray-500">
            <Zap className="w-3 h-3" />
            <div>
              <div className="font-medium">{formatResponseTime(meta.responseTime)}</div>
              <div className="text-[10px] text-gray-400">Response time</div>
            </div>
          </div>
        )}

        {/* Model */}
        {meta.model && (
          <div className="flex items-center gap-1.5 text-gray-500">
            <Cpu className="w-3 h-3" />
            <div>
              <div className="font-medium truncate" title={meta.model}>
                {meta.model.split('/').pop()?.replace('gemini-', '')}
              </div>
              <div className="text-[10px] text-gray-400">Model</div>
            </div>
          </div>
        )}

        {/* Tokens */}
        {(meta.tokenCount || meta.inputTokens || meta.outputTokens) && (
          <div className="flex items-center gap-1.5 text-gray-500">
            <Hash className="w-3 h-3" />
            <div>
              <div className="font-medium">
                {meta.tokenCount || (meta.inputTokens || 0) + (meta.outputTokens || 0)}
              </div>
              <div className="text-[10px] text-gray-400">
                {meta.inputTokens && meta.outputTokens 
                  ? `${meta.inputTokens} in / ${meta.outputTokens} out`
                  : 'Tokens'
                }
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tools Used */}
      {meta.toolsUsed && meta.toolsUsed.length > 0 && (
        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5">
            <Wrench className="w-3 h-3" />
            <span>Tools Used</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {meta.toolsUsed.map((tool, i) => (
              <span 
                key={i}
                className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] text-gray-600"
              >
                {tool.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Inline timestamp display
 */
export const InlineTimestamp: React.FC<{
  date: Date
  showIcon?: boolean
  className?: string
}> = ({ date, showIcon = false, className = '' }) => (
  <span 
    className={`text-[10px] text-gray-400 ${className}`}
    title={formatAbsoluteTime(date)}
  >
    {showIcon && <Clock className="w-2.5 h-2.5 inline mr-0.5" />}
    {formatRelativeTime(date)}
  </span>
)

/**
 * Response time badge
 */
export const ResponseTimeBadge: React.FC<{
  ms: number
  className?: string
}> = ({ ms, className = '' }) => {
  const isSlowResponse = ms > 5000
  return (
    <span 
      className={`
        text-[10px] px-1.5 py-0.5 rounded-full
        ${isSlowResponse 
          ? 'bg-amber-50 text-amber-600' 
          : 'bg-green-50 text-green-600'
        }
        ${className}
      `}
    >
      <Zap className="w-2.5 h-2.5 inline mr-0.5" />
      {formatResponseTime(ms)}
    </span>
  )
}

export default MessageMetadata

