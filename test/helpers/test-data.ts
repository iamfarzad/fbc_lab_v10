import type { ResearchResult, TranscriptItem, AgentResponse } from '../../types'

export const mockResearchResult: ResearchResult = {
  company: {
    name: 'Acme Corp',
    domain: 'acme.com',
    industry: 'Technology',
    size: '50-200 employees',
    summary: 'A leading technology company',
    website: 'https://acme.com',
    linkedin: 'https://linkedin.com/company/acme',
    country: 'USA'
  },
  person: {
    fullName: 'John Doe',
    role: 'CTO',
    seniority: 'Executive',
    profileUrl: 'https://linkedin.com/in/johndoe',
    company: 'Acme Corp'
  },
  strategic: {
    latest_news: ['Company raised Series B', 'Launched new product'],
    competitors: ['Competitor A', 'Competitor B'],
    pain_points: ['Scaling infrastructure', 'Team coordination'],
    market_trends: ['AI adoption', 'Remote work']
  },
  role: 'CTO',
  confidence: 0.95,
  citations: [
    {
      uri: 'https://example.com/article',
      title: 'Article Title',
      description: 'Article description'
    }
  ]
}

export const mockTranscriptItem: TranscriptItem = {
  id: 'msg-1',
  role: 'user',
  text: 'Hello, I need help with AI automation',
  timestamp: new Date('2024-01-01T12:00:00Z'),
  isFinal: true
}

export const mockTranscript: TranscriptItem[] = [
  {
    id: 'msg-1',
    role: 'user',
    text: 'Hello',
    timestamp: new Date('2024-01-01T12:00:00Z'),
    isFinal: true
  },
  {
    id: 'msg-2',
    role: 'model',
    text: 'Hi! How can I help you?',
    timestamp: new Date('2024-01-01T12:00:01Z'),
    isFinal: true
  }
]

export const mockAgentResponse: AgentResponse = {
  success: true,
  output: 'I can help you with AI automation. What specific area are you interested in?',
  agent: 'Discovery Agent',
  model: 'gemini-2.5-flash',
  metadata: {
    stage: 'DISCOVERY',
    conversationFlow: {
      categoriesCovered: 2
    }
  }
}

export const mockAgentResponseWithError: AgentResponse = {
  success: false,
  error: 'Network error'
}

export const mockTranscriptWithAttachment: TranscriptItem = {
  id: 'msg-3',
  role: 'user',
  text: 'Here is an image',
  timestamp: new Date('2024-01-01T12:00:02Z'),
  isFinal: true,
  attachment: {
    type: 'image',
    mimeType: 'image/png',
    data: 'base64encodeddata'
  }
}

