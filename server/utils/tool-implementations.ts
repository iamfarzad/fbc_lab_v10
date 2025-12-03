import { serverLogger } from '../utils/env-setup'
import { searchWeb } from '../../src/core/intelligence/search.js'
import { 
  extractActionItems, 
  generateSummary, 
  draftFollowUpEmail, 
  generateProposal 
} from '../../src/core/intelligence/analysis.js'
import { isAdmin } from '../rate-limiting/websocket-rate-limiter'

export interface ToolResult {
    success: boolean
    data?: any
    error?: string
}

/**
 * Search the web using Google Search API or similar
 */
export async function executeSearchWeb(args: { query: string; urls?: string[] }): Promise<ToolResult> {
    try {
        serverLogger.info('Executing search_web', { query: args.query })

        const result = await searchWeb(args.query, args.urls)

        return {
            success: true,
            data: {
                query: args.query,
                results: result.results,
                message: result.answer
            }
        }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Search failed'
        }
    }
}

/**
 * Extract action items from conversation
 */
export async function executeExtractActionItems(_args: any, sessionId?: string): Promise<ToolResult> {
    try {
        serverLogger.info('Executing extract_action_items', { sessionId })

        if (!sessionId) {
            return {
                success: false,
                error: 'Session ID required to extract action items'
            }
        }

        // Load conversation history
        const { multimodalContextManager } = await import('src/core/context/multimodal-context')
        const history = await multimodalContextManager.getConversationHistory(sessionId, 50)

        // Extract text from conversation
        const conversationText = history
            .map((entry: any) => `${entry.metadata?.speaker || 'user'}: ${entry.content}`)
            .join('\n')

        if (conversationText.length < 50) {
             return {
                success: true,
                data: {
                    actionItems: [],
                    conversationLength: history.length,
                    message: 'Conversation too short to extract action items'
                }
            }
        }

        const result = await extractActionItems(conversationText)

        return {
            success: true,
            data: {
                actionItems: result.items,
                priority: result.priority,
                nextMeetingNeed: result.nextMeetingNeed,
                conversationLength: history.length,
                message: `Extracted ${result.items.length} action items`
            }
        }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to extract action items'
        }
    }
}

/**
 * Calculate ROI based on inputs
 */
export function executeCalculateROI(args: any): Promise<ToolResult> {
    try {
        const {
            currentCost = 0,
            timeSavings = 0,
            employeeCostPerHour = 50,
            implementationCost = 0,
            timeline = 12,
            initialInvestment,
            annualCost,
            staffReductionSavings,
            efficiencySavings,
            retentionSavings
        } = args

        // Use detailed calculation if provided, otherwise simplified
        let annualSavings, netSavings, roi, paybackMonths

        if (initialInvestment !== undefined || annualCost !== undefined) {
            // Detailed calculation
            const totalSavings = (staffReductionSavings || 0) + (efficiencySavings || 0) + (retentionSavings || 0)
            annualSavings = totalSavings
            const totalCost = (initialInvestment || 0) + (annualCost || 0)
            netSavings = annualSavings - (annualCost || 0)
            roi = totalCost > 0 ? ((annualSavings * timeline / 12 - totalCost) / totalCost) * 100 : 0
            paybackMonths = netSavings > 0 ? Math.ceil((initialInvestment || 0) / (netSavings / 12)) : 0
        } else {
            // Simplified calculation
            annualSavings = timeSavings * employeeCostPerHour
            netSavings = annualSavings - currentCost
            roi = implementationCost > 0
                ? ((netSavings * timeline / 12 - implementationCost) / implementationCost) * 100
                : 0
            paybackMonths = implementationCost > 0 && netSavings > 0
                ? Math.ceil(implementationCost / (netSavings / 12))
                : 0
        }

        return Promise.resolve({
            success: true,
            data: {
                roi: Math.round(roi * 10) / 10,
                annualSavings: Math.round(annualSavings as number),
                netSavings: Math.round(netSavings),
                paybackMonths,
                timeline,
                message: `ROI: ${Math.round(roi)}% over ${timeline} months, payback in ${paybackMonths} months`
            }
        })
    } catch (error) {
        return Promise.resolve({
            success: false,
            error: error instanceof Error ? error.message : 'ROI calculation failed'
        })
    }
}

/**
 * Generate summary preview
 */
export async function executeGenerateSummaryPreview(args: any, sessionId?: string): Promise<ToolResult> {
    try {
        if (!sessionId) {
            return Promise.resolve({ success: false, error: 'Session ID required' })
        }

        const { multimodalContextManager } = await import('src/core/context/multimodal-context')
        const history = await multimodalContextManager.getConversationHistory(sessionId, 50)
        
        const conversationText = history
            .map((entry: any) => `${entry.metadata?.speaker || 'user'}: ${entry.content}`)
            .join('\n')

        const summary = await generateSummary(conversationText)

        return {
            success: true,
            data: {
                summary,
                includeRecommendations: args.includeRecommendations,
                includeNextSteps: args.includeNextSteps,
                message: 'Summary preview generated'
            }
        }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Summary generation failed'
        }
    }
}

