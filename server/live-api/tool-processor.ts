import { WebSocket } from 'ws'
import { serverLogger } from '../utils/env-setup'
import {
  executeSearchWeb,
  executeExtractActionItems,
  executeCalculateROI,
  executeGenerateSummaryPreview,
  executeDraftFollowUpEmail,
  executeGenerateProposalDraft,
  executeCaptureScreenSnapshot,
  executeCaptureWebcamSnapshot,
  executeGetDashboardStats
} from '../utils/tool-implementations.js'
import { recordCapabilityUsed } from 'src/core/context/capabilities'

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
          result = await executeSearchWeb(call.args as { query: string; urls?: string[] })
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
          result = await executeGetDashboardStats(call.args, client.sessionId || 'anonymous')
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

      // Record capability usage if tool executed successfully
      if (result.success && client.sessionId && client.sessionId !== 'anonymous') {
        try {
          // Map tool names to capability names
          const capabilityMap: Record<string, string> = {
            'search_web': 'search',
            'calculate_roi': 'roi',
            'extract_action_items': 'doc',
            'generate_summary_preview': 'exportPdf',
            'draft_follow_up_email': 'doc',
            'generate_proposal_draft': 'exportPdf',
            'capture_screen_snapshot': 'screenShare',
            'capture_webcam_snapshot': 'webcam',
            'get_dashboard_stats': 'doc' // Admin tool
          }
          
          const capabilityName = capabilityMap[call.name]
          if (capabilityName) {
            await recordCapabilityUsed(client.sessionId, capabilityName, { tool: call.name, args: call.args })
          }
        } catch (capError) {
          serverLogger.warn(`Failed to record capability usage for ${call.name}`, { 
            connectionId, 
            error: capError instanceof Error ? capError.message : String(capError) 
          })
        }
      }

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

