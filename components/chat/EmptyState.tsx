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
  Sparkles,
  ArrowRight
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
      <div className="relative mb-8 sm:mb-10 group">
        <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center shadow-2xl transition-transform duration-700 group-hover:scale-105 ${
          isDarkMode 
            ? 'bg-gradient-to-tr from-gray-800 to-black border border-white/10' 
            : 'bg-gradient-to-tr from-white to-gray-100 border border-white/60'
        }`}>
          <MessageSquare className={`w-8 h-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-400'}`} strokeWidth={1.5} />
        </div>
        <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg animate-bounce-subtle">
          <Sparkles className="w-4 h-4 text-white" strokeWidth={2} />
        </div>
      </div>

      {/* Greeting */}
      <h2 className={`text-2xl sm:text-3xl font-medium tracking-tight mb-2 text-center ${
        isDarkMode ? 'text-white' : 'text-slate-900'
      }`}>
        {userName ? (
          <>Hello, <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-orange-600">{userName}</span></>
        ) : 'I am F.B/c.'}
      </h2>
      <p className={`text-sm font-light leading-relaxed mb-1 text-center max-w-md ${
        isDarkMode ? 'text-white/40' : 'text-slate-500'
      }`}>
        I can analyze files, browse the web, and help you plan.
      </p>
      <p className="text-[10px] text-gray-400 mb-10 text-center">
         Your data is processed securely & privately.
      </p>

      {/* Quick Actions */}
      <div className="flex flex-wrap justify-center gap-3 mb-12">
        {hasVoice && onActionClick && (
          <button
            onClick={() => onActionClick('voice')}
            className={`
              group flex items-center gap-2 px-5 py-2.5 rounded-full transition-all duration-300
              backdrop-blur-md border
              ${isDarkMode 
                ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white' 
                : 'bg-white/60 border-black/5 hover:bg-white text-slate-700 hover:shadow-md'
              }
            `}
          >
            <Mic className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity text-orange-500" />
            <span className="text-xs font-medium">Voice Mode</span>
          </button>
        )}
        {hasWebcam && onActionClick && (
          <button
            onClick={() => onActionClick('webcam')}
            className={`
              group flex items-center gap-2 px-5 py-2.5 rounded-full transition-all duration-300
              backdrop-blur-md border
              ${isDarkMode 
                ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white' 
                : 'bg-white/60 border-black/5 hover:bg-white text-slate-700 hover:shadow-md'
              }
            `}
          >
            <Camera className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity text-blue-500" />
            <span className="text-xs font-medium">Use Camera</span>
          </button>
        )}
        {onActionClick && (
          <button
            onClick={() => onActionClick('upload')}
            className={`
              group flex items-center gap-2 px-5 py-2.5 rounded-full transition-all duration-300
              backdrop-blur-md border
              ${isDarkMode 
                ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white' 
                : 'bg-white/60 border-black/5 hover:bg-white text-slate-700 hover:shadow-md'
              }
            `}
          >
            <FileUp className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity text-purple-500" />
            <span className="text-xs font-medium">Analyze File</span>
          </button>
        )}
      </div>

      {/* Suggestions */}
      <div className="w-full max-w-lg space-y-3">
        <p className={`text-[10px] font-mono uppercase tracking-widest mb-4 text-center opacity-40 ${
          isDarkMode ? 'text-white' : 'text-black'
        }`}>
          Suggested Queries
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SUGGESTIONS.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => onSuggestionClick?.(suggestion.text)}
              className={`
                flex items-center gap-3 p-4 rounded-2xl text-left transition-all duration-300 group
                border backdrop-blur-sm
                ${isDarkMode 
                  ? 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10' 
                  : 'bg-white/60 border-white/60 hover:bg-white hover:shadow-lg hover:shadow-black/5 hover:-translate-y-0.5'
                }
              `}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors flex-shrink-0 ${
                isDarkMode 
                  ? 'bg-black/20 text-white/40 group-hover:text-white/80' 
                  : 'bg-slate-50 text-slate-400 group-hover:text-slate-600'
              }`}>
                {suggestion.icon}
              </div>
              <span className={`text-xs font-medium leading-snug flex-1 ${
                isDarkMode ? 'text-white/70 group-hover:text-white' : 'text-slate-600 group-hover:text-slate-900'
              }`}>{suggestion.text}</span>
              <ArrowRight className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${
                isDarkMode ? 'text-white/30 group-hover:text-white/60' : 'text-slate-400 group-hover:text-slate-600'
              }`} />
            </button>
          ))}
        </div>
      </div>

      {/* Available Tools - Hidden on mobile to save space */}
      <div className={`hidden sm:block mt-8 pt-8 w-full max-w-lg ${
        isDarkMode ? 'border-t border-white/10' : 'border-t border-gray-100'
      }`}>
        <p className={`text-xs font-medium uppercase tracking-wider mb-3 text-center ${
          isDarkMode ? 'text-gray-500' : 'text-gray-400'
        }`}>
          Available Tools
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {TOOLS.map((tool, index) => (
            <div
              key={index}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs ${
                isDarkMode 
                  ? 'bg-white/5 text-gray-400' 
                  : 'bg-gray-50 text-gray-500'
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

