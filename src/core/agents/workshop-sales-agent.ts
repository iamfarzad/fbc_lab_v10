import { google, streamText } from 'src/lib/ai-client'
import { formatMessagesForAI } from 'src/lib/format-messages'
import { z } from 'zod'
import type { AgentContext, ChatMessage } from './types'
import { GEMINI_MODELS } from 'src/config/constants'
import { toolExecutor } from 'src/core/tools/tool-executor'

/**
 * Workshop Sales Agent - Pitches in-person AI workshops
 * 
 * Target: Mid-size companies, team leads/managers, $5K-$15K budget
 * Tools: create_chart (ROI), create_calendar_widget (booking)
 */
export async function workshopSalesAgent(
  messages: ChatMessage[],
  context: AgentContext
) {
  const { intelligenceContext, conversationFlow, multimodalContext } = context

  const systemPrompt = `You are F.B/c Workshop Sales AI - pitch hands-on AI workshops.

LEAD PROFILE:
${JSON.stringify(intelligenceContext, null, 2)}

DISCOVERY INSIGHTS:
${conversationFlow?.evidence ? JSON.stringify(conversationFlow.evidence).substring(0, 800) : 'None'}

MULTIMODAL CONTEXT:
${multimodalContext?.hasRecentImages ? '- Saw their screen/dashboard' : ''}
${multimodalContext?.hasRecentUploads ? '- Reviewed their documents' : ''}

YOUR PITCH STRUCTURE:
1. Acknowledge pain from discovery
   "So you mentioned your team struggles with [X from discovery]..."

2. Position workshop as solution
   "We run hands-on AI workshops where your team learns to [solve X].
    For ${intelligenceContext?.company?.industry || 'your industry'}, we focus on [specific use case]."

3. Show ROI via create_chart tool
   Example: "Training 10 people = $50K in productivity gains over 6 months"

4. Soft CTA
   "Want to see if a workshop makes sense? I can send you details and available dates."

TOOLS AVAILABLE:
- create_chart: Show ROI visualization
- create_calendar_widget: Embed booking when they show interest

CONSTRAINTS:
- Don't mention consulting (that's a different product)
- Keep pricing vague until they book call
- Create urgency: "Next workshop is in [timeframe], spots are limited"
- Reference multimodal moments naturally:
  ✅ "When you showed me your Excel dashboard, I noticed..."
  ❌ "Based on screen share analysis..."

STYLE: Conversational, no fluff, focus on value`

  const tools: Record<string, {
    description: string
    parameters: z.ZodTypeAny
    execute: (args: unknown) => Promise<unknown>
  }> = {
    create_chart: {
      description: 'Create ROI visualization showing workshop value',
      parameters: z.object({
        title: z.string(),
        data: z.array(z.object({
          label: z.string(),
          value: z.number()
        }))
      }),
      execute: async (args: unknown) => {
        const typedArgs = args as { title: string; data: Array<{ label: string; value: number }> }
        const result = await toolExecutor.execute({
          toolName: 'create_chart',
          sessionId: context.sessionId || 'anonymous',
          agent: 'Workshop Sales Agent',
          inputs: typedArgs,
          handler: async () => {
            return {
              type: 'chart',
              title: typedArgs.title,
              data: typedArgs.data,
              rendered: true
            }
          },
          cacheable: false
        })

        if (!result.success) {
          throw new Error(result.error || 'Chart creation failed')
        }

        return result.data
      }
    },
    create_calendar_widget: {
      description: 'Embed calendar booking widget when lead shows interest',
      parameters: z.object({
        title: z.string().describe("Widget title, e.g. 'Book Your Workshop Session'"),
        description: z.string().optional().describe("Brief description of what they're booking"),
        url: z.string().optional().describe("Optional custom Cal.com URL. Leave empty to use default.")
      }),
      execute: async (args: unknown) => {
        const typedArgs = args as { title: string; description?: string }
        const result = await toolExecutor.execute({
          toolName: 'create_calendar_widget',
          sessionId: context.sessionId || 'anonymous',
          agent: 'Workshop Sales Agent',
          inputs: typedArgs,
          handler: async () => {
            return {
              type: 'calendar_widget',
              title: typedArgs.title,
              description: typedArgs.description,
              url: (typedArgs as any).url || 'https://cal.com/farzad/workshop-inquiry',
              rendered: true
            }
          },
          cacheable: false
        })

        if (!result.success) {
          throw new Error(result.error || 'Calendar widget creation failed')
        }

        return result.data
      }
    }
  }

  const streamTextOptions: Parameters<typeof streamText>[0] = {
    model: google(GEMINI_MODELS.DEFAULT_CHAT),
    messages: formatMessagesForAI(messages),
    system: systemPrompt,
    temperature: 0.7
  }
  if (tools) {
    const typedTools = tools as unknown as Parameters<typeof streamText>[0]['tools']
    if (typedTools !== undefined) {
      streamTextOptions.tools = typedTools
    }
  }
  const result = await streamText(streamTextOptions)

  // Convert stream to text
  let fullText = ''
  for await (const chunk of result.textStream) {
    fullText += chunk
  }

  return {
    output: fullText,
    agent: 'Workshop Sales Agent',
    model: GEMINI_MODELS.DEFAULT_CHAT,
    metadata: {
      stage: 'WORKSHOP_PITCH' as const,
      pitchDelivered: true,
      multimodalReferenced: multimodalContext?.hasRecentImages || false
    }
  }
}
