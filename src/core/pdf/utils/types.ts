export interface ResearchHighlight {
  messageId: string
  timestamp: string | Date
  query?: string
  combinedAnswer?: string
  urlsUsed?: string[]
  citationCount?: number
  searchGroundingUsed?: number
  urlContextUsed?: number
  error?: string
}

export interface ArtifactInsight {
  id: string
  type: string
  status?: string
  payload?: Record<string, unknown> | null
  createdAt?: number
  updatedAt?: number
  version?: number
  error?: string
}

export interface SummaryData {
  leadInfo: {
    name: string
    email: string
    company?: string
    role?: string
  }
  conversationHistory: Array<{
    role: 'user' | 'assistant'
    content: string
    timestamp: string
  }>
  leadResearch?: {
    conversation_summary?: string
    consultant_brief?: string
    lead_score?: number
    ai_capabilities_shown?: string
  }
  sessionId: string
  researchHighlights?: ResearchHighlight[]
  artifactInsights?: ArtifactInsight[]
  multimodalContext?: {
    visualAnalyses: Array<{
      id: string
      timestamp: string
      type: 'webcam' | 'screen' | 'upload'
      analysis: string
    }>
    voiceTranscripts: Array<{
      id: string
      timestamp: string
      type: 'voice_input' | 'voice_output' | 'voice_transcript'
      data: { transcript?: string; isFinal?: boolean }
    }>
    uploadedFiles: Array<{
      id: string
      filename: string
      mimeType: string
      size: number
      analysis: string
      pages?: number
    }>
    summary: {
      totalMessages: number
      modalitiesUsed: string[]
      recentVisualAnalyses: number
      recentAudioEntries: number
      recentUploads: number
    }
  }
  proposal?: {
    recommendedSolution?: string
    pricingBallpark?: string
    solutionRationale?: string
    expectedROI?: string
    nextSteps?: string
  }
  artifacts?: {
    executiveMemo?: {
      targetAudience: 'CFO' | 'CEO' | 'CTO'
      content: string // Full memo text
      subject?: string // Email subject line
    }
    customSyllabus?: {
      title: string
      modules: Array<{ title: string; topics: string[] }>
    }
    costOfInaction?: {
      monthlyWaste: number
      annualWaste: number
      inefficiencySource: string
    }
    competitorGap?: {
      clientState: string
      competitors: string[]
      gapAnalysis: string
    }
  }
}

export type Mode = 'client' | 'internal'

export interface ConversationPair {
  user: { content: string; timestamp: string }
  assistant?: { content: string; timestamp: string }
}

