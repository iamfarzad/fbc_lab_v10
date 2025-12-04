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
  userName?: string | undefined
  hasVoice?: boolean | undefined
  hasWebcam?: boolean | undefined
  isDarkMode?: boolean | undefined
  className?: string | undefined
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
  isDarkMode = false,
  className = ''
}) => {
  return (
    <div className={`flex flex-col items-center justify-center h-full py-8 sm:py-12 px-4 ${className}`}>
      {/* Icon */}
      <div className="relative mb-4 sm:mb-6">
        <div className={`w-14 sm:w-16 h-14 sm:h-16 rounded-xl flex items-center justify-center ${
          isDarkMode 
            ? 'bg-gradient-to-br from-slate-800 to-slate-900' 
            : 'bg-gradient-to-br from-slate-100 to-slate-200'
        }`}>
          <MessageSquare className={`w-7 sm:w-8 h-7 sm:h-8 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
        </div>
        <div className="absolute -bottom-1 -right-1 w-5 sm:w-6 h-5 sm:h-6 rounded-full bg-orange-500 flex items-center justify-center">
          <Sparkles className="w-2.5 sm:w-3 h-2.5 sm:h-3 text-white" />
        </div>
      </div>

      {/* Greeting */}
      <h2 className={`text-lg sm:text-xl font-semibold mb-2 text-center ${
        isDarkMode ? 'text-white' : 'text-slate-900'
      }`}>
        {userName ? `Hi ${userName}, how can I help?` : 'How can I help you today?'}
      </h2>
      <p className={`text-sm mb-6 sm:mb-8 text-center max-w-md ${
        isDarkMode ? 'text-slate-400' : 'text-slate-600'
      }`}>
        I&apos;m your AI consulting assistant. Ask me anything about AI implementation, 
        workshops, or how we can help your business.
      </p>

      {/* Quick Actions */}
      <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-6 sm:mb-8">
        {hasVoice && onActionClick && (
          <button
            onClick={() => onActionClick('voice')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors text-sm font-medium ${
              isDarkMode 
                ? 'bg-orange-900/30 text-orange-400 hover:bg-orange-900/50 border border-orange-800/30' 
                : 'bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200'
            }`}
          >
            <Mic className="w-4 h-4" />
            <span>Start Voice</span>
          </button>
        )}
        {hasWebcam && onActionClick && (
          <button
            onClick={() => onActionClick('webcam')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors text-sm font-medium ${
              isDarkMode 
                ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50 border border-blue-800/30' 
                : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Use Camera</span>
          </button>
        )}
        {onActionClick && (
          <button
            onClick={() => onActionClick('upload')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors text-sm font-medium ${
              isDarkMode 
                ? 'bg-white/5 text-slate-400 hover:bg-white/10 border border-white/10' 
                : 'bg-white/60 text-slate-600 hover:bg-white/80 border border-white/40'
            }`}
          >
            <FileUp className="w-4 h-4" />
            <span>Upload File</span>
          </button>
        )}
      </div>

      {/* Suggestions */}
      <div className="w-full max-w-lg">
        <p className={`text-[10px] sm:text-xs font-medium uppercase tracking-wider mb-2 sm:mb-3 text-center ${
          isDarkMode ? 'text-slate-500' : 'text-slate-400'
        }`}>
          Try asking
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SUGGESTIONS.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => onSuggestionClick?.(suggestion.text)}
              className={`
                flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl
                transition-all group text-left
                ${isDarkMode 
                  ? 'bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10' 
                  : 'bg-white border border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                }
              `}
            >
              <div className={`w-7 sm:w-8 h-7 sm:h-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 ${
                isDarkMode 
                  ? 'bg-white/10 text-slate-400 group-hover:text-gray-300 group-hover:bg-white/20' 
                  : 'bg-gray-50 text-slate-400 group-hover:text-gray-600 group-hover:bg-gray-100'
              }`}>
                {suggestion.icon}
              </div>
              <span className={`text-xs sm:text-sm flex-1 line-clamp-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>{suggestion.text}</span>
              <ArrowRight className={`w-3 sm:w-4 h-3 sm:h-4 transition-colors flex-shrink-0 ${
                isDarkMode 
                  ? 'text-gray-600 group-hover:text-slate-400' 
                  : 'text-gray-300 group-hover:text-slate-500'
              }`} />
            </button>
          ))}
        </div>
      </div>

      {/* Available Tools - Hidden on mobile to save space */}
      <div className={`hidden sm:block mt-8 pt-8 w-full max-w-lg ${
        isDarkMode ? 'border-t border-white/10' : 'border-t border-white/20'
      }`}>
        <p className={`text-[10px] font-mono uppercase tracking-widest mb-3 text-center ${
          isDarkMode ? 'text-slate-500' : 'text-slate-400'
        }`}>
          Available Tools
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {TOOLS.map((tool, index) => (
            <div
              key={index}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs ${
                isDarkMode 
                  ? 'bg-white/5 text-slate-400 border border-white/10' 
                  : 'bg-white/60 text-slate-500 border border-white/40'
              }`}
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
    <MessageSquare className="w-10 h-10 text-slate-300 mb-3" />
    <p className="text-sm text-slate-400">{message}</p>
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
      <div className="absolute inset-0 border-2 border-slate-200 rounded-full" />
      <div className="absolute inset-0 border-2 border-orange-500 rounded-full border-t-transparent animate-spin" />
    </div>
    <p className="text-sm text-slate-500">{message}</p>
  </div>
)

export default EmptyState

