import { getChatToolDefinitions } from '../../tools/unified-tool-registry.js'

type MaybeToolCall = { toolName?: string; name?: string } | null | undefined

export function getAgentTools(sessionId: string, agentName: string): any {
  const unified = getChatToolDefinitions(sessionId, agentName)
  // Enable Gemini built-in grounding search for claim-level citations.
  // This returns groundingMetadata (chunks + supports) that the frontend renders inline.
  return {
    ...unified,
    googleSearch: {} as any
  }
}

export function extractToolNames(toolCalls: unknown): string[] {
  if (!Array.isArray(toolCalls)) return []
  const names = toolCalls
    .map((c) => {
      const call = c as MaybeToolCall
      const name = call?.toolName || call?.name
      return typeof name === 'string' ? name : ''
    })
    .filter(Boolean)
  return Array.from(new Set(names))
}

