import { google, generateText } from '../../lib/ai-client.js'
import { safeGenerateText } from '../../lib/gemini-safe.js'
import { formatMessagesForAI } from '../../lib/format-messages.js'
import { buildModelSettings } from '../../lib/multimodal-helpers.js'
import { z } from 'zod'
import type { ChatMessage, AgentContext } from './types.js'
import { getSupabaseService } from '../../lib/supabase.js'
import { GEMINI_MODELS } from '../../config/constants.js'
import { agentAnalytics } from '../analytics/agent-analytics.js'
import { toolAnalytics } from '../analytics/tool-analytics.js'
import { toolExecutor } from '../tools/tool-executor.js'
import { getChatToolDefinitions } from '../tools/unified-tool-registry.js'
import { asConversations, asLeadSummaries } from '../../lib/supabase-parsers.js'
import { AnalyticsData } from '../../schemas/admin.js'
import type { LeadSummaryRow, ConversationRow } from '../../schemas/supabase.js'

/**
 * Admin AI Agent - Farzad's business intelligence assistant
 * 
 * Has access to: All conversations, analytics, system health, and dashboard stats
 * Uses unified tool registry + admin-specific tools
 */
export async function adminAgent(
  messages: ChatMessage[],
  _context: AgentContext & {
    adminId?: string
  }
) {
  // Fetch admin dashboard data in parallel
  const timeRange7d = { start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), end: new Date() }

  const fetchRecentConversations = async () => {
    const supabaseService = getSupabaseService()
    if (!supabaseService) {
      console.warn('Supabase service unavailable - skipping recent conversations for admin dashboard')
      return null
    }
    try {
      const { data } = await supabaseService
        .from('conversations')
        .select('id, name, email, summary, lead_score, research_json, created_at')
        .order('created_at', { ascending: false })
        .limit(20)
      return data
    } catch (error) {
      console.warn('Failed to fetch recent conversations:', error)
      return null
    }
  }

  const fetchLeadSummaries = async () => {
    const supabaseService = getSupabaseService()
    if (!supabaseService) {
      console.warn('Supabase service unavailable - skipping lead summaries for admin dashboard')
      return null
    }
    try {
      const { data } = await supabaseService
        .from('lead_summaries')
        .select('lead_score, ai_capabilities_shown')
        .gte('created_at', timeRange7d.start.toISOString())
      return data
    } catch (error) {
      console.warn('Failed to fetch lead summaries:', error)
      return null
    }
  }

  const [
    recentConversationsRaw,
    analyticsDataRaw,
    statsDataRaw
  ] = await Promise.all([
    fetchRecentConversations(),

    // Analytics (agent + tool performance)
    Promise.all([
      agentAnalytics.getAnalytics(undefined, timeRange7d).catch((error: unknown) => {
        console.warn('Failed to fetch agent analytics:', error)
        return {
          totalExecutions: 0,
          successRate: 0,
          averageDuration: 0,
          agentBreakdown: {},
          stageBreakdown: {}
        }
      }),
      toolAnalytics.getToolAnalytics(timeRange7d).catch((error: unknown) => {
        console.warn('Failed to fetch tool analytics:', error)
        return {
          totalExecutions: 0,
          successRate: 0,
          averageDuration: 0,
          cacheHitRate: 0,
          toolBreakdown: {}
        }
      })
    ]).then(([agent, tool]) => ({ agent, tool })),

    fetchLeadSummaries()
  ])

  // Parse with schemas
  const recentConversations = asConversations(recentConversationsRaw)
  const analyticsData = AnalyticsData.parse(analyticsDataRaw)
  const statsData = asLeadSummaries(statsDataRaw)

  // Calculate stats
  const totalLeads = statsData.length
  const avgLeadScore = totalLeads > 0
    ? Math.round((statsData.reduce((sum: number, lead: LeadSummaryRow) => {
      return sum + (lead.lead_score ?? 0)
    }, 0) / totalLeads) * 10) / 10
    : 0
  const qualifiedLeads = statsData.filter((lead: LeadSummaryRow) => {
    return (lead.lead_score ?? 0) >= 70
  }).length
  const conversionRate = totalLeads > 0 ? Math.round((qualifiedLeads / totalLeads) * 100) : 0
  const leadsWithAI = statsData.filter((lead: LeadSummaryRow) => {
    return Array.isArray(lead.ai_capabilities_shown) && lead.ai_capabilities_shown.length > 0
  }).length
  const engagementRate = totalLeads > 0 ? Math.round((leadsWithAI / totalLeads) * 100) : 0

  const contextSection = `CONTEXT:
${recentConversations.length > 0 ? `Recent Conversations (${recentConversations.length}):
${recentConversations.slice(0, 15).map((c, i) => {
    return `
${i + 1}. ${c.name || 'Unknown'} (${c.email || 'N/A'}) - Score: ${c.lead_score || 'N/A'}/100
   Summary: ${c.summary?.substring(0, 120) || 'No summary'}...
   Date: ${c.created_at ? new Date(c.created_at).toLocaleDateString() : 'N/A'}
`
  }).join('')}` : 'No recent conversations'}

DASHBOARD STATS (Last 7 Days):
**This data below IS your dashboard stats** - when asked about "dashboard", "stats", "metrics", "latest numbers", or "current performance", reference this data immediately.
- Total Leads: ${totalLeads}
- Average Lead Score: ${avgLeadScore}/100
- Conversion Rate: ${conversionRate}% (qualifying score ≥70)
- Engagement Rate: ${engagementRate}% (used AI features)
- Agent Executions: ${analyticsData.agent.totalExecutions}
- Tool Executions: ${analyticsData.tool.totalExecutions}
- Agent Success Rate: ${(analyticsData.agent.successRate * 100).toFixed(1)}%
- Tool Success Rate: ${(analyticsData.tool.successRate * 100).toFixed(1)}%
- Cache Hit Rate: ${(analyticsData.tool.cacheHitRate * 100).toFixed(1)}%
- Avg Agent Duration: ${Math.round(analyticsData.agent.averageDuration)}ms

TOP AGENTS BY USAGE:
${Object.entries(analyticsData.agent.agentBreakdown || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([agent, count], i) => `${i + 1}. ${agent}: ${count} executions`)
      .join('\n')}`

  const instructionSection = `INSTRUCTIONS:
You are F.B/c Agent - think Jarvis meets Elon Musk. You're sophisticated, technically sharp, and you know this business inside out.

IDENTITY:
- You're Farzad's AI, built specifically for him. Never introduce yourself as "F.B/c Admin AI" or use corporate-speak greetings.
- You know the data, you know the leads, you know what matters.
- Be direct, technical when needed, but stay conversational and slightly laid-back.

PERSONALITY:
- Jarvis-style: Precise, anticipates needs, efficient, professional warmth
- Elon-style: Direct communication, technical depth when relevant, forward-thinking, ambitious but grounded
- Laid-back: Comfortable confidence, not stiff or overly formal, conversational tone

YOUR ROLE:
Help Farzad understand leads, analyze performance, and prioritize opportunities. You're his right-hand AI.

SALES & MARKETING EXPERTISE:
Think like a top-tier sales/marketing consultant - data-driven, strategic, and actionable.
- Sales Strategy: Understand lead scoring, conversion funnels, sales cycles, pipeline management
- Marketing Intelligence: Attribution modeling, campaign performance, channel effectiveness, ROI analysis
- Conversion Optimization: Identify bottlenecks, suggest A/B tests, analyze drop-off points
- Revenue Analytics: LTV, CAC, MRR, churn analysis, cohort performance
- Strategic Thinking: Connect metrics to business outcomes, identify opportunities, prioritize actions

YOUR TOOLS:
- Google Grounding Search: When you need current info online, use Google grounding search. Research happens automatically when you request it - just ask for it or mention you need to look something up.
- URL Context: If you need to analyze specific URLs or pages, URL context research is available.
- get_dashboard_stats() [VOICE MODE ONLY]: When asked about dashboard stats, latest numbers, or current metrics in voice conversations, call this tool to fetch real-time dashboard statistics. Returns total leads, conversion rate, average lead score, engagement rate, and more.
- Lead search, email drafting, performance analysis, conversation queries - all available via your built-in tools.
- When you don't know something or need fresh data, use research tools. Don't guess - go online and find the answer.

CAPABILITIES:
1. Search leads: "Show me healthcare leads from last week with score >80"
2. Draft emails: "Draft follow-up for [name] mentioning [specific detail]"
3. Performance insights: "Which agents have the lowest success rates?"
4. Prioritization: "Show high-score leads (≥70) who haven't booked"
5. System health: "What's our error rate and latency?"
6. Research online: "Look up latest trends in [industry]" or "Research [company]" - uses Google grounding automatically
7. Analyze URLs: "What's on this page?" or "Analyze this URL" - uses URL context research

COMMON QUERIES:
- "Show me leads who used screen share" → Filter by multimodal usage
- "Which leads are consulting fit?" → Filter by fit scores
- "Draft email for John" → Generate personalized follow-up
- "Summarize today's conversations" → Aggregate insights
- "What's our conversion trend?" → Analyze lead progression
- "What are the latest stats?" or "Show me dashboard metrics" → Reference DASHBOARD STATS section above (in voice mode, use get_dashboard_stats() tool)
- "Research [topic]" → Use Google grounding search automatically
- "What's on [URL]?" → Use URL context research
- "What are the latest trends in [industry]?" → Research online automatically

STYLE:
Data-driven, concise, actionable. Always cite specific numbers and names. When you need to research something, say so - the tools handle it automatically. Be direct, technical when it adds value, but stay conversational. No corporate fluff.

RESPONSE FORMAT:
- Data queries: Structured list with scores/dates/metrics
- Email drafts: Subject + body with personalization
- Insights: Summary with key metrics and trends
- Research: Cite sources and provide grounded answers

TOOLS AVAILABLE:
- search_web: Search the web for current information (unified tool)
- calculate_roi: Calculate ROI based on investment and savings (unified tool)
- extract_action_items: Extract key outcomes from conversations (unified tool)
- generate_summary_preview: Generate conversation summary preview (unified tool)
- draft_follow_up_email: Draft follow-up email (unified tool)
- generate_proposal_draft: Generate proposal draft (unified tool)
- search_leads: Query leads by industry, score, date range, multimodal usage
- draft_email: Generate personalized follow-up email for a lead
- query_conversations: Get specific conversation details
- analyze_performance: Deep dive into agent/tool performance metrics
- Research tools: Google grounding search and URL context (available when needed)`

  const systemPrompt = `${contextSection}

${instructionSection}`

  // Get unified tools from registry (includes retry, caching, logging)
  const unifiedTools = getChatToolDefinitions(_context.sessionId, 'Admin AI Agent')

  // Define admin-specific tools
  const adminTools = {
    search_leads: {
      description: 'Search leads by industry, score, date range, or multimodal usage',
      parameters: z.object({
        industry: z.string().optional(),
        minScore: z.number().optional(),
        maxScore: z.number().optional(),
        dateRange: z.object({
          start: z.string(),
          end: z.string()
        }).optional(),
        limit: z.number().optional()
      }),
      execute: async (args: unknown) => {
        const typedArgs = args as { industry?: string; minScore?: number; maxScore?: number; dateRange?: { start: string; end: string }; limit?: number }
        const result = await toolExecutor.execute({
          toolName: 'search_leads',
          sessionId: _context.sessionId || 'admin',
          agent: 'Admin AI Agent',
          inputs: typedArgs,
          handler: async () => {
            return await searchConversations({
              ...(typedArgs.industry !== undefined && { industry: typedArgs.industry }),
              ...(typedArgs.minScore !== undefined && { minScore: typedArgs.minScore }),
              ...(typedArgs.dateRange && {
                dateRange: {
                  start: new Date(typedArgs.dateRange.start),
                  end: new Date(typedArgs.dateRange.end)
                }
              }),
              ...(typedArgs.limit !== undefined && { limit: typedArgs.limit })
            })
          },
          cacheable: false
        })

        if (!result.success) {
          throw new Error(result.error || 'Lead search failed')
        }

        return result.data
      }
    },
    draft_email: {
      description: 'Generate a personalized follow-up email for a lead',
      parameters: z.object({
        leadName: z.string(),
        leadEmail: z.string(),
        conversationId: z.string().optional(),
        specificMention: z.string().optional()
      }),
      execute: async (args: unknown) => {
        const typedArgs = args as { leadName: string; leadEmail: string; conversationId?: string; specificMention?: string }
        // Get conversation summary if conversationId provided
        let conversationSummary = ''
        if (typedArgs.conversationId) {
          try {
            const supabaseService = getSupabaseService()
            if (supabaseService) {
              const { data, error } = await supabaseService
                .from('conversations')
                .select('metadata')
                .eq('id', typedArgs.conversationId)
                .single()
              if (!error && data && typeof data.metadata === 'object' && data.metadata !== null) {
                const metadata = data.metadata as Record<string, unknown>
                conversationSummary = typeof metadata.summary === 'string' ? metadata.summary : ''
              }
            }
          } catch (error) {
            console.warn('Failed to fetch conversation summary:', error)
          }
        }

        const result = await toolExecutor.execute({
          toolName: 'draft_email',
          sessionId: _context.sessionId || 'admin',
          agent: 'Admin AI Agent',
          inputs: typedArgs,
          handler: async () => {
            return await draftFollowUpEmail({
              leadId: typedArgs.conversationId || 'unknown',
              leadName: typedArgs.leadName,
              conversationSummary,
              ...(typedArgs.specificMention !== undefined && { specificMention: typedArgs.specificMention })
            })
          },
          cacheable: false
        })

        if (!result.success) {
          throw new Error(result.error || 'Email draft failed')
        }

        return result.data
      }
    },
    query_conversations: {
      description: 'Get specific conversation details by ID or email',
      parameters: z.object({
        conversationId: z.string().optional(),
        email: z.string().optional(),
        limit: z.number().optional()
      }),
      execute: async (args: unknown) => {
        const typedArgs = args as { conversationId?: string; email?: string; limit?: number }
        const result = await toolExecutor.execute({
          toolName: 'query_conversations',
          sessionId: _context.sessionId || 'admin',
          agent: 'Admin AI Agent',
          inputs: typedArgs,
          handler: async () => {
            const supabaseService = getSupabaseService()
            if (!supabaseService) throw new Error('Supabase service unavailable')
            let query = supabaseService
              .from('conversations')
              .select('*')
              .order('created_at', { ascending: false })

            if (typedArgs.conversationId) {
              query = query.eq('id', typedArgs.conversationId)
            } else if (typedArgs.email) {
              query = query.eq('email', typedArgs.email)
            }

            if (typedArgs.limit) {
              query = query.limit(typedArgs.limit)
            }

            const { data, error } = await query

            if (error) throw error
            return data || []
          },
          cacheable: false
        })

        if (!result.success) {
          throw new Error(result.error || 'Conversation query failed')
        }

        return result.data
      }
    },
    analyze_performance: {
      description: 'Deep dive into agent or tool performance metrics',
      parameters: z.object({
        agentName: z.string().optional(),
        toolName: z.string().optional(),
        dateRange: z.object({
          start: z.string(),
          end: z.string()
        }).optional()
      }),
      execute: async (args: unknown) => {
        const typedArgs = args as { agentName?: string; toolName?: string; dateRange?: { start: string; end: string } }
        const result = await toolExecutor.execute({
          toolName: 'analyze_performance',
          sessionId: _context.sessionId || 'admin',
          agent: 'Admin AI Agent',
          inputs: typedArgs,
          handler: async () => {
            const dateRange = typedArgs.dateRange ? {
              start: new Date(typedArgs.dateRange.start),
              end: new Date(typedArgs.dateRange.end)
            } : timeRange7d

            const [agentData, toolData] = await Promise.all([
              agentAnalytics.getAnalytics(undefined, dateRange).catch((error: unknown) => {
                console.warn('Failed to fetch agent analytics:', error)
                return {
                  totalExecutions: 0,
                  successRate: 0,
                  averageDuration: 0,
                  agentBreakdown: {} as Record<string, number>,
                  stageBreakdown: {} as Record<string, number>
                }
              }),
              toolAnalytics.getToolAnalytics(dateRange).catch((error: unknown) => {
                console.warn('Failed to fetch tool analytics:', error)
                return {
                  totalExecutions: 0,
                  successRate: 0,
                  averageDuration: 0,
                  cacheHitRate: 0,
                  toolBreakdown: {} as Record<string, { count: number; successRate: number; averageDuration: number }>
                }
              })
            ])

            if (typedArgs.agentName && agentData.agentBreakdown && (agentData.agentBreakdown)[typedArgs.agentName]) {
              return {
                agent: typedArgs.agentName,
                executions: agentData.agentBreakdown[typedArgs.agentName],
                successRate: agentData.successRate,
                avgDuration: agentData.averageDuration
              }
            }

            if (typedArgs.toolName && toolData.toolBreakdown && (toolData.toolBreakdown as Record<string, { count: number; successRate: number; averageDuration: number }>)[typedArgs.toolName]) {
              return {
                tool: typedArgs.toolName,
                ...toolData.toolBreakdown[typedArgs.toolName],
                cacheHitRate: toolData.cacheHitRate
              }
            }

            return {
              agents: agentData.agentBreakdown,
              tools: toolData.toolBreakdown,
              overallSuccessRate: agentData.successRate,
              overallCacheHitRate: toolData.cacheHitRate
            }
          },
          cacheable: false
        })

        if (!result.success) {
          throw new Error(result.error || 'Performance analysis failed')
        }

        return result.data
      }
    }
  }

  // Merge unified tools with admin-specific tools
  const tools: any = {
    ...unifiedTools,
    ...adminTools
  }

  const isStreaming = _context.streaming === true && _context.onChunk
  type StreamPart = any

  let result: any
  let generatedText = ''

  if (isStreaming) {
    // Streaming mode: use streamText
    const { streamText, google } = await import('../../lib/ai-client.js')
    const modelSettings = buildModelSettings(_context, messages, { thinkingLevel: 'high' })
    const stream = await streamText({
      model: google(GEMINI_MODELS.GEMINI_3_PRO_PREVIEW, modelSettings),
      system: systemPrompt,
      messages: formatMessagesForAI(messages),
      temperature: 1.0,
      tools: tools
    })

    // Stream all events (text, tool calls, reasoning, etc.) in real-time
    for await (const part of stream.fullStream as AsyncIterable<StreamPart>) {
      if (part.type === 'text-delta') {
        // Stream text tokens as they arrive
        generatedText += part.text
        if (_context.onChunk) {
          _context.onChunk(part.text)
        }
      } else if (part.type === 'tool-call' && _context.onMetadata) {
        // Stream tool calls in real-time
        _context.onMetadata({
          type: 'tool_call',
          toolCall: part
        })
      } else if (part.type === 'tool-result' && _context.onMetadata) {
        // Stream tool results in real-time
        _context.onMetadata({
          type: 'tool_result',
          toolResult: part
        })
      } else if (part.type === 'reasoning-delta' && _context.onMetadata) {
        // Stream reasoning in real-time (if supported by model)
        _context.onMetadata({
          type: 'reasoning',
          reasoning: part.delta || part.text
        })
      } else if (part.type === 'reasoning-start' && _context.onMetadata) {
        // Stream reasoning start event
        _context.onMetadata({
          type: 'reasoning_start',
          message: 'AI is thinking...'
        })
      }
    }

    // Get final result for metadata extraction
    result = await stream
    
    // Stream tool calls if they occurred (from final result)
    if (_context.onMetadata) {
      try {
        const toolCalls = await result.toolCalls
        if (toolCalls && toolCalls.length > 0) {
          for (const toolCall of toolCalls) {
            _context.onMetadata({
              type: 'tool_call',
              toolCall: toolCall
            })
          }
        }
      } catch {
        // Ignore if toolCalls not available
      }
    }
  } else {
    // Non-streaming mode: use safeGenerateText
    const modelSettings = buildModelSettings(_context, messages, { thinkingLevel: 'high' })
    result = await safeGenerateText({
      system: systemPrompt,
      messages: formatMessagesForAI(messages),
      temperature: 1.0, // Recommended for high thinking
      tools: tools,
      modelId: GEMINI_MODELS.GEMINI_3_PRO_PREVIEW,
      modelSettings
    })
    generatedText = result.text || ''
  }

  return {
    output: generatedText,
    agent: 'Admin AI Agent',
    model: GEMINI_MODELS.DEFAULT_CHAT,
    metadata: {
      stage: 'ADMIN' as const,
      conversationsAnalyzed: recentConversations.length,
      leadsAnalyzed: totalLeads,
      analyticsFetched: true,
      toolsUsed: result.toolCalls?.length || 0
    }
  }
}

