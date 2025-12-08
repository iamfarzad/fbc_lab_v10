import type { ChatMessage } from 'src/core/agents/types'
import { adminAgent } from 'src/core/agents/admin-agent'
import { adminChatService } from 'src/core/admin/admin-chat-service'
import { logger } from 'src/lib/logger'

/**
 * Unified Chat Endpoint - Handles both admin and regular chat
 * 
 * Admin queries are detected via `x-admin-query: 'true'` header
 * Supports SSE streaming for real-time responses
 */
export async function POST(request: Request) {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-admin-query, x-session-id'
      }
    })
  }

  try {
    // Check if this is an admin query
    const isAdminQuery = request.headers.get('x-admin-query') === 'true'
    
    if (!isAdminQuery) {
      // Future: Route to regular chat endpoint
      return new Response(
        JSON.stringify({ error: 'Non-admin queries not yet supported. Use /api/chat for regular chat.' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Extract sessionId from header or body
    const sessionId = request.headers.get('x-session-id') || `admin-${Date.now()}`
    
    // Parse request body
    const body = await request.json()
    const { messages, stream } = body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate messages structure
    const validMessages = messages.filter((m: any) => {
      if (!m || typeof m !== 'object') return false
      if (!m.role || typeof m.role !== 'string') return false
      return m.content && typeof m.content === 'string'
    }) as ChatMessage[]

    if (validMessages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No valid messages found' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Extract current message (last user message)
    const lastUserMessage = [...validMessages].reverse().find((m) => m.role === 'user')
    const currentMessage = lastUserMessage?.content || ''

    // Extract conversationIds from previous messages' contextLeads
    const conversationIds: string[] = []
    for (const msg of validMessages) {
      if (msg.metadata && typeof msg.metadata === 'object' && 'contextLeads' in msg.metadata) {
        const leads = msg.metadata.contextLeads
        if (Array.isArray(leads)) {
          conversationIds.push(...leads.filter((id): id is string => typeof id === 'string'))
        }
      }
    }
    // Remove duplicates
    const uniqueConversationIds = [...new Set(conversationIds)]

    logger.debug('[API /chat/unified] Admin query received', {
      sessionId,
      messageCount: validMessages.length,
      hasConversationIds: uniqueConversationIds.length > 0,
      currentMessage: currentMessage.substring(0, 100)
    })

    // Context Enrichment: Build AI context with semantic search and lead context
    let enrichedContext = ''
    try {
      enrichedContext = await adminChatService.buildAIContext(
        sessionId,
        currentMessage,
        uniqueConversationIds.length > 0 ? uniqueConversationIds : undefined
      )
      logger.debug('[API /chat/unified] Context enriched', {
        contextLength: enrichedContext.length,
        conversationIdsCount: uniqueConversationIds.length
      })
    } catch (error) {
      logger.warn('[API /chat/unified] Context enrichment failed (non-fatal)', {
        error: error instanceof Error ? error.message : String(error)
      })
      // Continue without enriched context - adminAgent will still work
    }

    // Call admin agent
    let agentResult
    try {
      agentResult = await adminAgent(validMessages, {
        sessionId,
        adminId: 'admin' // Default admin ID
      })
    } catch (error) {
      logger.error('[API /chat/unified] Admin agent failed', error instanceof Error ? error : undefined)
      
      // Return error via SSE if streaming requested
      if (stream) {
        const encoder = new TextEncoder()
        const errorStream = new ReadableStream({
          start(controller) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: 'error',
                  error: error instanceof Error ? error.message : 'Admin agent failed'
                })}\n\n`
              )
            )
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
          }
        })

        return new Response(errorStream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
          }
        })
      }

      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : 'Admin agent failed'
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // If streaming requested, return SSE stream
    if (stream) {
      const encoder = new TextEncoder()
      const responseStream = new ReadableStream({
        async start(controller) {
          // Stream response in chunks for better UX
          const responseText = agentResult.output || ''
          const chunkSize = 20 // Characters per chunk
          
          // Send response in chunks
          for (let index = 0; index < responseText.length; index += chunkSize) {
            const accumulated = responseText.slice(0, index + chunkSize)
            
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: 'content',
                  content: accumulated
                })}\n\n`
              )
            )
            
            // Small delay between chunks for better UX
            // Note: In Edge Runtime, we use a simple delay
            // For production, consider using streamText for true streaming
            if (index + chunkSize < responseText.length) {
              await new Promise(resolve => {
                // Use requestAnimationFrame-like delay
                if (typeof setTimeout !== 'undefined') {
                  setTimeout(resolve, 50)
                } else {
                  // Fallback: no delay in Edge Runtime
                  resolve(undefined)
                }
              })
            }
          }
          
          // Send done message
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'done',
                agent: agentResult.agent,
                model: agentResult.model,
                metadata: agentResult.metadata
              })}\n\n`
            )
          )
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        }
      })

      return new Response(responseStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }

    // Non-streaming response (fallback)
    return new Response(
      JSON.stringify({
        success: true,
        output: agentResult.output,
        agent: agentResult.agent,
        model: agentResult.model,
        metadata: agentResult.metadata
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    logger.error('[API /chat/unified] Global error', error instanceof Error ? error : undefined)
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

export const dynamic = 'force-dynamic'

