import { serverLogger } from '../utils/env-setup.js'
import { searchWeb } from '../../src/core/intelligence/search.js'
import { 
  extractActionItems, 
  generateSummary, 
  draftFollowUpEmail, 
  generateProposal 
} from '../../src/core/intelligence/analysis.js'
import { isAdmin } from '../rate-limiting/websocket-rate-limiter.js'

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
        const { multimodalContextManager } = await import('../../src/core/context/multimodal-context.js')
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

        const { multimodalContextManager } = await import('../../src/core/context/multimodal-context.js')
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
        
        const { multimodalContextManager } = await import('../../src/core/context/multimodal-context.js')
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

        const { multimodalContextManager } = await import('../../src/core/context/multimodal-context.js')
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
export async function executeCaptureScreenSnapshot(args: any, connectionId: string, activeSessions: any): Promise<ToolResult> {
    try {
        const client = activeSessions.get(connectionId)
        const snapshot = client?.latestContext?.screen

        if (!snapshot) {
            return {
                success: true,
                data: { message: 'No screen snapshot available' }
            }
        }

        // If focus_prompt is provided, perform fresh targeted analysis
        if (args.focus_prompt && snapshot.imageData) {
            try {
                const { analyzeImageWithPrompt } = await import('../../src/core/intelligence/vision-analysis.js')
                const result = await analyzeImageWithPrompt(
                    snapshot.imageData,
                    args.focus_prompt,
                    'screen'
                )
                
                return {
                    success: true,
                    data: {
                        analysis: result.analysis,
                        answered_prompt: args.focus_prompt,
                        confidence: result.confidence,
                        capturedAt: snapshot.capturedAt || Date.now(),
                        hasImage: !args.summaryOnly,
                        message: 'Screen snapshot analyzed with focus prompt'
                    }
                }
            } catch (analysisError) {
                serverLogger.warn('Failed to perform focused analysis, falling back to cached', {
                    error: analysisError instanceof Error ? analysisError.message : String(analysisError)
                })
                // Fall through to cached analysis
            }
        }

        // Return cached analysis (default behavior)
        return {
            success: true,
            data: {
                analysis: snapshot.analysis,
                capturedAt: snapshot.capturedAt,
                hasImage: !!snapshot.imageData && !args.summaryOnly,
                message: 'Screen snapshot retrieved'
            }
        }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to capture screen snapshot'
        }
    }
}

/**
 * Capture webcam snapshot
 */
export async function executeCaptureWebcamSnapshot(args: any, connectionId: string, activeSessions: any): Promise<ToolResult> {
    try {
        const client = activeSessions.get(connectionId)
        const snapshot = client?.latestContext?.webcam

        if (!snapshot) {
            return {
                success: true,
                data: { message: 'No webcam snapshot available' }
            }
        }

        // If focus_prompt is provided, perform fresh targeted analysis
        if (args.focus_prompt && snapshot.imageData) {
            try {
                const { analyzeImageWithPrompt } = await import('../../src/core/intelligence/vision-analysis.js')
                const result = await analyzeImageWithPrompt(
                    snapshot.imageData,
                    args.focus_prompt,
                    'webcam'
                )
                
                return {
                    success: true,
                    data: {
                        analysis: result.analysis,
                        answered_prompt: args.focus_prompt,
                        confidence: result.confidence,
                        capturedAt: snapshot.capturedAt || Date.now(),
                        hasImage: !args.summaryOnly,
                        message: 'Webcam snapshot analyzed with focus prompt'
                    }
                }
            } catch (analysisError) {
                serverLogger.warn('Failed to perform focused analysis, falling back to cached', {
                    error: analysisError instanceof Error ? analysisError.message : String(analysisError)
                })
                // Fall through to cached analysis
            }
        }

        // Return cached analysis (default behavior)
        return {
            success: true,
            data: {
                analysis: snapshot.analysis,
                capturedAt: snapshot.capturedAt,
                hasImage: !!snapshot.imageData && !args.summaryOnly,
                message: 'Webcam snapshot retrieved'
            }
        }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to capture webcam snapshot'
        }
    }
}

/**
 * Capture webcam snapshot by sessionId (for chat agents)
 */
