import { WebSocket } from 'ws'
import { serverLogger } from '../utils/env-setup'
import { isAdmin } from '../rate-limiting/websocket-rate-limiter'
import {
  executeSearchWeb,
  executeExtractActionItems,
  executeCalculateROI,
  executeGenerateSummaryPreview,
  executeDraftFollowUpEmail,
  executeGenerateProposalDraft,
  executeCaptureScreenSnapshot,
  executeCaptureWebcamSnapshot
} from '../utils/tool-implementations.js'

export interface ToolProcessorClient {
  sessionId?: string
  session: {
    sendToolResponse: (response: { functionResponses: any[] }) => Promise<void>
  }
  logger?: {
    log: (event: string, data?: any) => void
  }
}

export interface ActiveSessionsMap {
  get: (id: string) => ToolProcessorClient | undefined
}

/**
 * Process tool calls from Live API - ALL tools executed server-side
 */
export async function processToolCall(
  connectionId: string,
  _ws: WebSocket,
  toolCall: any,
  activeSessions: ActiveSessionsMap
): Promise<boolean> {
  const functionCalls = toolCall?.functionCalls || []
  const client = activeSessions.get(connectionId)

  serverLogger.info('Processing tool call', {
    connectionId,
    toolCallId: toolCall?.functionCalls?.[0]?.id,
    tools: functionCalls.map((fc: any) => fc.name)
  })

  if (!client?.session) {
    serverLogger.error('Client or session is undefined', undefined, { connectionId })
    return false
  }

  // Execute ALL tools server-side
  const functionResponses = []

  for (const call of functionCalls) {
    let result

    try {
      serverLogger.info(`Executing tool: ${call.name}`, { connectionId, args: call.args })

      switch (call.name) {
        case 'search_web':
          result = await executeSearchWeb(call.args)
          break

        case 'extract_action_items':
          result = await executeExtractActionItems(call.args, client.sessionId)
          break

        case 'calculate_roi':
          result = await executeCalculateROI(call.args)
          break

        case 'generate_summary_preview':
          result = await executeGenerateSummaryPreview(call.args, client.sessionId)
          break

        case 'draft_follow_up_email':
          result = await executeDraftFollowUpEmail(call.args, client.sessionId)
          break

        case 'generate_proposal_draft':
          result = await executeGenerateProposalDraft(call.args, client.sessionId)
          break

        case 'capture_screen_snapshot':
          result = await executeCaptureScreenSnapshot(call.args, connectionId, activeSessions)
          break

        case 'capture_webcam_snapshot':
          result = await executeCaptureWebcamSnapshot(call.args, connectionId, activeSessions)
          break

        case 'get_dashboard_stats':
          // Admin-only tool - keep existing implementation
          if (!isAdmin(client.sessionId)) {
            result = {
              success: false,
              error: 'Dashboard stats are admin-only'
            }
            break
          }

          const period = call.args?.period || '7d'
          try {
            const { supabaseService } = await import('../../src/core/supabase/client.js')
            const now = new Date()
            const daysBack = period === '1d' ? 1 : period === '30d' ? 30 : period === '90d' ? 90 : 7
            const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000)

            const { data, error } = await (supabaseService as any)
              .from('lead_summaries')
              .select('lead_score, ai_capabilities_shown')
              .gte('created_at', startDate.toISOString())

            if (error) {
              result = { success: false, error: 'Failed to retrieve statistics' }
            } else {
              const leadRows = (data ?? []) as Array<{ lead_score: number | null; ai_capabilities_shown: string[] | null }>
              const totalLeads = leadRows.length
              const qualifiedLeads = leadRows.filter((lead) => (lead.lead_score ?? 0) >= 70).length
              const conversionRate = totalLeads > 0 ? Math.round((qualifiedLeads / totalLeads) * 100) : 0
              const leadsWithAI = leadRows.filter(
                (lead) => Array.isArray(lead.ai_capabilities_shown) && lead.ai_capabilities_shown.length > 0
              ).length
              const engagementRate = totalLeads > 0 ? Math.round((leadsWithAI / totalLeads) * 100) : 0
              const avgLeadScore = totalLeads > 0
                ? Math.round((leadRows.reduce((sum, lead) => sum + (lead.lead_score ?? 0), 0) / totalLeads) * 10) / 10
                : 0

              const capabilityCounts = new Map<string, number>()
              leadRows.forEach((lead) => {
                lead.ai_capabilities_shown?.forEach((capability) => {
                  capabilityCounts.set(capability, (capabilityCounts.get(capability) || 0) + 1)
                })
              })
              const topAICapabilities = Array.from(capabilityCounts.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([capability]) => capability)

              result = {
                success: true,
                period,
                totalLeads,
                conversionRate,
                avgLeadScore,
                engagementRate,
                topAICapabilities,
                scheduledMeetings: 0,
                summary: `Dashboard stats for ${period}: ${totalLeads} total leads, ${conversionRate}% conversion rate, ${avgLeadScore}/100 average lead score, ${engagementRate}% engagement rate.`
              }
            }
          } catch (err) {
            serverLogger.error('Failed to calculate dashboard stats', err instanceof Error ? err : undefined, { connectionId })
            result = { success: false, error: 'Failed to calculate dashboard stats' }
          }
          break

        default:
          serverLogger.warn(`Unknown tool: ${call.name}`, { connectionId })
          result = {
            success: false,
            error: `Unknown tool: ${call.name}`
          }
      }

      serverLogger.info(`Tool executed: ${call.name}`, {
        connectionId,
        success: result.success,
        hasData: !!result.data
      })

    } catch (error) {
      serverLogger.error(`Tool execution failed: ${call.name}`, error instanceof Error ? error : undefined, { connectionId })
      result = {
        success: false,
        error: error instanceof Error ? error.message : 'Tool execution failed'
      }
    }

    functionResponses.push({
      name: call.name,
      response: result
    })
  }

  // Send results back to Gemini Live API
  try {
    await client.session.sendToolResponse({ functionResponses })

    serverLogger.info('Tool results sent to Gemini', {
      connectionId,
      tools: functionResponses.map(r => `${r.name}:${r.response.success ? 'ok' : 'fail'}`).join(', ')
    })

    client.logger?.log('tool_results_sent', {
      tools: functionResponses.map(r => r.name),
      successCount: functionResponses.filter(r => r.response.success).length
    })
  } catch (err) {
    serverLogger.error('Failed to send tool results', err instanceof Error ? err : undefined, { connectionId })
    return false
  }

  // Track tool calls for export
  if (client.sessionId) {
    try {
      const { multimodalContextManager } = await import('src/core/context/multimodal-context')
      for (const call of functionCalls) {
        await multimodalContextManager.addToolCallToLastTurn(client.sessionId, {
          name: call.name,
          args: call.args || {},
          id: call.id
        })
      }
    } catch (err) {
      serverLogger.warn('Failed to track tool calls', { connectionId, error: err instanceof Error ? { name: err.name, message: err.message, stack: err.stack } : String(err) })
    }
  }

  return true // All tools handled server-side
}