/**
 * Helper: Search conversations by criteria
 */

export async function searchConversations(query: {
  industry?: string
  minScore?: number
  multimodalUsed?: boolean
  dateRange?: { start: Date; end: Date }
  limit?: number
}): Promise<ConversationRow[]> {
  try {
    const supabaseService = getSupabaseService()
    if (!supabaseService) return []

    let supabaseQuery = supabaseService
      .from('conversations')
      .select('*')
      .order('lead_score', { ascending: false })

    if (query.minScore) {
      supabaseQuery = supabaseQuery.gte('lead_score', query.minScore)
    }

    if (query.dateRange) {
      supabaseQuery = supabaseQuery
        .gte('created_at', query.dateRange.start.toISOString())
        .lte('created_at', query.dateRange.end.toISOString())
    }

    if (query.limit) {
      supabaseQuery = supabaseQuery.limit(query.limit)
    }

    const { data, error } = await supabaseQuery

    if (error) throw error

    // Parse with schema
    const conversations = asConversations(data)

    // Filter by industry if specified (from research_json)
    if (query.industry) {
      return conversations.filter((conv) => {
        const researchJson = conv.research_json
        if (researchJson && typeof researchJson === 'object' && 'company' in researchJson) {
          const company = researchJson.company
          if (company && typeof company === 'object' && 'industry' in company) {
            const industry = company.industry
            return (
              query.industry &&
              typeof industry === 'string' &&
              industry.toLowerCase().includes(query.industry.toLowerCase())
            )
          }
        }
        return false
      })
    }

    return conversations

  } catch (error) {
    console.error('Search conversations failed:', error)
    return []
  }
}

