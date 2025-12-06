/**
 * Discovery Report Generator
 * 
 * Generates the AI Discovery Report PDF from collected session data
 * Uses Puppeteer for HTML→PDF rendering with pdf-lib fallback
 */

import puppeteer from 'puppeteer'
import type { DiscoveryReportData, ToolUsageRecord, EngagementMetrics, MultimodalObservation, ExecutiveInsight } from './utils/discovery-report-types.js'
import { calculateEngagementMetrics, calculateEngagementLevel } from './utils/discovery-report-types.js'
import { generateDiscoveryReportHTML } from './templates/discovery-report-template.js'
import { CONTACT_CONFIG } from '../../config/constants.js'

/**
 * Session data input for report generation
 */
export interface SessionDataInput {
  sessionId: string
  leadInfo: {
    name: string
    email?: string
    company?: string
    role?: string
  }
  conversationSummary?: string
  keyFindings?: {
    goals?: string
    painPoints?: string[]
    currentSituation?: string
  }
  multimodalContext?: {
    voiceSummary?: string
    voiceMinutes?: number
    screenSummary?: string
    screenMinutes?: number
    filesReviewed?: Array<{ filename: string; analysis: string }>
    webcamSummary?: string
  }
  toolsUsed?: ToolUsageRecord[]
  roiData?: {
    investment?: number
    projectedSavings?: number
    roiPercentage?: number
    paybackPeriod?: string
  }
  recommendedSolution?: 'workshop' | 'consulting' | 'both'
  solutionRationale?: string
  messageCount?: number
}

/**
 * Build DiscoveryReportData from session data
 */
