import { WebSocket } from 'ws'
import { serverLogger } from '../utils/env-setup'
import { safeSend } from '../utils/websocket-helpers'
import { MESSAGE_TYPES } from '../message-types'

interface OrchestratorSyncClient {
  ws: WebSocket
  userTurnCount?: number
}

interface AgentStageResponse {
  success: boolean
  stage: string
  agent: string
  conversationFlow?: Record<string, unknown>
  recommendedNext?: string | null
  metadata?: {
    leadScore?: number
    fitScore?: { workshop: number; consulting: number }
    categoriesCovered?: number
    multimodalUsed?: boolean
    triggerBooking?: boolean
    processingTime?: number
  }
  error?: string
}

/**
 * Helper function to sync voice conversation to orchestrator
 */
export async function syncVoiceToOrchestrator(
  sessionId: string,
  connectionId: string,
  _client: OrchestratorSyncClient
): Promise<void> {
  if (!sessionId || sessionId === 'anonymous') return

  try {
    // Load conversation history from multimodalContext
    const { multimodalContextManager } = await import('src/core/context/multimodal-context')

    // Get conversation history (last 20 messages)
    // Admin: can access analytics, transcripts, lead summaries across sessions
    // Client: only own conversation history
    const conversationHistory = await multimodalContextManager.getConversationHistory(sessionId, 20)

    // For non-admin sessions, ensure we only process their own data
    // (The API should already filter, but this is explicit separation)

    // Build chat messages array from conversation history
    const messages = conversationHistory
      .filter((entry: any) => {
        const speaker = entry.metadata?.speaker || (entry.modality === 'text' ? 'user' : 'assistant')
        return speaker === 'user' || speaker === 'assistant' || speaker === 'model'
      })
      .map((entry: any) => {
        const speaker = entry.metadata?.speaker || (entry.modality === 'text' ? 'user' : 'assistant')
        const role: 'user' | 'assistant' = speaker === 'user' ? 'user' : 'assistant'
        return {
          role,
          content: entry.content || ''
        }
      })

    if (messages.length === 0) return

    // Get database context for email, flow, and intelligence
    const { ContextStorage } = await import('../../src/core/context/context-storage.js')
    const storage = new ContextStorage()
    const dbContext = await storage.get(sessionId)

    // CRITICAL FIX: Load conversationFlow from database for stage determination
    const persistedFlow = dbContext?.conversation_flow || undefined

    // Build agent context
    // Agent context building removed - not used in current implementation
    // const _agentContext = {
    //   sessionId,
    //   conversationFlow: persistedFlow,
    //   intelligenceContext: dbContext?.intelligence_context || undefined,
    //   voiceActive: true
    // } as any

    serverLogger.debug('Voice sync - Loaded conversationFlow', {
      connectionId,
      hasPersistedFlow: !!persistedFlow,
      coveredCount: persistedFlow && typeof persistedFlow === 'object' && 'covered' in persistedFlow && persistedFlow.covered ? Object.values(persistedFlow.covered).filter(Boolean).length : 0,
      recommendedNext: persistedFlow && typeof persistedFlow === 'object' && 'recommendedNext' in persistedFlow ? persistedFlow.recommendedNext : undefined
    })

    // Route through orchestrator via HTTP call to Vercel API
    // This ensures consistent routing logic between voice and text
    const apiUrl = process.env.VERCEL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

    // Convert messages to proper Message[] format with id and timestamp
    const formattedMessages = messages.map((msg) => ({
      id: crypto.randomUUID(),
      timestamp: new Date(),
      role: msg.role,
      content: msg.content
    }))

    // Use metadata-only endpoint to sync with orchestrator (no duplicate responses)
    serverLogger.info('Voice sync calling agent-stage API', {
      url: `${apiUrl}/api/agent-stage`,
      messageCount: formattedMessages.length
    });

    try {
      const response = await fetch(`${apiUrl}/api/agent-stage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: formattedMessages,
          sessionId: sessionId,
          conversationFlow: persistedFlow,
          intelligenceContext: dbContext?.intelligence_context,
          trigger: 'voice'
        }),
        // Timeout after 5s - metadata endpoint should be fast
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        throw new Error(`Agent stage API call failed: ${response.status} ${response.statusText}`);
      }

      const stageResult = await response.json() as AgentStageResponse;

      if (!stageResult.success) {
        throw new Error(stageResult.error || 'Agent stage API returned failure');
      }

      // Send stage update to client via WebSocket
      safeSend(_client.ws, JSON.stringify({
        type: MESSAGE_TYPES.STAGE_UPDATE,
        payload: {
          stage: stageResult.stage,
          agent: stageResult.agent,
          flow: stageResult.conversationFlow,
          recommendedNext: stageResult.recommendedNext,
          metadata: stageResult.metadata
        }
      }))

      serverLogger.info('Voice synced to orchestrator (metadata only)', {
        connectionId,
        agent: stageResult.agent,
        stage: stageResult.stage,
        processingTime: stageResult.metadata?.processingTime
      })

    } catch (apiError) {
      serverLogger.warn('Voice orchestrator sync failed (non-fatal)', { 
        connectionId, 
        error: apiError instanceof Error ? apiError.message : String(apiError) 
      });
      // Non-fatal - voice session continues even if sync fails
    }
  } catch (error) {
    serverLogger.error('Voice orchestrator sync failed', error instanceof Error ? error : undefined, { connectionId })
    // Non-fatal - don't interrupt voice session
  }
}

