/**
 * Admin Chat Service - Stub
 * TODO: Implement admin chat service
 */

import type { Database } from 'src/core/database.types'

type AdminSessionRow = Database['admin']['Tables']['admin_sessions']['Row']

export interface AdminMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  contextLeads?: string[] | null
  embeddings?: number[]
}

export interface AdminChatContext {
  sessionId: string
  messages: AdminMessage[]
  relevantHistory: AdminMessage[]
  leadContext?: {
    conversationId: string
    name: string
    email: string
    summary: string
    leadScore: number
  }[]
}

export class AdminChatService {
  private static instance: AdminChatService

  static getInstance(): AdminChatService {
    if (!AdminChatService.instance) {
      AdminChatService.instance = new AdminChatService()
    }
    return AdminChatService.instance
  }

  async getOrCreateSession(_sessionId: string, _adminId?: string, _sessionName?: string): Promise<AdminSessionRow> {
    // Stub implementation
    throw new Error('AdminChatService.getOrCreateSession() not implemented')
  }

  async getAdminSessions(_adminId?: string): Promise<AdminSessionRow[]> {
    // Stub implementation
    console.warn('AdminChatService.getAdminSessions() called but not implemented')
    return []
  }

  async deleteSession(_sessionId: string): Promise<void> {
    // Stub implementation
    throw new Error('AdminChatService.deleteSession() not implemented')
  }
}

export const adminChatService = AdminChatService.getInstance()

