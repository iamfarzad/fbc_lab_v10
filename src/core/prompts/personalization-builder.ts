/**
 * Shared Personalization Builder
 * Single source of truth for formatting user context in system prompts
 * Used by both Voice (Live API) and Chat (Unified API)
 */

export interface PersonalizationData {
    name?: string
    email?: string
    company?: {
        name: string
        industry?: string
        size?: string
    }
    person?: {
        role?: string
        seniority?: string
    }
}

/**
 * Build personalized context string from user data
 * Returns formatted string ready to inject into system prompt
 */
export function buildPersonalizationContext(data: PersonalizationData): string {
    if (!data.name && !data.company && !data.person) {
        return ''
    }

    let context = '\n\nPERSONALIZED CONTEXT:\n'

    // User info
    if (data.name) {
        context += `User: ${data.name}`
        if (data.email) context += ` (${data.email})`
        context += '\n'
    }

    // Company info
    if (data.company?.name) {
        context += `Company: ${data.company.name}\n`
        if (data.company.industry) context += `Industry: ${data.company.industry}\n`
        if (data.company.size) context += `Size: ${data.company.size}\n`
    }

    // Person/role info
    if (data.person?.role) {
        context += `Role: ${data.person.role}\n`
    }
    if (data.person?.seniority) {
        context += `Seniority: ${data.person.seniority}\n`
    }

    // Cap at 500 chars to avoid token bloat
    if (context.length > 500) {
        context = context.substring(0, 500) + '...\n'
    }

    return context
}

/**
 * Quick personalization for Voice sessions (from start payload)
 * Just name/email, no DB lookup
 */
export function buildQuickPersonalization(userContext?: { name?: string; email?: string }): string {
    if (!userContext?.name) return ''

    let context = `\n\nYou are speaking with ${userContext.name}`
    if (userContext.email) context += ` (${userContext.email})`
    context += '.'

    return context
}
