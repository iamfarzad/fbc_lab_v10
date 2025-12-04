/**
 * Tool Call Indicator
 * 
 * Shows which tools are being called during AI processing
 * with real-time status updates.
 */

import React from 'react'
import { 
  Search, 
  Cloud, 
  Calendar, 
  Globe, 
  FileText, 
  Building, 
  Camera, 
  Monitor,
  Check,
  X,
  Loader2
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

const TOOL_ICONS: Record<string, typeof Globe> = {
  search_web: Search,
  get_weather: Cloud,
  create_calendar_widget: Calendar,
  search_companies_by_location: Building,
  capture_webcam_snapshot: Camera,
  capture_screen_snapshot: Monitor,
  extract_action_items: FileText,
  generate_summary_preview: FileText,
  draft_follow_up_email: FileText,
  generate_proposal_draft: FileText,
  get_dashboard_stats: Globe,
  default: Globe
}

const TOOL_LABELS: Record<string, string> = {
  search_web: 'Searching...',
  get_weather: 'Getting weather...',
  create_calendar_widget: 'Loading calendar...',
  search_companies_by_location: 'Searching companies...',
  capture_webcam_snapshot: 'Analyzing webcam...',
  capture_screen_snapshot: 'Analyzing screen...',
  extract_action_items: 'Extracting actions...',
  generate_summary_preview: 'Generating summary...',
  draft_follow_up_email: 'Drafting email...',
  generate_proposal_draft: 'Creating proposal...',
  get_dashboard_stats: 'Loading stats...',
}

function getToolIcon(toolName: string): typeof Globe {
  return TOOL_ICONS[toolName] || Globe
}

function getToolLabel(toolName: string, status: ToolCall['status']): string {
  if (status === 'complete') {
    return toolName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }
  return TOOL_LABELS[toolName] || `Running ${toolName.replace(/_/g, ' ')}...`
}

function getDuration(startTime: number, endTime?: number): string {
  const duration = (endTime || Date.now()) - startTime
  if (duration < 1000) return `${duration}ms`
  return `${(duration / 1000).toFixed(1)}s`
}

const ToolCallIndicator: React.FC<ToolCallIndicatorProps> = ({
  tools,
  className = '',
  compact = false
}) => {
  if (!tools.length) return null

  const activeTools = tools.filter(t => t.status === 'running' || t.status === 'pending')
  const completedTools = tools.filter(t => t.status === 'complete')
  const errorTools = tools.filter(t => t.status === 'error')

  if (compact) {
    // Compact mode - just show icons and count
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {activeTools.length > 0 && (
          <div className="flex items-center gap-1 text-blue-500">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span className="text-[10px]">{activeTools.length} running</span>
          </div>
        )}
        {completedTools.length > 0 && (
          <div className="flex items-center gap-1 text-green-500">
            <Check className="w-3 h-3" />
            <span className="text-[10px]">{completedTools.length}</span>
          </div>
        )}
        {errorTools.length > 0 && (
          <div className="flex items-center gap-1 text-red-500">
            <X className="w-3 h-3" />
            <span className="text-[10px]">{errorTools.length}</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`space-y-1 ${className}`}>
      {tools.map(tool => {
        const Icon = getToolIcon(tool.name)
        const label = getToolLabel(tool.name, tool.status)
        
        return (
          <div 
            key={tool.id}
            className={`
              flex items-center gap-2 px-2 py-1 rounded-lg text-xs
              transition-all duration-200
              ${tool.status === 'running' ? 'bg-blue-50 border border-blue-200 text-blue-700' : ''}
              ${tool.status === 'pending' ? 'bg-gray-50 border border-gray-200 text-gray-500' : ''}
              ${tool.status === 'complete' ? 'bg-green-50 border border-green-200 text-green-700' : ''}
              ${tool.status === 'error' ? 'bg-red-50 border border-red-200 text-red-700' : ''}
            `}
          >
            {/* Status icon */}
            <div className="flex-shrink-0">
              {tool.status === 'running' && <Loader2 className="w-3 h-3 animate-spin" />}
              {tool.status === 'pending' && <Icon className="w-3 h-3 opacity-50" />}
              {tool.status === 'complete' && <Check className="w-3 h-3" />}
              {tool.status === 'error' && <X className="w-3 h-3" />}
            </div>
            
            {/* Tool icon */}
            <Icon className="w-3 h-3 flex-shrink-0" />
            
            {/* Label */}
            <span className="flex-1 truncate">{label}</span>
            
            {/* Duration */}
            <span className="text-[10px] opacity-70">
              {getDuration(tool.startTime, tool.endTime)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Inline tool status for message bubbles
 */
export const InlineToolStatus: React.FC<{
  tools: ToolCall[]
  className?: string
}> = ({ tools, className = '' }) => {
  if (!tools.length) return null

  const hasRunning = tools.some(t => t.status === 'running')
  const allComplete = tools.every(t => t.status === 'complete')
  const hasError = tools.some(t => t.status === 'error')

  return (
    <div className={`flex items-center gap-1 text-[10px] ${className}`}>
      {hasRunning && (
        <span className="flex items-center gap-1 text-blue-500">
          <Loader2 className="w-2.5 h-2.5 animate-spin" />
          Processing
        </span>
      )}
      {allComplete && !hasError && (
        <span className="flex items-center gap-1 text-green-600">
          <Check className="w-2.5 h-2.5" />
          {tools.length} tool{tools.length > 1 ? 's' : ''} used
        </span>
      )}
      {hasError && (
        <span className="flex items-center gap-1 text-red-500">
          <X className="w-2.5 h-2.5" />
          Error
        </span>
      )}
    </div>
  )
}

/**
 * Floating tool indicator for active tools
 */
export const FloatingToolIndicator: React.FC<{
  tools: ToolCall[]
}> = ({ tools }) => {
  const activeTools = tools.filter(t => t.status === 'running')
  
  if (!activeTools.length) return null

  return (
    <div className="fixed bottom-24 sm:bottom-32 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up pointer-events-none">
      <div className="bg-white/80 dark:bg-black/60 backdrop-blur-xl rounded-full pl-3 pr-4 py-2 shadow-xl border border-white/20 dark:border-white/10 flex items-center gap-3">
        <div className="relative flex items-center justify-center w-5 h-5">
          <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
          <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping" />
        </div>
        <div className="flex items-center gap-3 border-l border-black/5 dark:border-white/10 pl-3">
          {activeTools.slice(0, 2).map(tool => {
            const Icon = getToolIcon(tool.name)
            return (
              <div 
                key={tool.id} 
                className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-300"
              >
                <Icon className="w-3 h-3 opacity-70" />
                <span className="truncate max-w-[100px]">
                  {getToolLabel(tool.name, tool.status)}
                </span>
              </div>
            )
          })}
          {activeTools.length > 2 && (
            <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded-full">
              +{activeTools.length - 2}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default ToolCallIndicator

