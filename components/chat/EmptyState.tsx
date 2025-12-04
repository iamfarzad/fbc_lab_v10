/**
 * Empty State
 * 
 * Improved empty chat state with suggestions,
 * quick actions, and tool hints.
 */

import React from 'react'
import { 
  MessageSquare, 
  Mic, 
  Camera, 
  FileUp, 
  Search,
  Calendar,
  Building,
  Cloud,
  ArrowRight,
  Sparkles
} from 'lucide-react'

interface EmptyStateProps {
  onSuggestionClick?: (text: string) => void
  onActionClick?: (action: 'voice' | 'webcam' | 'upload') => void
  userName?: string
  hasVoice?: boolean
  hasWebcam?: boolean
  className?: string
}

const SUGGESTIONS = [
  { text: 'Tell me about your AI consulting services', icon: <Building className="w-4 h-4" /> },
  { text: 'How can AI help my business?', icon: <Sparkles className="w-4 h-4" /> },
  { text: 'What are your workshop offerings?', icon: <Calendar className="w-4 h-4" /> },
  { text: 'Search for companies in my area', icon: <Search className="w-4 h-4" /> },
]

const TOOLS = [
  { name: 'Web Search', icon: <Search className="w-3 h-3" />, desc: 'Find real-time information' },
  { name: 'Weather', icon: <Cloud className="w-3 h-3" />, desc: 'Get local weather data' },
  { name: 'Calendar', icon: <Calendar className="w-3 h-3" />, desc: 'Book a consultation' },
  { name: 'Company Search', icon: <Building className="w-3 h-3" />, desc: 'Find businesses nearby' },
]

const EmptyState: React.FC<EmptyStateProps> = ({
  onSuggestionClick,
  onActionClick,
  userName,
  hasVoice = true,
  hasWebcam = true,
  className = ''
}) => {
  return (
    <div className={`flex flex-col items-center justify-center h-full py-12 px-4 ${className}`}>
      {/* Icon */}
      <div className="relative mb-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
          <MessageSquare className="w-8 h-8 text-gray-400" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
          <Sparkles className="w-3 h-3 text-white" />
        </div>
      </div>

      {/* Greeting */}
      <h2 className="text-xl font-semibold text-gray-800 mb-2">
        {userName ? `Hi ${userName}, how can I help?` : 'How can I help you today?'}
      </h2>
      <p className="text-gray-500 text-sm mb-8 text-center max-w-md">
        I&apos;m your AI consulting assistant. Ask me anything about AI implementation, 
        workshops, or how we can help your business.
      </p>

      {/* Quick Actions */}
      <div className="flex gap-3 mb-8">
        {hasVoice && onActionClick && (
          <button
            onClick={() => onActionClick('voice')}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors"
          >
            <Mic className="w-4 h-4" />
            <span className="text-sm font-medium">Start Voice</span>
          </button>
        )}
        {hasWebcam && onActionClick && (
          <button
            onClick={() => onActionClick('webcam')}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
          >
            <Camera className="w-4 h-4" />
            <span className="text-sm font-medium">Use Camera</span>
          </button>
        )}
        {onActionClick && (
          <button
            onClick={() => onActionClick('upload')}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <FileUp className="w-4 h-4" />
            <span className="text-sm font-medium">Upload File</span>
          </button>
        )}
      </div>

      {/* Suggestions */}
      <div className="w-full max-w-lg">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3 text-center">
          Try asking
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SUGGESTIONS.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => onSuggestionClick?.(suggestion.text)}
              className="
                flex items-center gap-3 p-3 rounded-xl
                bg-white border border-gray-100 hover:border-gray-200 hover:bg-gray-50
                transition-all group text-left
              "
            >
              <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 group-hover:text-gray-600 group-hover:bg-gray-100 transition-colors">
                {suggestion.icon}
              </div>
              <span className="text-sm text-gray-600 flex-1">{suggestion.text}</span>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
            </button>
          ))}
        </div>
      </div>

      {/* Available Tools */}
      <div className="mt-8 pt-8 border-t border-gray-100 w-full max-w-lg">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3 text-center">
          Available Tools
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {TOOLS.map((tool, index) => (
            <div
              key={index}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 text-gray-500 text-xs"
              title={tool.desc}
            >
              {tool.icon}
              <span>{tool.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Compact empty state for sidebars
 */
export const CompactEmptyState: React.FC<{
  message?: string
  className?: string
}> = ({ message = 'No messages yet', className = '' }) => (
  <div className={`flex flex-col items-center justify-center py-8 text-center ${className}`}>
    <MessageSquare className="w-10 h-10 text-gray-200 mb-3" />
    <p className="text-sm text-gray-400">{message}</p>
  </div>
)

/**
 * Loading placeholder
 */
export const LoadingState: React.FC<{
  message?: string
  className?: string
}> = ({ message = 'Loading...', className = '' }) => (
  <div className={`flex flex-col items-center justify-center py-8 ${className}`}>
    <div className="relative w-12 h-12 mb-4">
      <div className="absolute inset-0 border-2 border-gray-200 rounded-full" />
      <div className="absolute inset-0 border-2 border-orange-500 rounded-full border-t-transparent animate-spin" />
    </div>
    <p className="text-sm text-gray-500">{message}</p>
  </div>
)

export default EmptyState

