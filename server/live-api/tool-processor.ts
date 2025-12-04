/**
 * Tool Processor - Process tool calls from Gemini Live API
 * 
 * Uses unified tool registry with:
 * - Schema validation (from v5/v7)
 * - Retry logic (2 attempts for voice - real-time constraint)
 * - Timeout handling (25s - stays under limits)
 * - Server-side execution (from v10 - security)
 * 
 * Preserves:
 * - Capability tracking (only on final success after retries)
 * - Context tracking (all calls)
 * - Response format (Gemini Live API requirement)
 */

import { WebSocket } from 'ws'
import { serverLogger } from '../utils/env-setup'
import { recordCapabilityUsed } from 'src/core/context/capabilities'
import { retry, withTimeout } from 'src/lib/code-quality'
import {
  validateToolArgs,
  executeUnifiedTool,
  isTransientError,
  type ToolResult
} from 'src/core/tools/unified-tool-registry'

export interface ToolProcessorClient {
  sessionId?: string
  session: {
    sendToolResponse: (response: { functionResponses: any[] }) => Promise<void>
  }
  logger?: {
    log: (event: string, data?: any) => void
  }
  latestContext?: {
    screen?: unknown
    webcam?: unknown
  }
}

export interface ActiveSessionsMap {
  get: (id: string) => ToolProcessorClient | undefined
}

// Capability mapping - maps tool names to capability names for tracking
const CAPABILITY_MAP: Record<string, string> = {
  'search_web': 'search',
  'get_weather': 'search', // Weather uses search internally
  'calculate_roi': 'roi',
  'extract_action_items': 'doc',
  'generate_summary_preview': 'exportPdf',
  'draft_follow_up_email': 'doc',
  'generate_proposal_draft': 'exportPdf',
  'capture_screen_snapshot': 'screenShare',
  'capture_webcam_snapshot': 'webcam',
  'get_dashboard_stats': 'doc' // Admin tool
}

// Voice-specific configuration
const VOICE_RETRY_ATTEMPTS = 2 // Fewer than chat since voice is real-time
const VOICE_TIMEOUT_MS = 25000 // 25 seconds - stays under limits

/**
 * Process tool calls from Live API - ALL tools executed server-side
 * Uses unified registry with retry + timeout + validation
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
  const functionResponses: Array<{ name: string; response: ToolResult }> = []

  for (const call of functionCalls) {
    // Extract call properties with type safety
    const toolName = String(call.name || '')
    const toolArgs = call.args as Record<string, unknown> | undefined
    
    let result: ToolResult

    try {
      serverLogger.info(`Executing tool: ${toolName}`, { connectionId, args: toolArgs })

      // Step 1: Validate args first (restore v5/v7's validation pattern)
      const validation = validateToolArgs(toolName, toolArgs)
      if (!validation.valid) {
        serverLogger.warn(`Tool validation failed: ${toolName}`, { connectionId, error: validation.error })
        result = {
          success: false,
          error: validation.error || 'Invalid tool arguments'
        }
      } else {
        // Step 2: Execute with retry + timeout wrapper
        result = await withTimeout(
          retry(
            () => executeUnifiedTool(toolName, toolArgs, {
              sessionId: client.sessionId || 'anonymous',
              connectionId,
              activeSessions
            }),
            VOICE_RETRY_ATTEMPTS,
            1000, // Initial delay: 1s
            2, // Backoff multiplier
            (error) => isTransientError(error)
          ),
          VOICE_TIMEOUT_MS,
          `Tool ${toolName} timed out after ${VOICE_TIMEOUT_MS}ms`
        )
      }

      serverLogger.info(`Tool executed: ${toolName}`, {
        connectionId,
        success: result.success,
        hasData: !!result.data
      })

      // Record capability usage ONLY on final success (after all retries)
      if (result.success && client.sessionId && client.sessionId !== 'anonymous') {
        try {
          const capabilityName = CAPABILITY_MAP[toolName]
          if (capabilityName) {
            await recordCapabilityUsed(client.sessionId, capabilityName, { tool: toolName, args: toolArgs })
          }
        } catch (capError) {
          serverLogger.warn(`Failed to record capability usage for ${toolName}`, { 
            connectionId, 
            error: capError instanceof Error ? capError.message : String(capError) 
          })
        }
      }

    } catch (error) {
      serverLogger.error(`Tool execution failed: ${toolName}`, error instanceof Error ? error : undefined, { connectionId })
      result = {
        success: false,
        error: error instanceof Error ? error.message : 'Tool execution failed'
      }
    }

    // Step 3: Validate response format before adding (safety check)
    if (!result || typeof result !== 'object') {
      result = {
        success: false,
        error: 'Invalid tool response format'
      }
    }

    if (!result.success && !result.error) {
      result.error = 'Tool execution failed without error message'
    }

    functionResponses.push({
      name: toolName,
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

  // Track tool calls for export (all calls, regardless of success/failure)
  if (client.sessionId) {
    try {
      const { multimodalContextManager } = await import('src/core/context/multimodal-context')
      for (const fc of functionCalls) {
        const fcName = String(fc.name || '')
        const fcArgs = (fc.args || {}) as Record<string, unknown>
        const fcId = fc.id as string | undefined
        // Build tool call object, only including id if it's defined (exactOptionalPropertyTypes)
        const toolCallData: { name: string; args: Record<string, unknown>; id?: string } = {
          name: fcName,
          args: fcArgs
        }
        if (fcId !== undefined) {
          toolCallData.id = fcId
        }
        await multimodalContextManager.addToolCallToLastTurn(client.sessionId, toolCallData)
      }
    } catch (err) {
      serverLogger.warn('Failed to track tool calls', { connectionId, error: err instanceof Error ? { name: err.name, message: err.message, stack: err.stack } : String(err) })
    }
  }

  return true // All tools handled server-side
}
