/**
 * Stage Progress Indicator
 * 
 * Visual progress bar showing funnel stages with particle effects.
 */

import React from 'react'
import type { StageItem } from '../src/context/StageContext'

interface StageProgressIndicatorProps {
  stages: StageItem[]
  compact?: boolean
  showLabels?: boolean
  className?: string
}

const StageProgressIndicator: React.FC<StageProgressIndicatorProps> = ({
  stages,
  compact = false,
  showLabels = true,
  className = ''
}) => {
  const visibleStages = stages.filter(s => s.order > 0).slice(0, compact ? 5 : 8)
  
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {visibleStages.map((stage, index) => (
        <React.Fragment key={stage.id}>
          {/* Stage dot/indicator */}
          <div className="relative group">
            <div 
              className={`
                relative flex items-center justify-center transition-all duration-300
                ${compact ? 'w-2 h-2' : 'w-3 h-3'}
                rounded-full
                ${stage.current 
                  ? `bg-${stage.color}-500 ring-2 ring-${stage.color}-200 ring-offset-1 shadow-[0_0_8px_var(--tw-shadow-color)]` 
                  : stage.done 
                    ? `bg-${stage.color}-400 opacity-80` 
                    : 'bg-gray-200'
                }
              `}
              style={{
                '--tw-shadow-color': stage.current ? `var(--${stage.color}-400)` : 'transparent'
              } as React.CSSProperties}
            >
              {/* Pulse animation for current stage */}
              {stage.current && (
                <span className="absolute inset-0 rounded-full animate-ping bg-current opacity-20" />
              )}
              
              {/* Progress indicator within stage */}
              {stage.current && stage.progress > 0 && (
                <div 
                  className="absolute inset-0 rounded-full bg-white/30"
                  style={{
                    clipPath: `inset(${100 - stage.progress}% 0 0 0)`
                  }}
                />
              )}
            </div>
            
            {/* Tooltip on hover */}
            {showLabels && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                <div className="bg-gray-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap shadow-lg">
                  <div className="font-medium">{stage.label}</div>
                  <div className="text-gray-400 text-[8px]">{stage.description}</div>
                  {stage.current && stage.progress > 0 && (
                    <div className="text-[8px] text-blue-300 mt-0.5">{stage.progress}% complete</div>
                  )}
                </div>
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
              </div>
            )}
          </div>
          
          {/* Connector line */}
          {index < visibleStages.length - 1 && (
            <div 
              className={`
                ${compact ? 'w-3' : 'w-6'} h-px transition-all duration-300
                ${stage.done ? 'bg-gray-300' : 'bg-gray-200'}
              `}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

/**
 * Compact stage badge showing current stage name
 */
export const StageBadge: React.FC<{ 
  stage: StageItem 
  className?: string 
}> = ({ stage, className = '' }) => (
  <div 
    className={`
      inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium
      bg-${stage.color}-50 text-${stage.color}-700 border border-${stage.color}-200
      ${className}
    `}
  >
    <div className={`w-1.5 h-1.5 rounded-full bg-${stage.color}-500 ${stage.current ? 'animate-pulse' : ''}`} />
    {stage.label}
  </div>
)

/**
 * Vertical stage list (for sidebar)
 */
export const StageList: React.FC<{
  stages: StageItem[]
  className?: string
}> = ({ stages, className = '' }) => (
  <div className={`flex flex-col gap-2 ${className}`}>
    {stages.filter(s => s.order > 0).map(stage => (
      <div 
        key={stage.id}
        className={`
          flex items-center gap-3 p-2 rounded-lg transition-all
          ${stage.current 
            ? 'bg-gray-100 border border-gray-200' 
            : stage.done 
              ? 'opacity-60' 
              : 'opacity-40'
          }
        `}
      >
        <div 
          className={`
            w-3 h-3 rounded-full flex-shrink-0
            ${stage.current 
              ? `bg-${stage.color}-500 shadow-[0_0_6px_var(--tw-shadow-color)]` 
              : stage.done 
                ? `bg-${stage.color}-300` 
                : 'bg-gray-200'
            }
          `}
          style={{
            '--tw-shadow-color': stage.current ? `var(--${stage.color}-400)` : 'transparent'
          } as React.CSSProperties}
        >
          {stage.done && (
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
        </div>
        <div>
          <div className="text-xs font-medium text-gray-800">{stage.label}</div>
          <div className="text-[10px] text-gray-500">{stage.description}</div>
        </div>
      </div>
    ))}
  </div>
)

export default StageProgressIndicator