/**
 * Draft follow-up email
 */
export async function executeDraftFollowUpEmail(args: any, sessionId?: string): Promise<ToolResult> {
    try {
         if (!sessionId) {
            return Promise.resolve({ success: false, error: 'Session ID required' })
        }
        
        const { recipient = 'client', tone = 'professional' } = args
        
        const { multimodalContextManager } = await import('src/core/context/multimodal-context')
        const history = await multimodalContextManager.getConversationHistory(sessionId, 50)
        
        const conversationText = history
            .map((entry: any) => `${entry.metadata?.speaker || 'user'}: ${entry.content}`)
            .join('\n')

        const draft = await draftFollowUpEmail(conversationText, recipient, tone)

        return {
            success: true,
            data: {
                email: `Subject: ${draft.subject}\n\n${draft.body}`,
                recipient,
                tone,
                message: `Draft email created for ${recipient} in ${tone} tone`
            }
        }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Email drafting failed'
        }
    }
}

/**
 * Generate proposal draft
 */
export async function executeGenerateProposalDraft(_args: any, sessionId?: string): Promise<ToolResult> {
    try {
        if (!sessionId) {
            return Promise.resolve({ success: false, error: 'Session ID required' })
        }

        const { multimodalContextManager } = await import('src/core/context/multimodal-context')
        const history = await multimodalContextManager.getConversationHistory(sessionId, 50)
        
        const conversationText = history
            .map((entry: any) => `${entry.metadata?.speaker || 'user'}: ${entry.content}`)
            .join('\n')

        const proposal = await generateProposal(conversationText)

        return {
            success: true,
            data: {
                proposal,
                format: 'markdown',
                message: 'Proposal draft generated'
            }
        }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Proposal generation failed'
        }
    }
}

/**
 * Capture screen snapshot
 */
export function executeCaptureScreenSnapshot(args: any, connectionId: string, activeSessions: any): Promise<ToolResult> {
    try {
        const client = activeSessions.get(connectionId)
        const snapshot = client?.latestContext?.screen

        if (!snapshot) {
            return Promise.resolve({
                success: true,
                data: { message: 'No screen snapshot available' }
            })
        }

        return Promise.resolve({
            success: true,
            data: {
                analysis: snapshot.analysis,
                capturedAt: snapshot.capturedAt,
                hasImage: !!snapshot.imageData && !args.summaryOnly,
                message: 'Screen snapshot retrieved'
            }
        })
    } catch (error) {
        return Promise.resolve({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to capture screen snapshot'
        })
    }
}

/**
 * Capture webcam snapshot
 */
export function executeCaptureWebcamSnapshot(args: any, connectionId: string, activeSessions: any): Promise<ToolResult> {
    try {
        const client = activeSessions.get(connectionId)
        const snapshot = client?.latestContext?.webcam

        if (!snapshot) {
            return Promise.resolve({
                success: true,
                data: { message: 'No webcam snapshot available' }
            })
        }

        return Promise.resolve({
            success: true,
            data: {
                analysis: snapshot.analysis,
                capturedAt: snapshot.capturedAt,
                hasImage: !!snapshot.imageData && !args.summaryOnly,
                message: 'Webcam snapshot retrieved'
            }
        })
    } catch (error) {
        return Promise.resolve({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to capture webcam snapshot'
        })
    }
}

/**
 * Get dashboard stats (Admin Only)
 */
export async function executeGetDashboardStats(args: any, sessionId: string): Promise<ToolResult> {
    try {
         if (!isAdmin(sessionId)) {
            return {
                success: false,
                error: 'Dashboard stats are admin-only'
            }
        }

        const period = args?.period || '7d'
        const { supabaseService } = await import('../../src/core/supabase/client.js')
        
        const now = new Date()
        const daysBack = period === '1d' ? 1 : period === '30d' ? 30 : period === '90d' ? 90 : 7
        const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000)

        const { data, error } = await (supabaseService as any)
            .from('lead_summaries')
            .select('lead_score, ai_capabilities_shown')
            .gte('created_at', startDate.toISOString())

        if (error) {
            return { success: false, error: 'Failed to retrieve statistics' }
        } 
        
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

        return {
            success: true,
            data: {
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
        serverLogger.error('Failed to calculate dashboard stats', err instanceof Error ? err : undefined, { sessionId })
        return { success: false, error: 'Failed to calculate dashboard stats' }
    }
}