export async function executeCaptureWebcamSnapshotBySession(args: any, sessionId: string): Promise<ToolResult> {
    try {
        const { multimodalContextManager } = await import('../../src/core/context/multimodal-context.js')
        const context = await multimodalContextManager.getContext(sessionId)
        
        if (!context || !context.visualContext || context.visualContext.length === 0) {
            return {
                success: true,
                data: { message: 'No webcam snapshot available' }
            }
        }

        // Find latest webcam entry
        const webcamEntries = context.visualContext.filter(v => v.type === 'webcam')
        if (webcamEntries.length === 0) {
            return {
                success: true,
                data: { message: 'No webcam snapshot available' }
            }
        }

        const latest = webcamEntries[webcamEntries.length - 1]
        if (!latest) {
            return {
                success: true,
                data: { message: 'No webcam snapshot available' }
            }
        }

        // If focus_prompt is provided, perform fresh targeted analysis
        if (args.focus_prompt && latest.imageData) {
            try {
                const { analyzeImageWithPrompt } = await import('../../src/core/intelligence/vision-analysis.js')
                const result = await analyzeImageWithPrompt(
                    latest.imageData,
                    args.focus_prompt,
                    'webcam'
                )
                
                return {
                    success: true,
                    data: {
                        analysis: result.analysis,
                        answered_prompt: args.focus_prompt,
                        confidence: result.confidence,
                        capturedAt: new Date(latest.timestamp).getTime(),
                        hasImage: !args.summaryOnly,
                        message: 'Webcam snapshot analyzed with focus prompt'
                    }
                }
            } catch (analysisError) {
                serverLogger.warn('Failed to perform focused analysis, falling back to cached', {
                    error: analysisError instanceof Error ? analysisError.message : String(analysisError)
                })
                // Fall through to cached analysis
            }
        }

        // Return cached analysis (default behavior)
        return {
            success: true,
            data: {
                analysis: latest.analysis,
                capturedAt: new Date(latest.timestamp).getTime(),
                hasImage: !!latest.imageData && !args.summaryOnly,
                message: 'Webcam snapshot retrieved'
            }
        }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to capture webcam snapshot'
        }
    }
}

/**
 * Capture screen snapshot by sessionId (for chat agents)
 */
