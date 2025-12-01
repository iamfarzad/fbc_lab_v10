import { WebSocket } from 'ws'
import { serverLogger } from '../utils/env-setup'

interface OrchestratorSyncClient {
  ws: WebSocket
  userTurnCount?: number
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
        return {
          role: (speaker === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
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

    serverLogger.info('Voice sync calling orchestrator API', {
      url: `${apiUrl}/api/chat`,
      messageCount: formattedMessages.length
    });

    // CRITICAL FIX: Temporarily disabled to prevent "two voices" issue
    // The /api/chat call generates a text response while Gemini Live API generates audio
    // This causes users to hear duplicate responses
    // TODO: Create a separate /api/agent-stage endpoint for metadata-only updates
    /*
    try {
      const response = await fetch(`${apiUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add auth header if needed in future
          // 'Authorization': `Bearer ${process.env.API_AUTH_TOKEN}` 
        },
        body: JSON.stringify({
          messages: formattedMessages,
          sessionId: sessionId,
          conversationFlow: persistedFlow,
          intelligenceContext: dbContext?.intelligence_context,
          trigger: 'voice'
        }),
        // Timeout after 10s to avoid blocking voice loop too long
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        throw new Error(`Orchestrator API call failed: ${response.status} ${response.statusText}`);
      }

      const agentResult = await response.json();

      // Send stage update to client (non-blocking)
      if (agentResult.metadata?.stage) {
        safeSend(client.ws, JSON.stringify({
          type: MESSAGE_TYPES.STAGE_UPDATE,
          payload: {
            stage: agentResult.metadata.stage,
            agent: agentResult.agent,
            flow: agentResult.metadata.enhancedConversationFlow
          }
        }))
      }

      serverLogger.info('Voice synced to orchestrator', {
        connectionId,
        agent: agentResult.agent,
        stage: agentResult.metadata?.stage
      })

    } catch (apiError) {
      serverLogger.error('Voice orchestrator API call failed', apiError instanceof Error ? apiError : undefined, { connectionId });
      // Non-fatal - voice session continues even if sync fails
    }
    */

    serverLogger.info('Voice orchestrator sync disabled (preventing duplicate responses)', { connectionId })
  } catch (error) {
    serverLogger.error('Voice orchestrator sync failed', error instanceof Error ? error : undefined, { connectionId })
    // Non-fatal - don't interrupt voice session
  }
}

