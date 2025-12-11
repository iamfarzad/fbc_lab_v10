import type { IntelligenceContext } from '../types.js'

/**
 * Generate a general agent briefing from intelligence context
 * 
 * Creates a narrative briefing with persona, company context, and strategic angles.
 * This is a general briefing that can be used by all agents.
 */
export function generateAgentBriefing(ctx: IntelligenceContext | undefined): string {
  if (!ctx || !ctx.company) return ''

  // 1. Identify the Persona
  const name = ctx.person?.fullName || ctx.name || 'the user'
  const role = ctx.person?.role || ctx.role || 'a team member'
  const company = ctx.company.name || 'their company'

  // 2. Determine Technical Level (for "Smart" adaptation)
  const roleLower = (ctx.person?.role || ctx.role || '').toLowerCase()
  const industryLower = (ctx.company.industry || '').toLowerCase()
  const isTechSavvy = 
    roleLower.match(/cto|cio|developer|engineer|architect|data|scientist|product/i) ||
    industryLower === 'technology'

  const techInstruction = isTechSavvy
    ? 'User is TECHNICAL. You can use industry terms (API, LLM, Latency). Skip basic definitions.'
    : 'User is BUSINESS-FOCUSED. Focus on ROI, Efficiency, and Strategy. Avoid jargon.'

  // 3. Construct the Narrative Briefing
  return `
=== 🧠 LIVE INTELLIGENCE BRIEFING ===
WHO YOU ARE TALKING TO: ${name}, who is ${role} at ${company}.
COMPANY CONTEXT: ${company} is a ${ctx.company.size || 'growth'} stage company in the ${ctx.company.industry || 'unknown'} sector.

STRATEGIC ANGLES:
1. ${techInstruction}
2. Authority Level: ${ctx.person?.seniority || ctx.strategicContext?.authorityLevel || 'Unknown'} (Adjust your deference accordingly).
3. Validated Context: ${(ctx.researchConfidence || 0) > 0.7 ? 'Data is verified via LinkedIn/Domain match.' : 'Data is inferred - ask to confirm.'}

KEY HOOKS (Use these naturally):
${ctx.company.summary ? `- Reference: "${ctx.company.summary.substring(0, 100)}..."` : ''}
${ctx.person?.profileUrl ? `- Mention you've seen their background context.` : ''}
=====================================
`
}

/**
 * Generate system prompt supplement with strategic context instructions
 * 
 * Creates specific instructions for agents based on privacy sensitivity,
 * technical level, and authority level. This supplement should be appended
 * to agent system prompts to ensure context-aware communication.
 */
export function generateSystemPromptSupplement(ctx: IntelligenceContext | undefined): string {
  if (!ctx || !ctx.strategicContext) {
    // Still include facts even if strategicContext is missing
    if (ctx?.facts && ctx.facts.length > 0) {
      return generateFactsContext(ctx.facts)
    }
    return ''
  }

  const { privacySensitivity, technicalLevel, authorityLevel } = ctx.strategicContext
  const companyName = ctx.company?.name || 'their company'

  let specificInstructions = ''

  // 1. Handle Privacy/Skepticism Pre-emptively
  if (privacySensitivity === 'HIGH') {
    specificInstructions += `
⚠️ CRITICAL CONTEXT: High Privacy Risk Industry (${ctx.company?.industry || 'Unknown'}).
- Anticipate objections about data security.
- Proactively mention "Local LLMs" and "GDPR/Enterprise Governance" if asked about tools.
- Do NOT suggest sending sensitive data to public APIs.`
  } else if (privacySensitivity === 'MEDIUM') {
    specificInstructions += `
📋 PRIVACY NOTE: Medium Privacy Sensitivity Industry (${ctx.company?.industry || 'Unknown'}).
- Be mindful of data security concerns.
- Mention enterprise-grade security options when relevant.`
  }

  // 2. Handle Tone based on Tech Savviness
  if (technicalLevel === 'HIGH') {
    specificInstructions += `
🧠 USER IS TECHNICAL.
- Skip basic definitions of AI.
- It is okay to use terms like "Context Window", "RAG", or "Fine-tuning".
- Focus on implementation details and architecture.`
  } else {
    specificInstructions += `
💼 USER IS BUSINESS-FOCUSED.
- Focus on ROI, Efficiency, and Competitive Advantage.
- Avoid technical jargon. Explain concepts simply.`
  }

  // 3. Authority Level Instructions
  if (authorityLevel === 'DECISION_MAKER') {
    specificInstructions += `
👔 USER IS A DECISION MAKER.
- You can discuss budget, timelines, and strategic decisions directly.
- Be confident and direct in your recommendations.
- Focus on high-level impact and business outcomes.`
  } else if (authorityLevel === 'INFLUENCER') {
    specificInstructions += `
🤝 USER IS AN INFLUENCER.
- They may need to present ideas to decision makers.
- Provide clear value propositions they can share.
- Focus on practical benefits and quick wins.`
  } else {
    specificInstructions += `
🔍 USER IS A RESEARCHER.
- They are likely gathering information for others.
- Provide comprehensive information and resources.
- Be helpful and educational.`
  }

  const identityGuardrails = generateIdentityGuardrailInstructions(ctx)

  // Include facts if available
  const factsContext = ctx.facts && ctx.facts.length > 0 
    ? `\n\n📝 SEMANTIC MEMORY (From previous conversations):\n${ctx.facts.map((f, i) => `${i + 1}. ${f}`).join('\n')}\n\nUse these facts only AFTER the user confirms name/company/role. If the user corrects anything, discard conflicting facts immediately.`
    : ''

  return `
=== 🎯 LIVE STRATEGIC CONTEXT ===
User Authority: ${authorityLevel} (Adjust deference accordingly).
Company: ${companyName} (${ctx.company?.size || 'Unknown size'}).
${specificInstructions}
${identityGuardrails}${factsContext}
=================================
`
}

/**
 * Generate facts-only context (when strategicContext is missing)
 */
function generateFactsContext(facts: string[]): string {
  return `
=== 📝 SEMANTIC MEMORY ===
From previous conversations with this user:
${facts.map((f, i) => `${i + 1}. ${f}`).join('\n')}

Use these facts ONLY after the user confirms name/company/role. If they correct anything, discard the conflicting facts.
==========================
`
}

/**
 * Generate vision capability instructions for agent prompts
 * 
 * Adds guidance on using active vision investigation tools when multimodal
 * context indicates visual content is available.
 */
export function generateVisionCapabilityInstructions(hasRecentImages: boolean): string {
  if (!hasRecentImages) return ''

  return `
👁️ VISION CAPABILITIES ACTIVE:
- You CAN see what the user sees, but you must look actively.
- If user references specific data ("this number", "that error", "the chart shows"), use capture_screen_snapshot with focus_prompt to read it precisely.
- For user emotions, physical environment, or gestures, use capture_webcam_snapshot with focus_prompt.
- Do NOT guess what's on screen/webcam. Use the tool to ask the vision model to read it for you.

ACTIVE INVESTIGATION PATTERNS:
- Debugger Pattern: User mentions "error", "wrong", "doesn't work" → capture_screen_snapshot({ focus_prompt: "Read the specific error message text in the red box" })
- Empath Pattern: Long silence/frustration detected → capture_webcam_snapshot({ focus_prompt: "Describe the user's facial expression and body language" })
- Digitizer Pattern: User says "I sketched it out" or "I have it on paper" → capture_webcam_snapshot({ focus_prompt: "Convert the hand-drawn flowchart into a text list of steps" })

Remember: Without focus_prompt, tools return cached summaries. With focus_prompt, you get fresh targeted analysis.
`
}

/**
 * Identity and personalization guardrails
 * - Prevents hallucinated name/company/role
 * - Requires explicit confirmation before using stored facts or external research
 */
export function generateIdentityGuardrailInstructions(ctx?: IntelligenceContext): string {
  const hasFacts = !!ctx?.facts?.length
  const hasName = !!(ctx?.person && ((ctx.person as any).name || ctx.person.fullName))
  const hasCompany = !!ctx?.company?.name

  const needsConfirm = !hasName || !hasCompany || hasFacts

  if (!needsConfirm) return `
🛑 IDENTITY GUARDRAILS:
- Do NOT guess company/role. If unsure, ask for confirmation before referencing identity details.
- Only run external research if the user asks for it or gives permission.
- If the user corrects anything, acknowledge, discard conflicting facts, and continue with the updated info.
`

  return `
🛑 IDENTITY GUARDRAILS:
- First, confirm identity: "Can you confirm your name, company, and role so I don't mix you up?"
- Do NOT assume prior facts are correct. If the user says anything conflicts, discard the old fact immediately.
- Do NOT invent company/round/industry details. Only cite what the user provided or explicitly approved.
- Only run external research if the user asks for it or gives permission; otherwise, stay within provided info.
- After correction, restate the updated identity briefly to show you've reset context.
`
}

/**
 * Generate sales constraint instructions for agent prompts
 * 
 * Prevents agents from giving away solutions for free. Instead, agents should
 * use teaser tools to demonstrate expertise while driving bookings.
 */
export function generateSalesConstraintInstructions(): string {
  return `
🚫 CONSULTANT RULE: NEVER GIVE THE SOLUTION FREE.

- If the user asks "How do I fix X?" or "How do I implement Y?", do NOT explain the code, prompts, or detailed steps.
- INSTEAD: Use 'generate_custom_syllabus' to show that "Fixing X" is the main topic of "Module 2" in your workshop.
- PROVE you know the answer by briefly describing the *outcome* ("Yes, we can automate that using RAG pipelines"), but sell the *method* ("That's exactly what we cover in our Advanced Implementation module").
- Use 'simulate_cost_of_inaction' when they mention inefficient processes to show the cost of waiting.
- Use 'analyze_competitor_gap' when discussing industry context to create urgency.
- Use 'generate_executive_memo' when budget, timing, or security objections are raised - this helps the champion sell to their decision maker (CFO/CEO/CTO).

When to break this rule: Only if explicitly asked "How does this work technically?" AND they've already booked a call or shown strong buying intent (explicit budget discussion, timeline commitment).
`
}