export async function executeCaptureScreenSnapshotBySession(args: any, sessionId: string): Promise<ToolResult> {
    try {
        const { multimodalContextManager } = await import('../../src/core/context/multimodal-context.js')
        const context = await multimodalContextManager.getContext(sessionId)
        
        if (!context || !context.visualContext || context.visualContext.length === 0) {
            return {
                success: true,
                data: { message: 'No screen snapshot available' }
            }
        }

        // Find latest screen entry
        const screenEntries = context.visualContext.filter(v => v.type === 'screen')
        if (screenEntries.length === 0) {
            return {
                success: true,
                data: { message: 'No screen snapshot available' }
            }
        }

        const latest = screenEntries[screenEntries.length - 1]
        if (!latest) {
            return {
                success: true,
                data: { message: 'No screen snapshot available' }
            }
        }

        // If focus_prompt is provided, perform fresh targeted analysis
        if (args.focus_prompt && latest.imageData) {
            try {
                const { analyzeImageWithPrompt } = await import('../../src/core/intelligence/vision-analysis.js')
                const result = await analyzeImageWithPrompt(
                    latest.imageData,
                    args.focus_prompt,
                    'screen'
                )
                
                return {
                    success: true,
                    data: {
                        analysis: result.analysis,
                        answered_prompt: args.focus_prompt,
                        confidence: result.confidence,
                        capturedAt: new Date(latest.timestamp).getTime(),
                        hasImage: !args.summaryOnly,
                        message: 'Screen snapshot analyzed with focus prompt'
                    }
                }
            } catch (analysisError) {
                serverLogger.warn('Failed to perform focused analysis, falling back to cached', {
                    error: analysisError instanceof Error ? analysisError.message : String(analysisError)
                })
                // Fall through to cached analysis
            }
        }

        // Return cached analysis (default behavior)
        return {
            success: true,
            data: {
                analysis: latest.analysis,
                capturedAt: new Date(latest.timestamp).getTime(),
                hasImage: !!latest.imageData && !args.summaryOnly,
                message: 'Screen snapshot retrieved'
            }
        }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to capture screen snapshot'
        }
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

/**
 * Analyze website tech stack
 */
export async function executeAnalyzeWebsiteTechStack(args: { url: string; focus?: 'ai_opportunities' | 'marketing_stack' }): Promise<ToolResult> {
    try {
        serverLogger.info('Executing analyze_website_tech_stack', { url: args.url, focus: args.focus })

        // Fetch the website HTML
        const response = await fetch(args.url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; FBC-Lab/1.0; +https://fbc-lab.com)'
            }
        })

        if (!response.ok) {
            return {
                success: false,
                error: `Failed to fetch website: ${response.status} ${response.statusText}`
            }
        }

        const html = await response.text()

        // Detect technologies using simple regex patterns
        const stack: string[] = []
        const insights: string[] = []

        // CMS Detection
        if (html.includes('wp-content') || html.includes('wp-includes') || html.includes('wordpress')) {
            stack.push('WordPress')
            if (args.focus === 'ai_opportunities') {
                insights.push('Good candidate for plugin-based AI integration')
            }
        } else if (html.includes('/wp-json/')) {
            stack.push('WordPress (REST API)')
        }

        // Frontend Frameworks
        if (html.includes('react') || html.includes('React')) {
            stack.push('React')
        }
        if (html.includes('vue') || html.includes('Vue')) {
            stack.push('Vue.js')
        }
        if (html.includes('angular') || html.includes('Angular')) {
            stack.push('Angular')
        }
        if (html.includes('next.js') || html.includes('__NEXT_DATA__')) {
            stack.push('Next.js')
        }

        // Marketing Tools
        if (html.includes('hubspot') || html.includes('hs-script-loader')) {
            stack.push('HubSpot')
            if (args.focus === 'marketing_stack') {
                insights.push('Already using HubSpot - AI can enhance automation workflows')
            }
        }
        if (html.includes('marketo') || html.includes('mktolcdn.com')) {
            stack.push('Marketo')
        }
        if (html.includes('salesforce') || html.includes('salesforce.com')) {
            stack.push('Salesforce')
        }

        // Chatbots/AI Tools
        if (html.includes('intercom') || html.includes('widget.intercom.io')) {
            stack.push('Intercom Chat')
            if (args.focus === 'ai_opportunities') {
                insights.push('Has existing chat widget - could enhance with AI agent')
            }
        }
        if (html.includes('drift') || html.includes('drift.com')) {
            stack.push('Drift')
        }
        if (html.includes('crisp') || html.includes('crisp.chat')) {
            stack.push('Crisp')
        }

        // Analytics
        if (html.includes('google-analytics') || html.includes('gtag') || html.includes('ga(')) {
            stack.push('Google Analytics')
        }
        if (html.includes('mixpanel')) {
            stack.push('Mixpanel')
        }

        // Payment/Commerce
        if (html.includes('stripe') || html.includes('stripe.com')) {
            stack.push('Stripe')
        }
        if (html.includes('shopify') || html.includes('shopifycdn.com')) {
            stack.push('Shopify')
        }

        // Generate summary insight
        let summary = `Detected ${stack.length} technology${stack.length !== 1 ? 's' : ''}: ${stack.join(', ')}`
        
        if (args.focus === 'ai_opportunities') {
            if (stack.includes('WordPress')) {
                summary += '. WordPress site - ideal for AI plugin integration or custom agent integration.'
            } else if (stack.includes('React') || stack.includes('Next.js')) {
                summary += '. Modern React-based site - can integrate AI via API or embeddable components.'
            } else {
                summary += '. Custom implementation detected - requires API-based AI integration.'
            }
            
            if (stack.some(s => s.includes('Chat'))) {
                summary += ' Existing chat widget detected - AI agent could replace or enhance current solution.'
            } else {
                summary += ' No chat widget detected - significant opportunity for AI-powered lead capture.'
            }
        }

        return {
            success: true,
            data: {
                url: args.url,
                stack,
                insights: insights.length > 0 ? insights : [summary],
                focus: args.focus,
                message: summary
            }
        }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to analyze website tech stack'
        }
    }
}

/**
 * Generate architecture diagram
 */
