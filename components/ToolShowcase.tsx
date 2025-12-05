/**
 * Tool Showcase Modal
 * 
 * Information modal showing all available tools
 * and their capabilities.
 */

import React, { useState } from 'react'
import { 
  X, 
  Search, 
  Cloud, 
  Calendar, 
  Building, 
  Camera, 
  Monitor,
  FileText,
  Mail,
  BarChart,
  CheckCircle,
  Info,
  Wrench
} from 'lucide-react'

export interface ToolInfo {
  name: string
  displayName: string
  description: string
  icon: React.ReactNode
  examples: string[]
  available: boolean
  category: 'search' | 'data' | 'media' | 'documents' | 'communication'
}

const TOOLS: ToolInfo[] = [
  {
    name: 'search_web',
    displayName: 'Web Search',
    description: 'Search the web for real-time information, news, and research.',
    icon: <Search className="w-5 h-5" />,
    examples: ['What are the latest AI trends?', 'Research Tesla stock performance'],
    available: true,
    category: 'search'
  },
  {
    name: 'get_weather',
    displayName: 'Weather',
    description: 'Get current weather conditions for any location in Celsius.',
    icon: <Cloud className="w-5 h-5" />,
    examples: ['What\'s the weather in Oslo?', 'Will it rain tomorrow?'],
    available: true,
    category: 'data'
  },
  {
    name: 'create_calendar_widget',
    displayName: 'Calendar Booking',
    description: 'Schedule a consultation or workshop session.',
    icon: <Calendar className="w-5 h-5" />,
    examples: ['Book a strategy call', 'Schedule a workshop'],
    available: true,
    category: 'communication'
  },
  {
    name: 'search_companies_by_location',
    displayName: 'Company Search',
    description: 'Find businesses and companies in a specific area.',
    icon: <Building className="w-5 h-5" />,
    examples: ['Find tech companies near me', 'AI startups in London'],
    available: true,
    category: 'search'
  },
  {
    name: 'capture_webcam_snapshot',
    displayName: 'Webcam Analysis',
    description: 'Capture and analyze what your camera sees.',
    icon: <Camera className="w-5 h-5" />,
    examples: ['What do you see?', 'Analyze this document I\'m holding'],
    available: true,
    category: 'media'
  },
  {
    name: 'capture_screen_snapshot',
    displayName: 'Screen Analysis',
    description: 'Capture and analyze your screen content.',
    icon: <Monitor className="w-5 h-5" />,
    examples: ['Look at my dashboard', 'Review this spreadsheet'],
    available: true,
    category: 'media'
  },
  {
    name: 'extract_action_items',
    displayName: 'Action Items',
    description: 'Extract tasks and action items from our conversation.',
    icon: <FileText className="w-5 h-5" />,
    examples: ['What should I do next?', 'Summarize our action items'],
    available: true,
    category: 'documents'
  },
  {
    name: 'generate_summary_preview',
    displayName: 'Summary',
    description: 'Generate a summary of our conversation.',
    icon: <FileText className="w-5 h-5" />,
    examples: ['Summarize our chat', 'Give me the key points'],
    available: true,
    category: 'documents'
  },
  {
    name: 'draft_follow_up_email',
    displayName: 'Email Draft',
    description: 'Draft a follow-up email based on our conversation.',
    icon: <Mail className="w-5 h-5" />,
    examples: ['Draft a follow-up email', 'Write a thank you note'],
    available: true,
    category: 'communication'
  },
  {
    name: 'generate_proposal_draft',
    displayName: 'Proposal',
    description: 'Generate a consulting proposal with pricing.',
    icon: <FileText className="w-5 h-5" />,
    examples: ['Create a proposal', 'What would this cost?'],
    available: true,
    category: 'documents'
  },
  {
    name: 'get_dashboard_stats',
    displayName: 'Dashboard Stats',
    description: 'Get business analytics and statistics.',
    icon: <BarChart className="w-5 h-5" />,
    examples: ['Show me the stats', 'How is the business doing?'],
    available: true,
    category: 'data'
  },
]

