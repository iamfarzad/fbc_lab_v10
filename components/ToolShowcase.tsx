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
  Globe,
  CheckCircle,
  AlertCircle,
  Info
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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedTool, setSelectedTool] = useState<ToolInfo | null>(null)

  if (!isOpen) return null

  const filteredTools = selectedCategory 
    ? TOOLS.filter(t => t.category === selectedCategory)
    : TOOLS

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Available Tools</h2>
            <p className="text-sm text-gray-500">
              {TOOLS.length} tools available to help you
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Category Filters */}
        <div className="px-6 py-3 border-b bg-gray-50 flex gap-2 overflow-x-auto">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`
              px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap
              transition-colors
              ${!selectedCategory 
                ? 'bg-gray-900 text-white' 
                : 'bg-white text-gray-600 hover:bg-gray-100'
              }
            `}
          >
            All
          </button>
          {Object.entries(CATEGORIES).map(([key, cat]) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              className={`
                px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap
                transition-colors
                ${selectedCategory === key 
                  ? 'bg-gray-900 text-white' 
                  : `${cat.color} hover:opacity-80`
                }
              `}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Tool Grid */}
        <div className="p-6 overflow-y-auto max-h-[50vh]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredTools.map(tool => (
              <button
                key={tool.name}
                onClick={() => setSelectedTool(tool)}
                className={`
                  flex items-start gap-3 p-4 rounded-xl text-left
                  transition-all hover:scale-[1.02]
                  ${selectedTool?.name === tool.name 
                    ? 'bg-orange-50 border-2 border-orange-200' 
                    : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'
                  }
                `}
              >
                <div className={`
                  p-2 rounded-lg
                  ${CATEGORIES[tool.category].color}
                `}>
                  {tool.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {tool.displayName}
                    </span>
                    {tool.available ? (
                      <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-gray-400" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                    {tool.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Tool Details */}
        {selectedTool && (
          <div className="px-6 py-4 border-t bg-gray-50">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl ${CATEGORIES[selectedTool.category].color}`}>
                {selectedTool.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">
                  {selectedTool.displayName}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedTool.description}
                </p>
                <div className="mt-3">
                  <p className="text-xs font-medium text-gray-500 mb-2">
                    Try saying:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedTool.examples.map((example, i) => (
                      <span 
                        key={i}
                        className="px-2 py-1 bg-white rounded-lg text-xs text-gray-600 border"
                      >
                        "{example}"
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
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