export async function executeGenerateArchitectureDiagram(args: { diagram_type: 'flowchart' | 'sequence' | 'gantt' | 'mindmap'; content_description: string }, _sessionId?: string): Promise<ToolResult> {
    try {
        serverLogger.info('Executing generate_architecture_diagram', { diagram_type: args.diagram_type })

        // Use Gemini to generate Mermaid.js code
        const { generateText } = await import('ai')
        const { google } = await import('@ai-sdk/google')
        const { GEMINI_MODELS } = await import('../../src/config/constants.js')

        const prompt = `Generate Mermaid.js code for a ${args.diagram_type} diagram representing: ${args.content_description}

Requirements:
- Use proper Mermaid.js syntax for ${args.diagram_type}
- Make it clear and well-structured
- Include all necessary nodes and connections
- Return ONLY the Mermaid code, no explanations or markdown code blocks
- Start directly with the diagram syntax (e.g., "graph TD" or "sequenceDiagram")`

        const result = await generateText({
            model: google(GEMINI_MODELS.DEFAULT_CHAT),
            system: 'You are an expert at generating Mermaid.js diagrams. Generate clean, valid Mermaid code only.',
            prompt: prompt,
            temperature: 0.7
        })

        // Extract Mermaid code (remove any markdown code blocks if present)
        let mermaidCode = result.text.trim()
        mermaidCode = mermaidCode.replace(/^```mermaid\s*/i, '')
        mermaidCode = mermaidCode.replace(/^```\s*/i, '')
        mermaidCode = mermaidCode.replace(/\s*```$/i, '')
        mermaidCode = mermaidCode.trim()

        return {
            success: true,
            data: {
                diagram_type: args.diagram_type,
                mermaidCode,
                content_description: args.content_description,
                message: `Generated ${args.diagram_type} diagram for: ${args.content_description}`
            }
        }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to generate architecture diagram'
        }
    }
}

/**
 * Search internal case studies
 */
export async function executeSearchInternalCaseStudies(args: { query: string; industry?: string }): Promise<ToolResult> {
    try {
        serverLogger.info('Executing search_internal_case_studies', { query: args.query, industry: args.industry })

        // Mock case studies database (in production, this would query a real database or vector store)
        // TODO: Replace with actual case studies database/vector search
        const caseStudies = [
            {
                id: 'cs-001',
                title: 'Video Production House - Automated Subtitling',
                industry: 'Media Production',
                useCase: 'video generation',
                client: 'Media Production Co.',
                challenge: 'Manual subtitle creation taking 40+ hours per week',
                solution: 'AI-powered automated subtitling pipeline',
                results: 'Saved 40 hours/week, reduced costs by 60%',
                year: 2024
            },
            {
                id: 'cs-002',
                title: 'E-commerce Platform - Customer Support Automation',
                industry: 'E-commerce',
                useCase: 'customer support',
                client: 'Retail Platform Inc.',
                challenge: 'High support ticket volume, long response times',
                solution: 'AI chatbot with human escalation',
                results: 'Reduced response time by 75%, handled 80% of queries automatically',
                year: 2024
            },
            {
                id: 'cs-003',
                title: 'Financial Services - Data Entry Automation',
                industry: 'Financial Services',
                useCase: 'data entry',
                client: 'Finance Corp',
                challenge: 'Manual data entry from invoices and documents',
                solution: 'OCR + AI extraction pipeline',
                results: 'Eliminated 30 hours/week of manual work, 99% accuracy',
                year: 2023
            },
            {
                id: 'cs-004',
                title: 'Consulting Firm - Lead Qualification',
                industry: 'Consulting',
                useCase: 'lead generation',
                client: 'Strategy Consultants LLC',
                challenge: 'Manual lead qualification taking too much time',
                solution: 'AI-powered lead scoring and qualification',
                results: 'Qualified leads 3x faster, improved conversion by 45%',
                year: 2024
            }
        ]

        // Simple search (in production, use vector search or proper full-text search)
        const queryLower = args.query.toLowerCase()
        const industryLower = args.industry?.toLowerCase()

        const matching = caseStudies.filter(cs => {
            const matchesQuery = 
                cs.title.toLowerCase().includes(queryLower) ||
                cs.useCase.toLowerCase().includes(queryLower) ||
                cs.industry.toLowerCase().includes(queryLower) ||
                cs.challenge.toLowerCase().includes(queryLower) ||
                cs.solution.toLowerCase().includes(queryLower)

            const matchesIndustry = !industryLower || cs.industry.toLowerCase().includes(industryLower)

            return matchesQuery && matchesIndustry
        })

        if (matching.length === 0) {
            return {
                success: true,
                data: {
                    query: args.query,
                    industry: args.industry,
                    results: [],
                    message: `No case studies found matching "${args.query}"${args.industry ? ` in ${args.industry}` : ''}`
                }
            }
        }

        return {
            success: true,
            data: {
                query: args.query,
                industry: args.industry,
                results: matching,
                count: matching.length,
                message: `Found ${matching.length} case study${matching.length !== 1 ? 'ies' : ''} matching "${args.query}"`
            }
        }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to search case studies'
        }
    }
}

/**
 * Generate custom workshop syllabus (Curriculum Architect)
 */
export async function executeGenerateCustomSyllabus(args: { team_roles: string; pain_points: string[]; tech_stack: string }, _sessionId?: string): Promise<ToolResult> {
    try {
        serverLogger.info('Executing generate_custom_syllabus', { team_roles: args.team_roles, painPointsCount: args.pain_points.length })

        const { generateText } = await import('ai')
        const { google } = await import('@ai-sdk/google')
        const { GEMINI_MODELS } = await import('../../src/config/constants.js')

        const painPointsList = args.pain_points.join(', ')
        
        const prompt = `Generate a custom 2-day workshop syllabus for a team with these specifications:

Team Composition: ${args.team_roles}
Pain Points to Address: ${painPointsList}
Current Tech Stack: ${args.tech_stack}

Requirements:
- Create a structured 2-day agenda with clear modules
- Each module should directly address their pain points
- Reference their specific tech stack throughout
- Format as markdown with Day 1 and Day 2 sections
- Each day should have 3-4 modules
- Include specific, actionable topics (not generic)
- Show that their questions are answered in specific modules

Output format:
# Custom Workshop Syllabus

## Day 1: [Theme]
### Module 1: [Title]
- [Specific topic that addresses pain point 1]
- [Specific topic related to their tech stack]

### Module 2: [Title]
- [Topics addressing pain point 2]

## Day 2: [Theme]
### Module 3: [Title]
- [Implementation-focused topics]

### Module 4: [Title]
- [Live build/practical application]

Return ONLY the markdown syllabus, no additional commentary.`

        const result = await generateText({
            model: google(GEMINI_MODELS.DEFAULT_CHAT),
            system: 'You are an expert at designing custom AI workshops. Create detailed, specific syllabi that address client pain points while demonstrating expertise.',
            prompt: prompt,
            temperature: 0.7
        })

        const syllabusText = result.text.trim()

        return {
            success: true,
            data: {
                syllabus: syllabusText,
                team_roles: args.team_roles,
                pain_points: args.pain_points,
                tech_stack: args.tech_stack,
                format: 'markdown',
                message: `Generated custom 2-day workshop syllabus for ${args.team_roles} team addressing ${args.pain_points.length} pain point${args.pain_points.length !== 1 ? 's' : ''}`
            }
        }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to generate custom syllabus'
        }
    }
}

/**
 * Analyze competitor gap (FOMO Radar)
 */
export async function executeAnalyzeCompetitorGap(args: { industry: string; client_current_state: string }): Promise<ToolResult> {
    try {
        serverLogger.info('Executing analyze_competitor_gap', { industry: args.industry })

        const { executeSearchWeb } = await import('./tool-implementations.js')
        
        // Search for competitors in industry with AI adoption
        const competitorSearchQuery = `${args.industry} companies using AI artificial intelligence adoption`
        const competitorResults = await executeSearchWeb({ query: competitorSearchQuery })

        if (!competitorResults.success || !competitorResults.data) {
            return {
                success: false,
                error: 'Failed to search for competitor information'
            }
        }

        // Search for job postings (AI talent signals) - future enhancement
        // const jobSearchQuery = `${args.industry} hiring prompt engineer AI engineer machine learning`
        // const jobResults = await executeSearchWeb({ query: jobSearchQuery })

        // Extract competitor activity from search results
        const competitors: Array<{ name: string; activity: string; source: string }> = []
        
        // Parse search results (simplified - in production, use structured extraction)
        const searchData = competitorResults.data as { answer?: string; results?: Array<{ title: string; snippet: string; url: string }> }
        if (searchData.results && Array.isArray(searchData.results)) {
            searchData.results.slice(0, 3).forEach((result, i) => {
                competitors.push({
                    name: result.title || `Competitor ${i + 1}`,
                    activity: result.snippet || 'AI adoption activity detected',
                    source: result.url || ''
                })
            })
        }

        // Determine client state level
        const clientStateLower = args.client_current_state.toLowerCase()
        let clientActivityLevel = 'Exploration'
        
        if (clientStateLower.includes('implement') || clientStateLower.includes('deploy') || clientStateLower.includes('production')) {
            clientActivityLevel = 'Implementation'
        } else if (clientStateLower.includes('plan') || clientStateLower.includes('evaluat') || clientStateLower.includes('consider')) {
            clientActivityLevel = 'Planning'
        } else {
            clientActivityLevel = 'Exploration'
        }

        // Calculate gap timeline (simplified logic)
        const gapTimeline = clientActivityLevel === 'Exploration' ? '6-12 months' : clientActivityLevel === 'Planning' ? '3-6 months' : '0-3 months'

        const recommendations = `Based on competitor activity in ${args.industry}, market leaders are actively implementing AI solutions. 
Your current state (${clientActivityLevel}) suggests a gap of approximately ${gapTimeline} behind industry leaders. 
A Strategy Audit can help you close this gap in 4 weeks.`

        return {
            success: true,
            data: {
                industry: args.industry,
                client_current_state: args.client_current_state,
                client_activity_level: clientActivityLevel,
                competitors,
                gap: {
                    timeline: gapTimeline,
                    activity_level: clientActivityLevel
                },
                recommendations,
                message: `Competitor analysis complete. Gap: ${gapTimeline} behind market leaders in ${args.industry}`
            }
        }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to analyze competitor gap'
        }
    }
}

/**
 * Simulate cost of inaction (ROI Simulator)
 */
export async function executeSimulateCostOfInaction(args: { inefficient_process: string; hours_wasted_per_week: number; team_size: number }): Promise<ToolResult> {
    try {
        serverLogger.info('Executing simulate_cost_of_inaction', { process: args.inefficient_process, hours: args.hours_wasted_per_week })

        // Default hourly rate (can be made configurable)
        const hourlyRate = 50 // USD per hour
        
        // Calculate costs
        const monthlyHoursWasted = args.hours_wasted_per_week * 4 * args.team_size
        const monthlyCost = monthlyHoursWasted * hourlyRate
        const annualCost = monthlyCost * 12
        
        // Workshop and consulting costs (defaults, can be customized)
        const workshopCost = 10000 // USD
        const consultingCost = 80000 // USD
        
        // Calculate break-even
        const workshopBreakEvenMonths = workshopCost / monthlyCost
        const consultingBreakEvenMonths = consultingCost / monthlyCost
        
        // Generate message
        let message = `You mentioned ${args.team_size} people spend ${args.hours_wasted_per_week} hours/week on ${args.inefficient_process}.\n\n`
        message += `Monthly hours wasted: ${monthlyHoursWasted}\n`
        message += `Estimated monthly cost: $${monthlyCost.toLocaleString()}\n`
        message += `Annual cost: $${annualCost.toLocaleString()}\n\n`
        
        if (monthlyCost > 0) {
            if (workshopBreakEvenMonths <= 1) {
                message += `A 2-day Workshop costs $${workshopCost.toLocaleString()}. You're essentially paying for a workshop every ${workshopBreakEvenMonths.toFixed(1)} months, but without getting the solution.`
            } else {
                message += `A 2-day Workshop costs $${workshopCost.toLocaleString()}. At this rate, you'll pay for a workshop every ${workshopBreakEvenMonths.toFixed(1)} months just in wasted time.`
            }
            
            message += ` If we book for next week, you stop that bleeding immediately.`
        }

        return {
            success: true,
            data: {
                inefficient_process: args.inefficient_process,
                hours_wasted_per_week: args.hours_wasted_per_week,
                team_size: args.team_size,
                monthlyHoursWasted,
                monthlyCost: Math.round(monthlyCost),
                annualCost: Math.round(annualCost),
                hourlyRate,
                workshopCost,
                consultingCost,
                workshopBreakEvenMonths: Math.round(workshopBreakEvenMonths * 10) / 10,
                consultingBreakEvenMonths: Math.round(consultingBreakEvenMonths * 10) / 10,
                message
            }
        }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to simulate cost of inaction'
        }
    }
}