const CATEGORIES = {
  search: { label: 'Search & Research', color: 'bg-blue-50 text-blue-600' },
  data: { label: 'Data & Analytics', color: 'bg-green-50 text-green-600' },
  media: { label: 'Media Analysis', color: 'bg-purple-50 text-purple-600' },
  documents: { label: 'Documents', color: 'bg-amber-50 text-amber-600' },
  communication: { label: 'Communication', color: 'bg-pink-50 text-pink-600' },
}

interface ToolShowcaseProps {
  isOpen: boolean
  onClose: () => void
}

const ToolShowcase: React.FC<ToolShowcaseProps> = ({
  isOpen,
  onClose
}) => {
  // Remove unused state declarations
  // const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  // const [selectedTool, setSelectedTool] = useState<ToolInfo | null>(null)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="
        relative w-full max-w-4xl max-h-[90vh] overflow-hidden
        bg-white/80 dark:bg-black/80 backdrop-blur-xl border border-white/20 dark:border-white/10 
        rounded-3xl shadow-2xl ring-1 ring-black/5
        flex flex-col animate-fade-in-up
      ">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-black/5 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-tr from-orange-400 to-orange-600 rounded-xl shadow-lg">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-medium text-slate-900 dark:text-white">System Capabilities</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {TOOLS.length} tools available to help you
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(CATEGORIES).map(([key, cat]) => {
              const categoryTools = TOOLS.filter(t => t.category === key)
              return (
                <div 
                  key={key}
                  className="group p-4 rounded-2xl bg-white/40 dark:bg-white/5 border border-white/40 dark:border-white/5 hover:border-orange-200 dark:hover:border-orange-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/5"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-lg ${cat.color} bg-opacity-10`}>
                      <div className={cat.color.replace('bg-', 'text-').split(' ')[1]}>
                        {/* No specific icon for category, could add later */}
                        <Info className="w-4 h-4" />
                      </div>
                    </div>
                    <h3 className="font-medium text-slate-900 dark:text-white text-sm">{cat.label}</h3>
                  </div>
                  
                  <div className="space-y-2">
                    {categoryTools.map(tool => (
                      <div 
                        key={tool.name}
                        className="flex items-start gap-2 p-2 rounded-lg hover:bg-white/50 dark:hover:bg-white/5 transition-colors"
                      >
                        <div className="mt-0.5 text-slate-400 dark:text-slate-500 scale-75 origin-top-left">
                          {tool.icon}
                        </div>
                        <div>
                          <div className="text-xs font-medium text-slate-700 dark:text-slate-200">
                            {tool.displayName}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                            {tool.description}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50/50 dark:bg-white/5 border-t border-black/5 dark:border-white/10 flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-3 h-3 text-green-500" />
            <span>All systems operational</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
              Core
            </span>
            <span className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              Media
            </span>
            <span className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              Analysis
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Compact tool list for inline display
 */
export const ToolList: React.FC<{
  tools?: string[]
  className?: string
}> = ({ tools = TOOLS.map(t => t.name), className = '' }) => (
  <div className={`flex flex-wrap gap-1.5 ${className}`}>
    {tools.slice(0, 6).map(toolName => {
      const tool = TOOLS.find(t => t.name === toolName)
      if (!tool) return null
      return (
        <span 
          key={toolName}
          className={`
            inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px]
            ${CATEGORIES[tool.category].color}
          `}
        >
          {tool.icon}
          {tool.displayName}
        </span>
      )
    })}
    {tools.length > 6 && (
      <span className="text-xs text-gray-400 px-2">
        +{tools.length - 6} more
      </span>
    )}
  </div>
)

/**
 * Tool capability button to open showcase
 */
export const ToolCapabilityButton: React.FC<{
  onClick: () => void
  className?: string
}> = ({ onClick, className = '' }) => (
  <button
    onClick={onClick}
    className={`
      inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
      bg-gray-100 text-gray-600 hover:bg-gray-200
      transition-colors text-xs
      ${className}
    `}
  >
    <Info className="w-3.5 h-3.5" />
    View Tools
  </button>
)

export default ToolShowcase

