
import React from 'react'
import { 
  MessageSquare, 
  Zap,
  FileText,
  Search
} from 'lucide-react'

interface EmptyStateProps {
  onSuggest: (query: string) => void
}

const EmptyState: React.FC<EmptyStateProps> = ({ onSuggest }) => {
  
  const SUGGESTIONS = [
    { label: "Audit my AI strategy", icon: <Zap className="w-3.5 h-3.5" />, category: "Consulting" },
    { label: "Draft a sales script", icon: <MessageSquare className="w-3.5 h-3.5" />, category: "Sales" },
    { label: "Research competitor pricing", icon: <Search className="w-3.5 h-3.5" />, category: "Research" },
    { label: "Summarize this PDF", icon: <FileText className="w-3.5 h-3.5" />, category: "Analysis" },
  ]

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in-up md:-mt-20">
      
      {/* 1. Minimal Logo Element */}
      <div className="mb-8 relative group cursor-default">
         <div className="absolute inset-0 bg-gradient-to-tr from-zinc-200 to-zinc-100 dark:from-zinc-800 dark:to-zinc-900 rounded-[32px] rotate-3 blur-xl opacity-40 group-hover:opacity-60 transition-opacity duration-1000"></div>
         <div className="relative w-20 h-20 bg-white dark:bg-black rounded-2xl flex items-center justify-center shadow-2xl border border-zinc-100 dark:border-zinc-800">
            <span className="font-serif text-2xl tracking-tighter italic font-bold text-black dark:text-white">
               F.B<span className="text-black dark:text-white">/</span>c
            </span>
         </div>
      </div>

      {/* 2. Welcome Text */}
      <div className="text-center mb-10 max-w-sm">
        <h2 className="text-xl font-medium tracking-tight text-zinc-900 dark:text-zinc-100 mb-2">
          Consulting Intelligence
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-500 leading-relaxed font-light">
          Advanced analysis, strategy formulation, and rapid content generation.
        </p>
      </div>

      {/* 3. Minimal Suggestions (Pills) */}
      <div className="w-full max-w-md flex flex-wrap justify-center gap-2">
        {SUGGESTIONS.map((s, i) => (
          <button
            key={i}
            onClick={() => onSuggest(s.label)}
            className="
              group flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 
              border border-zinc-200 dark:border-zinc-800 rounded-full
              hover:border-zinc-400 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800
              transition-all duration-200
            "
          >
            <span className="text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">
              {s.icon}
            </span>
            <span className="text-[13px] font-medium text-zinc-600 dark:text-zinc-400 group-hover:text-black dark:group-hover:text-white">
              {s.label}
            </span>
          </button>
        ))}
      </div>

    </div>
  )
}

export default EmptyState