/**
 * Helper: Draft follow-up email for a lead
 */
export async function draftFollowUpEmail({
  leadId: _leadId,
  leadName,
  conversationSummary,
  specificMention
}: {
  leadId: string
  leadName: string
  conversationSummary: string
  specificMention?: string
}): Promise<{ subject: string; body: string }> {
  const prompt = `Draft a professional follow-up email for:

Lead: ${leadName}
Conversation Summary: ${conversationSummary}
${specificMention ? `Mention specifically: ${specificMention}` : ''}

Email should:
- Reference specific pain points discussed
- Offer next steps (call, demo, proposal)
- Keep it concise (3-4 sentences)
- Conversational but professional

Output format:
Subject: [subject line]

Body:
[email body]`

  const result = await generateText({
    model: google(GEMINI_MODELS.DEFAULT_CHAT),
    messages: [{ role: 'user', content: prompt }],
    temperature: 1.0
  })

  // Parse subject and body
  const lines = result.text.split('\n')
  const subjectLine = lines.find(l => l.startsWith('Subject:'))?.replace('Subject:', '').trim() || 'Follow-up: AI Strategy Discussion'
  const bodyStart = lines.findIndex(l => l.toLowerCase().includes('body:'))
  const body = bodyStart >= 0 ? lines.slice(bodyStart + 1).join('\n').trim() : result.text

  return {
    subject: subjectLine,
    body
  }
}