/**
 * Generate executive memo for C-level decision makers
 */
export async function executeGenerateExecutiveMemo(
    args: { target_audience: 'CFO' | 'CEO' | 'CTO'; key_blocker: 'budget' | 'timing' | 'security'; proposed_solution: string },
    sessionId?: string
): Promise<ToolResult> {
    try {
        serverLogger.info('Executing generate_executive_memo', { 
            target_audience: args.target_audience, 
            key_blocker: args.key_blocker 
        })

        if (!sessionId) {
            return {
                success: false,
                error: 'Session ID required to generate executive memo'
            }
        }

        // Load conversation history to extract tool results
        const { multimodalContextManager } = await import('../../src/core/context/multimodal-context.js')
        const history = await multimodalContextManager.getConversationHistory(sessionId, 50)

        // Extract ROI data from calculate_roi tool results
        let roiData: {
            paybackPeriod?: string
            firstYearROI?: number
            totalSavings?: number
            totalInvestment?: number
        } | null = null

        // Extract cost of inaction data
        let costOfInactionData: {
            monthlyWaste?: number
            annualWaste?: number
            inefficient_process?: string
        } | null = null

        // Scan history for tool invocations
        for (const entry of history) {
            const metadata = entry.metadata as { toolInvocations?: Array<{ name?: string; result?: unknown; state?: string }> } | undefined
            const toolInvocations = metadata?.toolInvocations || []

            for (const toolInv of toolInvocations) {
                if (toolInv.state === 'complete' && toolInv.result) {
                    // Extract ROI data
                    if (toolInv.name === 'calculate_roi') {
                        const result = toolInv.result as { data?: { paybackPeriod?: string; firstYearROI?: number; totalSavings?: number; totalInvestment?: number } }
                        if (result.data) {
                            roiData = {}
                            if (result.data.paybackPeriod !== undefined) roiData.paybackPeriod = result.data.paybackPeriod
                            if (result.data.firstYearROI !== undefined) roiData.firstYearROI = result.data.firstYearROI
                            if (result.data.totalSavings !== undefined) roiData.totalSavings = result.data.totalSavings
                            if (result.data.totalInvestment !== undefined) roiData.totalInvestment = result.data.totalInvestment
                        }
                    }

                    // Extract cost of inaction data
                    if (toolInv.name === 'simulate_cost_of_inaction') {
                        const result = toolInv.result as { data?: { monthlyCost?: number; annualCost?: number; inefficient_process?: string } }
                        if (result.data) {
                            costOfInactionData = {}
                            if (result.data.monthlyCost !== undefined) costOfInactionData.monthlyWaste = result.data.monthlyCost
                            if (result.data.annualCost !== undefined) costOfInactionData.annualWaste = result.data.annualCost
                            if (result.data.inefficient_process !== undefined) costOfInactionData.inefficient_process = result.data.inefficient_process
                        }
                    }
                }
            }
        }

        // Get intelligence context for company/role info
        const { ContextStorage } = await import('../../src/core/context/context-storage.js')
        const storage = new ContextStorage()
        const dbContext = await storage.get(sessionId)
        const intelligenceContext = dbContext?.intelligence_context as { company?: { name?: string }; person?: { role?: string } } | undefined

        // Build context for memo generation
        const companyName = intelligenceContext?.company?.name || 'your organization'
        const leadRole = intelligenceContext?.person?.role || 'team member'

        // Build audience-specific prompt
        let audienceFocus = ''
        let blockerFocus = ''

        if (args.target_audience === 'CFO') {
            audienceFocus = 'Focus on financial metrics, payback period, OPEX reduction, and risk mitigation. Use numbers and ROI data prominently.'
            if (args.key_blocker === 'budget') {
                blockerFocus = 'Address budget concerns by showing clear financial return and payback period.'
            } else if (args.key_blocker === 'timing') {
                blockerFocus = 'Emphasize cost of delay and opportunity cost of waiting.'
            } else {
                blockerFocus = 'Address security concerns by highlighting risk mitigation and compliance benefits.'
            }
        } else if (args.target_audience === 'CTO') {
            audienceFocus = 'Focus on technical architecture, security compliance, scalability, and implementation strategy.'
            if (args.key_blocker === 'security') {
                blockerFocus = 'Address security concerns with specific technical safeguards and compliance measures.'
            } else if (args.key_blocker === 'timing') {
                blockerFocus = 'Emphasize technical readiness and implementation timeline.'
            } else {
                blockerFocus = 'Address budget concerns by showing technical efficiency and resource optimization.'
            }
        } else { // CEO
            audienceFocus = 'Focus on competitive advantage, speed to market, innovation, and strategic positioning.'
            if (args.key_blocker === 'timing') {
                blockerFocus = 'Emphasize competitive window and first-mover advantage.'
            } else if (args.key_blocker === 'budget') {
                blockerFocus = 'Frame investment as strategic competitive advantage, not just cost.'
            } else {
                blockerFocus = 'Address security concerns by positioning as strategic risk management.'
            }
        }

        // Build financial context string
        let financialContext = ''
        if (roiData) {
            financialContext = `\nFINANCIAL DATA:\n`
            if (roiData.paybackPeriod) financialContext += `- Payback Period: ${roiData.paybackPeriod}\n`
            if (roiData.firstYearROI !== undefined) financialContext += `- First Year ROI: $${roiData.firstYearROI.toLocaleString()}\n`
            if (roiData.totalSavings !== undefined) financialContext += `- Annual Savings: $${roiData.totalSavings.toLocaleString()}\n`
            if (roiData.totalInvestment !== undefined) financialContext += `- Investment Required: $${roiData.totalInvestment.toLocaleString()}\n`
        }

        if (costOfInactionData) {
            financialContext += `\nCOST OF INACTION:\n`
            if (costOfInactionData.annualWaste !== undefined) {
                financialContext += `- Current Annual Waste: $${costOfInactionData.annualWaste.toLocaleString()}\n`
            }
            if (costOfInactionData.monthlyWaste !== undefined) {
                financialContext += `- Monthly Waste: $${costOfInactionData.monthlyWaste.toLocaleString()}\n`
            }
            if (costOfInactionData.inefficient_process) {
                financialContext += `- Inefficient Process: ${costOfInactionData.inefficient_process}\n`
            }
        }

        // Generate memo using AI
        const { generateText } = await import('ai')
        const { google } = await import('@ai-sdk/google')
        const { GEMINI_MODELS } = await import('../../src/config/constants.js')

        const prompt = `You are a Fortune 500 Strategy Consultant. Write a concise, persuasive 150-word executive memo.

TARGET AUDIENCE: ${args.target_audience}
${audienceFocus}

KEY BLOCKER TO OVERCOME: ${args.key_blocker}
${blockerFocus}

PROPOSED SOLUTION: ${args.proposed_solution}

COMPANY CONTEXT: ${companyName}
REQUESTOR: ${leadRole}
${financialContext}

REQUIREMENTS:
- Write in formal business memo format
- Be concise (150 words maximum)
- Use specific numbers and data when available
- Address the key blocker directly
- Structure: Problem → Financial Impact → Solution → Ask
- Tone: Factual, persuasive, no fluff
- Include a clear recommendation

OUTPUT FORMAT (JSON):
{
  "subject": "Subject line for email (max 60 chars)",
  "memo": "Full memo text in formal format with TO/FROM/DATE headers"
}

Return ONLY valid JSON, no additional commentary.`

        const result = await generateText({
            model: google(GEMINI_MODELS.DEFAULT_CHAT),
            system: 'You are an expert at writing executive briefings for C-level decision makers. Create concise, data-driven memos that overcome objections and drive approvals.',
            prompt: prompt,
            temperature: 0.7
        })

        // Parse JSON response
        let memoData: { subject?: string; memo?: string }
        try {
            const jsonMatch = result.text.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
                memoData = JSON.parse(jsonMatch[0]) as { subject?: string; memo?: string }
            } else {
                throw new Error('No JSON found in response')
            }
        } catch (parseError) {
            // Fallback: use raw text as memo
            memoData = {
                subject: `Business Case for ${args.proposed_solution}`,
                memo: `TO: ${args.target_audience}\nFROM: ${leadRole}\nDATE: ${new Date().toLocaleDateString()}\n\n${result.text}`
            }
        }

        return {
            success: true,
            data: {
                target_audience: args.target_audience,
                key_blocker: args.key_blocker,
                proposed_solution: args.proposed_solution,
                subject: memoData.subject || `Business Case for ${args.proposed_solution}`,
                memo: memoData.memo || result.text,
                message: `Executive memo generated for ${args.target_audience} addressing ${args.key_blocker} concerns`
            }
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        serverLogger.error('Failed to generate executive memo', error instanceof Error ? error : undefined, { error: errorMessage })
        return {
            success: false,
            error: errorMessage
        }
    }
}
