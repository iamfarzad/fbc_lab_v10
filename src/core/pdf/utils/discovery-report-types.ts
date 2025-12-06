/**
 * Discovery Report Types
 * 
 * Type definitions for the AI Discovery Report PDF
 * McKinsey/BCG-style lead magnet document
 */

// Tool usage tracking for timeline
export interface ToolUsageRecord {
  name: string
  timestamp: string
  insight?: string
  args?: Record<string, unknown>
}

// Engagement metrics for radar chart
export interface EngagementMetrics {
  text: number      // 0-100 based on message count
  voice: number     // 0-100 based on voice duration
  screen: number    // 0-100 based on screen share usage
  files: number     // 0-100 based on files uploaded
}

// ROI data for chart (simplified for discovery report)
export interface DiscoveryROIData {
  hasData: boolean
  investment?: number
  projectedSavings?: number
  roiPercentage?: number
  paybackPeriod?: string
}

// Multimodal observation summary
export interface MultimodalObservation {
  type: 'voice' | 'screen' | 'file' | 'webcam'
  icon: string
  summary: string
  detail?: string
}

// Executive insight extracted from conversation
export interface ExecutiveInsight {
  text: string
  category?: 'goal' | 'pain_point' | 'opportunity' | 'observation'
}

// Main Discovery Report Data interface
export interface DiscoveryReportData {
  // Header
  reportDate: string
  reportRef: string
  
  // Client Information
  client: {
    name: string
    company?: string
    role?: string
    email?: string
  }
  
  // Engagement
  engagementLevel: 'Low' | 'Medium' | 'High'
  engagementMetrics: EngagementMetrics
  
  // Executive Insights (3-5 key points)
  insights: ExecutiveInsight[]
  
  // What AI Observed
  observations: MultimodalObservation[]
  
  // Tools/Capabilities Demonstrated
  toolsUsed: ToolUsageRecord[]
  
  // ROI Data (if calculate_roi was used)
  roi?: DiscoveryROIData
  
  // Recommended Solution
  recommendedSolution?: 'workshop' | 'consulting' | 'both'
  solutionRationale?: string
  
  // Session Metadata
  sessionId: string
  sessionDuration?: number // in minutes
  totalMessages?: number
  modalitiesUsed: string[]
  
  // CTA
  bookingUrl: string
  consultantEmail: string
  consultantName: string
}

// Helper to calculate engagement level from metrics
export function calculateEngagementLevel(metrics: EngagementMetrics): 'Low' | 'Medium' | 'High' {
  const average = (metrics.text + metrics.voice + metrics.screen + metrics.files) / 4
  if (average >= 60) return 'High'
  if (average >= 30) return 'Medium'
  return 'Low'
}

// Helper to calculate engagement metrics from raw data
export function calculateEngagementMetrics(data: {
  messageCount: number
  voiceMinutes: number
  screenMinutes: number
  filesUploaded: number
}): EngagementMetrics {
  return {
    text: Math.min(100, data.messageCount * 5),           // 20 messages = 100
    voice: Math.min(100, data.voiceMinutes * 6.67),       // 15 minutes = 100
    screen: Math.min(100, data.screenMinutes * 10),       // 10 minutes = 100
    files: Math.min(100, data.filesUploaded * 25)         // 4 files = 100
  }
}

// Tool name to friendly label mapping
export const TOOL_LABELS: Record<string, string> = {
  'search_web': 'Web Research',
  'get_weather': 'Weather Check',
  'search_companies_by_location': 'Company Search',
  'calculate_roi': 'ROI Analysis',
  'extract_action_items': 'Action Items',
  'generate_summary_preview': 'Summary Preview',
  'draft_follow_up_email': 'Email Draft',
  'generate_proposal_draft': 'Proposal Draft',
  'capture_screen_snapshot': 'Screen Analysis',
  'capture_webcam_snapshot': 'Visual Analysis',
  'get_dashboard_stats': 'Dashboard Stats'
}

// Tool icons handled by chart generators directly
export const TOOL_ICONS: Record<string, string> = {}

