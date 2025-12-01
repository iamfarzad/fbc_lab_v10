/**
 * Type definitions for PDF generator tool call results
 */

export interface ActionItemsResult {
  recommendations: string[]
  nextSteps: string[]
  keyDecisions: string[]
  importantPoints: string[]
}

export interface ROICalculationResult {
  paybackPeriod: string
  firstYearROI: number
  threeYearROI: number
  roiPercentage: number
  totalInvestment: number
  totalSavings: number
}

export interface EmailDraftResult {
  subject: string
  body: string
  cta: string
}

