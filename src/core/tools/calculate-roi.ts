/**
 * Calculate ROI Tool Executor
 * 
 * Calculates ROI from investment/savings parameters or extracts from existing artifact.
 */

import type { ROICalculationResult } from './tool-types'
import { isValidROIData, type ROIData } from 'src/core/pdf-roi-charts'
import { ContextStorage } from 'src/core/context/context-storage'

const contextStorage = new ContextStorage()

interface ROIParameters {
  currentCost?: number
  timeSavings?: number
  employeeCostPerHour?: number
  implementationCost?: number
  timeline?: number
  // Or direct ROI data structure
  initialInvestment?: number
  annualCost?: number
  staffReductionSavings?: number
  efficiencySavings?: number
  retentionSavings?: number
}

/**
 * Calculate ROI from parameters or extract from artifact
 * 
 * @param sessionId - Session ID to check for ROI artifact
 * @param params - ROI calculation parameters
 * @returns Calculated ROI metrics
 */
export async function calculateROI(
  sessionId: string,
  params: ROIParameters = {}
): Promise<ROICalculationResult> {
  try {
    let roiData: ROIData | null = null

    // First, try to extract from artifact if no parameters provided
    if (Object.keys(params).length === 0) {
      const context = await contextStorage.get(sessionId)
      if (context) {
        // Check if artifactInsights exists in context (might be in multimodal_context or as separate field)
        const contextRecord = context as unknown as Record<string, unknown>
        const multimodalContext = contextRecord.multimodal_context as Record<string, unknown> | undefined
        const artifactInsights = contextRecord.artifactInsights || multimodalContext?.artifactInsights
        
        if (artifactInsights) {
          const artifacts = Array.isArray(artifactInsights) 
            ? artifactInsights 
            : typeof artifactInsights === 'string'
            ? JSON.parse(artifactInsights) as unknown[]
            : []
          
          interface Artifact {
            type?: string
            payload?: unknown
          }
          const roiArtifact = artifacts.find(
            (a: unknown): a is Artifact => {
              const artifact = a as Artifact
              return artifact.type === 'Cost-Benefit Analysis' && artifact.payload !== undefined && isValidROIData(artifact.payload)
            }
          )
          
          if (roiArtifact && isValidROIData(roiArtifact.payload)) {
            roiData = roiArtifact.payload
          }
        }
      }
    }

    // If no artifact found, calculate from parameters
    if (!roiData) {
      // Use direct ROI structure if provided
      if (
        typeof params.initialInvestment === 'number' &&
        typeof params.annualCost === 'number' &&
        typeof params.staffReductionSavings === 'number' &&
        typeof params.efficiencySavings === 'number' &&
        typeof params.retentionSavings === 'number'
      ) {
        const totalSavings = 
          params.staffReductionSavings + 
          params.efficiencySavings + 
          params.retentionSavings
        
        const totalInvestment = params.initialInvestment + params.annualCost
        const firstYearROI = totalSavings - totalInvestment
        
        // Calculate payback period (months)
        const monthlySavings = totalSavings / 12
        const paybackMonths = totalInvestment / monthlySavings
        
        roiData = {
          investment: {
            initial: params.initialInvestment,
            annual: params.annualCost
          },
          savings: {
            staffReduction: params.staffReductionSavings,
            efficiency: params.efficiencySavings,
            retention: params.retentionSavings
          },
          roi: {
            firstYear: firstYearROI,
            paybackPeriod: `${paybackMonths.toFixed(1)} months`
          }
        }
      } else if (
        typeof params.implementationCost === 'number' &&
        typeof params.timeSavings === 'number' &&
        typeof params.employeeCostPerHour === 'number'
      ) {
        // Calculate from simplified parameters
        const annualSavings = params.timeSavings * params.employeeCostPerHour
        const initialInvestment = params.implementationCost
        const annualCost = params.currentCost || 0
        
        const totalInvestment = initialInvestment + annualCost
        const firstYearROI = annualSavings - totalInvestment
        
        // Calculate payback period (months)
        const monthlySavings = annualSavings / 12
        const paybackMonths = totalInvestment / monthlySavings
        
        roiData = {
          investment: {
            initial: initialInvestment,
            annual: annualCost
          },
          savings: {
            staffReduction: 0,
            efficiency: annualSavings,
            retention: 0
          },
          roi: {
            firstYear: firstYearROI,
            paybackPeriod: `${paybackMonths.toFixed(1)} months`
          }
        }
      } else {
        throw new Error(
          'ROI calculation requires either: ' +
          '(1) ROI artifact in session, or ' +
          '(2) initialInvestment, annualCost, staffReductionSavings, efficiencySavings, retentionSavings, or ' +
          '(3) implementationCost, timeSavings, employeeCostPerHour'
        )
      }
    }

    // Calculate final metrics
    const roiDataTyped = roiData as {
      investment: { initial: number; annual: number }
      savings: { staffReduction: number; efficiency: number; retention: number }
      roi: { firstYear: number; paybackPeriod: string }
    }
    const investmentTotal = roiDataTyped.investment.initial + roiDataTyped.investment.annual
    const savingsTotal = 
      roiDataTyped.savings.staffReduction + 
      roiDataTyped.savings.efficiency + 
      roiDataTyped.savings.retention
    
    const firstYearROI = roiDataTyped.roi.firstYear
    const roiPercentage = investmentTotal > 0 
      ? ((firstYearROI - investmentTotal) / investmentTotal) * 100 
      : 0
    
    // Estimate three-year ROI (assume same savings each year)
    const threeYearROI = (savingsTotal * 3) - (investmentTotal + roiDataTyped.investment.annual * 2)

    return {
      paybackPeriod: roiDataTyped.roi.paybackPeriod,
      firstYearROI,
      threeYearROI,
      roiPercentage: Number(roiPercentage.toFixed(1)),
      totalInvestment: investmentTotal,
      totalSavings: savingsTotal
    }
  } catch (error) {
    console.error('[calculateROI] Error:', error)
    throw new Error(
      error instanceof Error 
        ? `Failed to calculate ROI: ${error.message}`
        : 'Failed to calculate ROI'
    )
  }
}

