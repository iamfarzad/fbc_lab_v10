
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
        className={`
          group flex items-center gap-2 text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors cursor-pointer
          ${className}
        `}
        onClick={() => expandable && hasDetails && setExpanded(true)}
      >
        <span className="opacity-60 group-hover:opacity-100 transition-opacity" title={formatAbsoluteTime(meta.timestamp)}>
          {formatRelativeTime(meta.timestamp)}
        </span>
        
        {meta.responseTime && (
          <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
            <span>•</span>
            <Zap className="w-2.5 h-2.5" />
            {formatResponseTime(meta.responseTime)}
          </div>
        )}
        
        {expandable && hasDetails && (
          <ChevronDown className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
        )}
      </div>
    )
  }

  // Expanded view
  return (
    <div className={`
      mt-2 p-3 rounded-xl bg-zinc-50 dark:bg-black/50 border border-zinc-200 dark:border-zinc-800 backdrop-blur-sm
      animate-fade-in-up space-y-3 text-[10px] text-zinc-500 dark:text-zinc-400
      ${className}
    `}>
      {/* Header with collapse button */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
        <span className="font-medium tracking-wide uppercase text-[9px] opacity-70">Message Details</span>
        <button 
          onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
          className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors"
        >
          <ChevronUp className="w-3 h-3" />
        </button>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-y-3 gap-x-4">
        {/* Timestamp */}
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5 opacity-70">
            <Clock className="w-3 h-3" />
            <span>Timestamp</span>
          </div>
          <div className="font-mono pl-4.5">
            {formatAbsoluteTime(meta.timestamp)}
          </div>
        </div>

        {/* Response Time */}
        {meta.responseTime && (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5 opacity-70">
              <Zap className="w-3 h-3" />
              <span>Response</span>
            </div>
            <div className="font-mono pl-4.5">
              {formatResponseTime(meta.responseTime)}
            </div>
          </div>
        )}

        {/* Model */}
        {meta.model && (
          <div className="flex flex-col gap-0.5 col-span-2">
            <div className="flex items-center gap-1.5 opacity-70">
              <Cpu className="w-3 h-3" />
              <span>Model</span>
            </div>
            <div className="font-mono pl-4.5 break-all">
              {meta.model.split('/').pop()?.replace('gemini-', '')}
            </div>
          </div>
        )}

        {/* Tokens */}
        {(meta.tokenCount || meta.inputTokens || meta.outputTokens) && (
          <div className="flex flex-col gap-0.5 col-span-2">
            <div className="flex items-center gap-1.5 opacity-70">
              <Hash className="w-3 h-3" />
              <span>Tokens</span>
            </div>
            <div className="font-mono pl-4.5">
              {meta.inputTokens && meta.outputTokens 
                ? `${meta.inputTokens} in + ${meta.outputTokens} out = ${meta.tokenCount || meta.inputTokens + meta.outputTokens}`
                : meta.tokenCount
              }
            </div>
          </div>
        )}
      </div>

      {/* Tools Used */}
      {meta.toolsUsed && meta.toolsUsed.length > 0 && (
        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-1.5 mb-2 opacity-70">
            <Wrench className="w-3 h-3" />
            <span>Tools</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {meta.toolsUsed.map((tool, i) => (
              <span 
                key={i}
                className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-md font-mono text-[9px]"
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
    className={`text-[10px] text-zinc-400 ${className}`}
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
  return (
    <span 
      className={`
        text-[10px] px-1.5 py-0.5 rounded-full
        bg-zinc-100 dark:bg-black border border-zinc-200 dark:border-zinc-800
        text-zinc-500 dark:text-zinc-400
        ${className}
      `}
    >
      <Zap className="w-2.5 h-2.5 inline mr-0.5" />
      {formatResponseTime(ms)}
    </span>
  )
}

export default MessageMetadata
