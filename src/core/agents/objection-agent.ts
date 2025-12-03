import { detectObjection } from './utils/detect-objections'
import type { AgentContext, ChatMessage, AgentResult } from './types'
import { GEMINI_MODELS } from 'src/config/constants'

/**
 * Objection Agent - Micro-agent that activates only when objection detected
 * 
 * Uses detectObjection utility to classify objection type
 * Provides pre-built rebuttals for each objection type
 * Only activates when confidence > 0.6
 */
export async function objectionAgent(
  messages: ChatMessage[],
  context: AgentContext
): Promise<AgentResult> {
  const { intelligenceContext } = context

  const lastMessage = messages[messages.length - 1]?.content || ''
  
  if (!lastMessage) {
    return {
      output: "I'm not sure I fully understood your concern. Can you tell me more about what's holding you back?",
      agent: 'Objection Agent (fallback)',
      model: GEMINI_MODELS.DEFAULT_CHAT,
      metadata: { stage: 'PITCHING' },
    }
  }

  const objection = await detectObjection(lastMessage)

  if (!objection.type || objection.confidence < 0.6) {
    return {
      output: "I'm not sure I fully understood your concern. Can you tell me more about what's holding you back?",
      agent: 'Objection Agent (fallback)',
      model: GEMINI_MODELS.DEFAULT_CHAT,
      metadata: { stage: 'PITCHING' },
    }
  }

  // Build rebuttals with context
  const companySize = intelligenceContext?.company?.employeeCount || 
    (intelligenceContext?.company?.size === '1-10' ? 5 :
     intelligenceContext?.company?.size === '11-50' ? 25 :
     intelligenceContext?.company?.size === '51-200' ? 100 :
     intelligenceContext?.company?.size === '201-1000' ? 500 :
     intelligenceContext?.company?.size === '1000+' ? 2000 : 50)

  const budgetMin = intelligenceContext?.budget?.minUsd || 100
  const personRole = intelligenceContext?.person?.role || 'leader'
  const companyIndustry = intelligenceContext?.company?.industry || 'your industry'

  const rebuttals: Record<string, string> = {
    price: `I hear that — most teams assume this will be expensive. But when you factor in the ${companySize}+-person team and the $${budgetMin}K+ you're already spending on tools that aren't moving the needle, our clients see full ROI in under 4 months. Would you be open to seeing a quick breakdown?`,
    
    timing: `Totally fair — timing is everything. The teams that win with AI are the ones who start 3–6 months before they "need" it. If we don't start soon, you're effectively choosing to fall further behind your competitors. When would be the earliest you'd be ready to explore this?`,
    
    authority: `Got it — you're not the final decision maker. Who else needs to be in the room for this conversation? I've helped ${personRole}s like you bring in the right stakeholders — happy to run a 15-minute prep call with them directly.`,
    
    need: `Interesting — many leaders feel that way until they see their own data through an AI lens. From what you've shown me on screen and the pain points in your industry, you're already losing ground. Want me to show you exactly where in 60 seconds?`,
    
    trust: `Completely understandable. Here's a quick case study from a similar ${companyIndustry} company that was skeptical too — they saw 4.2x ROI in year one. Would you like to speak with their Head of Engineering directly?`,
  }

  const response = rebuttals[objection.type] || "That's a fair point. Let me make sure I understand your concern correctly..."

  return {
    output: response,
    agent: 'Objection Agent',
    model: GEMINI_MODELS.DEFAULT_CHAT,
    metadata: {
      stage: 'CLOSING',
      currentObjection: objection.type,
    },
  }
}