export function buildDiscoveryReportData(input: SessionDataInput): DiscoveryReportData {
  // Calculate engagement metrics
  const metrics: EngagementMetrics = calculateEngagementMetrics({
    messageCount: input.messageCount || 0,
    voiceMinutes: input.multimodalContext?.voiceMinutes || 0,
    screenMinutes: input.multimodalContext?.screenMinutes || 0,
    filesUploaded: input.multimodalContext?.filesReviewed?.length || 0
  })
  
  // Build observations from multimodal context
  const observations: MultimodalObservation[] = []
  
  if (input.multimodalContext?.voiceSummary) {
    observations.push({
      type: 'voice',
      icon: '🎤',
      summary: input.multimodalContext.voiceSummary
    })
  }
  
  if (input.multimodalContext?.screenSummary) {
    observations.push({
      type: 'screen',
      icon: '🖥️',
      summary: input.multimodalContext.screenSummary
    })
  }
  
  if (input.multimodalContext?.filesReviewed && input.multimodalContext.filesReviewed.length > 0) {
    input.multimodalContext.filesReviewed.forEach(file => {
      observations.push({
        type: 'file',
        icon: '📄',
        summary: `${file.filename}: ${file.analysis}`
      })
    })
  }
  
  if (input.multimodalContext?.webcamSummary) {
    observations.push({
      type: 'webcam',
      icon: '📷',
      summary: input.multimodalContext.webcamSummary
    })
  }
  
  // Build insights from key findings
  const insights: ExecutiveInsight[] = []
  
  if (input.keyFindings?.goals) {
    insights.push({ text: input.keyFindings.goals, category: 'goal' })
  }
  
  if (input.keyFindings?.painPoints) {
    input.keyFindings.painPoints.forEach(pain => {
      insights.push({ text: pain, category: 'pain_point' })
    })
  }
  
  if (input.keyFindings?.currentSituation) {
    insights.push({ text: input.keyFindings.currentSituation, category: 'observation' })
  }
  
  // If we have a conversation summary but no other insights, extract from it
  if (insights.length === 0 && input.conversationSummary) {
    insights.push({ text: input.conversationSummary, category: 'observation' })
  }
  
  // Build modalities used list
  const modalitiesUsed: string[] = ['text']
  if (input.multimodalContext?.voiceMinutes && input.multimodalContext.voiceMinutes > 0) {
    modalitiesUsed.push('voice')
  }
  if (input.multimodalContext?.screenMinutes && input.multimodalContext.screenMinutes > 0) {
    modalitiesUsed.push('screen')
  }
  if (input.multimodalContext?.filesReviewed && input.multimodalContext.filesReviewed.length > 0) {
    modalitiesUsed.push('upload')
  }
  
  // Build client object, only including defined values
  const client: DiscoveryReportData['client'] = {
    name: input.leadInfo.name
  }
  if (input.leadInfo.company) client.company = input.leadInfo.company
  if (input.leadInfo.role) client.role = input.leadInfo.role
  if (input.leadInfo.email) client.email = input.leadInfo.email

  // Build ROI object
  const roi: DiscoveryReportData['roi'] = input.roiData && 
    (input.roiData.investment !== undefined || input.roiData.projectedSavings !== undefined)
    ? {
        hasData: true,
        ...(input.roiData.investment !== undefined && { investment: input.roiData.investment }),
        ...(input.roiData.projectedSavings !== undefined && { projectedSavings: input.roiData.projectedSavings }),
        ...(input.roiData.roiPercentage !== undefined && { roiPercentage: input.roiData.roiPercentage }),
        ...(input.roiData.paybackPeriod !== undefined && { paybackPeriod: input.roiData.paybackPeriod })
      }
    : { hasData: false }

  // Build result object with only defined optional properties
  const result: DiscoveryReportData = {
    reportDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    reportRef: `FBC-${input.sessionId.slice(-8)}`,
    client,
    engagementLevel: calculateEngagementLevel(metrics),
    engagementMetrics: metrics,
    insights,
    observations,
    toolsUsed: input.toolsUsed || [],
    sessionId: input.sessionId,
    modalitiesUsed,
    bookingUrl: CONTACT_CONFIG.SCHEDULING.BOOKING_URL,
    consultantEmail: CONTACT_CONFIG.SUPPORT_EMAIL,
    consultantName: 'Farzad Bayat'
  }

  // Add optional properties only if defined
  if (roi) result.roi = roi
  if (input.recommendedSolution) result.recommendedSolution = input.recommendedSolution
  if (input.solutionRationale) result.solutionRationale = input.solutionRationale
  if (input.multimodalContext?.voiceMinutes !== undefined) result.sessionDuration = input.multimodalContext.voiceMinutes
  if (input.messageCount !== undefined) result.totalMessages = input.messageCount

  return result
}

/**
 * Generate Discovery Report PDF using Puppeteer
 */
export async function generateDiscoveryReportPDF(data: DiscoveryReportData): Promise<Uint8Array> {
  const html = generateDiscoveryReportHTML(data)
  
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--single-process',
        '--disable-extensions'
      ],
      timeout: 15000
    })
    
    try {
      const page = await browser.newPage()
      await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 15000 })
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true
      })
      
      return new Uint8Array(pdfBuffer)
    } finally {
      await browser.close()
    }
  } catch (error) {
    console.error('Puppeteer PDF generation failed:', error)
    throw error
  }
}

/**
 * Generate Discovery Report as HTML string (for inline preview)
 */
export function generateDiscoveryReportHTMLString(data: DiscoveryReportData): string {
  return generateDiscoveryReportHTML(data)
}

/**
 * Generate Discovery Report from session data (convenience function)
 */
export async function generateDiscoveryReportFromSession(input: SessionDataInput): Promise<{
  html: string
  pdf: Uint8Array
  data: DiscoveryReportData
}> {
  const data = buildDiscoveryReportData(input)
  const html = generateDiscoveryReportHTML(data)
  const pdf = await generateDiscoveryReportPDF(data)
  
  return { html, pdf, data }
}

/**
 * Generate Discovery Report as base64 data URL
 */
export async function generateDiscoveryReportDataURL(data: DiscoveryReportData): Promise<string> {
  const pdf = await generateDiscoveryReportPDF(data)
  const base64 = Buffer.from(pdf).toString('base64')
  return `data:application/pdf;base64,${base64}`
}

