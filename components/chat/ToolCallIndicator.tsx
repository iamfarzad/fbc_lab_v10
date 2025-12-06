
/**
 * Tool Call Indicator - Monochrome
 */

import React from 'react'
import { 
  Loader2,
  Check,
  X
} from 'lucide-react'

export interface ToolCall {
  id: string
  name: string
  status: 'pending' | 'running' | 'complete' | 'error'
  startTime: number
  endTime?: number
  input?: Record<string, unknown>
  output?: unknown
  error?: string
}

interface ToolCallIndicatorProps {
  tools: ToolCall[]
  className?: string
  compact?: boolean
}

const ToolCallIndicator: React.FC<ToolCallIndicatorProps> = ({
  tools,
  className = '',
  // compact = false // Unused
}) => {
  if (!tools.length) return null

  return (
    <div className={`space-y-1 ${className}`}>
      {tools.map(tool => (
        <div 
          key={tool.id}
          className={`
            flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium font-mono
            transition-all duration-200
            ${tool.status === 'running' 
                ? 'bg-zinc-100 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm' 
                : tool.status === 'complete'
                    ? 'bg-zinc-50 dark:bg-zinc-900/30 border-transparent text-green-600 dark:text-green-400'
                    : 'bg-zinc-50 dark:bg-zinc-900/30 border-transparent text-zinc-500'}
          `}
        >
          {/* Icon State */}
          <div className="flex-shrink-0">
            {tool.status === 'running' && <Loader2 className="w-3 h-3 animate-spin" />}
            {tool.status === 'complete' && <Check className="w-3 h-3" />}
            {tool.status === 'error' && <X className="w-3 h-3" />}
          </div>
          
          <span className="flex-1 truncate uppercase tracking-wider text-[10px]">
              {tool.name.replace(/_/g, ' ')}
          </span>
        </div>
      ))}
    </div>
  )
}

export const FloatingToolIndicator: React.FC<{
  tools: ToolCall[]
}> = ({ tools }) => {
  const activeTools = tools.filter(t => t.status === 'running')
  
  if (!activeTools.length) return null

  return (
    <div className="fixed bottom-24 sm:bottom-32 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up pointer-events-none">
      <div className="bg-white/80 dark:bg-black/60 backdrop-blur-xl rounded-full pl-3 pr-4 py-2 shadow-xl border border-white/20 dark:border-white/10 flex items-center gap-3">
        <div className="relative flex items-center justify-center w-5 h-5">
          <Loader2 className="w-4 h-4 text-zinc-500 dark:text-zinc-400 animate-spin" />
        </div>
        <div className="flex items-center gap-3 border-l border-black/5 dark:border-white/10 pl-3">
          {activeTools.slice(0, 2).map(tool => {
            return (
              <div 
                key={tool.id} 
                className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-600 dark:text-zinc-300 uppercase tracking-wider"
              >
                <span className="truncate max-w-[100px]">
                  {tool.name.replace(/_/g, ' ')}
                </span>
              </div>
            )
          })}
          {activeTools.length > 2 && (
            <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-white/5 px-1.5 py-0.5 rounded-full">
              +{activeTools.length - 2}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default ToolCallIndicator
