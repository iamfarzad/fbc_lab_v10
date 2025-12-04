/**
 * Stage Context Provider
 * 
 * Tracks conversation funnel progress with visual stage indicators.
 * Integrates with AntigravityCanvas for particle shape morphing.
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react'
import type { FunnelStage } from '../core/types/funnel-stage'
import { getStageMetadata, STAGE_ORDER } from '../core/types/funnel-stage'
import type { VisualShape } from '../../types'

/**
 * Stage item with visual metadata
 */
export interface StageItem {
  id: FunnelStage
  label: string
  description: string
  color: string
  shape: VisualShape
  done: boolean
  current: boolean
  progress: number // 0-100 completion within stage
  order: number
}

/**
 * Stage transition event
 */
export interface StageTransition {
  from: FunnelStage
  to: FunnelStage
  timestamp: number
  reason?: string
}

/**
 * Stage context state
 */
interface StageContextState {
  currentStage: FunnelStage
  stages: StageItem[]
  transitions: StageTransition[]
  isAnimating: boolean
}

/**
 * Stage context actions
 */
interface StageContextActions {
  setStage: (stage: FunnelStage, reason?: string) => void
  advanceStage: (reason?: string) => void
  resetStages: () => void
  setProgress: (progress: number) => void
  getCurrentShape: () => VisualShape
}

type StageContextValue = StageContextState & StageContextActions

const StageContext = createContext<StageContextValue | null>(null)

/**
 * Map FunnelStage to VisualShape
 */
function stageToShape(stage: FunnelStage): VisualShape {
  const shapeMap: Record<FunnelStage, VisualShape> = {
    DISCOVERY: 'discovery',
    SCORING: 'scoring',
    INTELLIGENCE_GATHERING: 'brain',
    WORKSHOP_PITCH: 'workshop',
    CONSULTING_PITCH: 'consulting',
    PITCHING: 'orb',
    PROPOSAL: 'proposal',
    OBJECTION: 'shield',
    CLOSING: 'closer',
    BOOKING_REQUESTED: 'star',
    BOOKED: 'heart',
    SUMMARY: 'summary',
    RETARGETING: 'retargeting',
    ADMIN: 'admin',
    FORCE_EXIT: 'vortex'
  }
  return shapeMap[stage] || 'wave'
}

/**
 * Build stages list with current state
 */
function buildStagesList(currentStage: FunnelStage): StageItem[] {
  const currentOrder = getStageMetadata(currentStage).order
  
  return STAGE_ORDER.map(stageId => {
    const meta = getStageMetadata(stageId)
    return {
      id: stageId,
      label: meta.label,
      description: meta.description,
      color: meta.color,
      shape: stageToShape(stageId),
      done: meta.order < currentOrder,
      current: stageId === currentStage,
      progress: stageId === currentStage ? 0 : (meta.order < currentOrder ? 100 : 0),
      order: meta.order
    }
  })
}

interface StageProviderProps {
  children: React.ReactNode
  initialStage?: FunnelStage
}

export function StageProvider({ children, initialStage = 'DISCOVERY' }: StageProviderProps) {
  const [currentStage, setCurrentStage] = useState<FunnelStage>(initialStage)
  const [transitions, setTransitions] = useState<StageTransition[]>([])
  const [isAnimating, setIsAnimating] = useState(false)
  const [stageProgress, setStageProgress] = useState(0)
  
  const stages = useMemo(() => {
    const list = buildStagesList(currentStage)
    // Update current stage progress
    return list.map(s => 
      s.current ? { ...s, progress: stageProgress } : s
    )
  }, [currentStage, stageProgress])
  
  const setStage = useCallback((stage: FunnelStage, reason?: string) => {
    if (stage === currentStage) return
    
    setIsAnimating(true)
    setTransitions(prev => [...prev, {
      from: currentStage,
      to: stage,
      timestamp: Date.now(),
      reason
    }])
    setCurrentStage(stage)
    setStageProgress(0)
    
    // Animation duration
    setTimeout(() => setIsAnimating(false), 500)
  }, [currentStage])
  
  const advanceStage = useCallback((reason?: string) => {
    const currentIndex = STAGE_ORDER.indexOf(currentStage)
    if (currentIndex < STAGE_ORDER.length - 1) {
      setStage(STAGE_ORDER[currentIndex + 1], reason)
    }
  }, [currentStage, setStage])
  
  const resetStages = useCallback(() => {
    setCurrentStage('DISCOVERY')
    setTransitions([])
    setStageProgress(0)
    setIsAnimating(false)
  }, [])
  
  const setProgress = useCallback((progress: number) => {
    setStageProgress(Math.min(100, Math.max(0, progress)))
  }, [])
  
  const getCurrentShape = useCallback((): VisualShape => {
    return stageToShape(currentStage)
  }, [currentStage])
  
  const value: StageContextValue = {
    currentStage,
    stages,
    transitions,
    isAnimating,
    setStage,
    advanceStage,
    resetStages,
    setProgress,
    getCurrentShape
  }
  
  return (
    <StageContext.Provider value={value}>
      {children}
    </StageContext.Provider>
  )
}

/**
 * Hook to use stage context
 */
export function useStageContext(): StageContextValue {
  const context = useContext(StageContext)
  if (!context) {
    throw new Error('useStageContext must be used within a StageProvider')
  }
  return context
}

/**
 * Hook to get current stage shape for canvas
 */
export function useStageShape(): VisualShape {
  const context = useContext(StageContext)
  return context?.getCurrentShape() ?? 'wave'
}

/**
 * Hook to check if currently animating between stages
 */
export function useIsStageAnimating(): boolean {
  const context = useContext(StageContext)
  return context?.isAnimating ?? false
}

export default StageContext

