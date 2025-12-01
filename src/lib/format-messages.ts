import type { ChatMessage } from 'src/core/agents/types'

/**
 * Formats messages for AI SDK, handling multimodal content (text + attachments)
 * 
 * Converts messages with attachments into the AI SDK format:
 * - Text messages: { role, content: string }
 * - Multimodal messages: { role, content: [{ type: 'text', text: '...' }, { type: 'image', image: '...' }] }
 */
export function formatMessagesForAI(
  messages: ChatMessage[]
): any[] {
  return messages
    .filter(m => {
      // Filter out empty or invalid messages
      if (!m.role || !m.content) return false
      
      // Keep messages with attachments even if content is empty (images only)
      const hasAttachments = (m as any).attachments && Array.isArray((m as any).attachments) && (m as any).attachments.length > 0
      if (hasAttachments) return true
      
      // Keep non-empty text messages
      const textContent = typeof m.content === 'string' ? m.content.trim() : String(m.content || '').trim()
      return textContent.length > 0
    })
    .map(m => {
      // Normalize role: 'model' (Gemini API) -> 'assistant' (AI SDK)
      // Cast to any first to avoid type narrowing issues
      const roleValue = (m as any).role || m.role || 'user'
      const normalizedRole: 'user' | 'assistant' | 'system' = roleValue === 'model'
        ? 'assistant'
        : (roleValue === 'user' || roleValue === 'system' || roleValue === 'assistant'
          ? roleValue as 'user' | 'assistant' | 'system'
          : 'user')
      
      // Handle messages with attachments (multimodal content)
      // Note: Only user messages should have attachments normally, but we'll handle all cases
      const hasAttachments = (m as any).attachments && Array.isArray((m as any).attachments) && (m as any).attachments.length > 0
      
      if (hasAttachments && normalizedRole === 'user') {
        // Format as multimodal content array (only for user messages)
        const contentParts: Array<{ type: 'text'; text: string } | { type: 'image'; image: string }> = []
        
        // Add text content if present
        const textContent = typeof m.content === 'string' ? m.content.trim() : ''
        if (textContent) {
          contentParts.push({ type: 'text', text: textContent })
        }
        
        // Add image attachments
        for (const attachment of (m as any).attachments) {
          if (attachment && attachment.mimeType?.startsWith('image/') && attachment.data) {
            contentParts.push({ type: 'image', image: attachment.data })
          }
        }
        
        // Must have at least one part (text or image)
        if (contentParts.length === 0) {
          // Fallback: add placeholder text if no valid content
          contentParts.push({ type: 'text', text: 'Please analyze the attached content.' })
        }
        
        return {
          role: normalizedRole,
          content: contentParts
        }
      }
      
      // Simple text message - ensure content is always a string
      const textContent = typeof m.content === 'string' 
        ? m.content.trim() 
        : (m.content ? String(m.content).trim() : '')
      
      return {
        role: normalizedRole,
        content: textContent || ''
      }
    })
    .filter(m => {
      // Final validation: ensure content is not empty
      if (typeof m.content === 'string') {
        return m.content.length > 0
      }
      if (Array.isArray(m.content)) {
        return m.content.length > 0
      }
      return false
    }) as any[]
}

