import { safeGenerateText } from 'src/lib/gemini-safe';
import { formatMessagesForAI } from 'src/lib/format-messages';
import { toolExecutor } from 'src/core/tools/tool-executor';
import { z } from 'zod';
import type { AgentContext, ChatMessage } from './types';
import { GEMINI_MODELS } from 'src/config/constants';

// src/core/agents/closer-agent.ts — FINAL UPGRADED VERSION

export async function closerAgent(
  messages: ChatMessage[],
  context: AgentContext
) {
  const { intelligenceContext, multimodalContext, sessionId = 'anonymous' } = context;

  const systemPrompt = `You are F.B/c Closer AI - your job is to close the deal.

LEAD PROFILE:
${JSON.stringify(intelligenceContext, null, 2)}

MULTIMODAL PROOF (use this as social proof):
- Voice used: ${multimodalContext?.hasRecentAudio ? 'Yes - live conversation' : 'No'}
- Screen shared: ${multimodalContext?.hasRecentImages ? 'Yes - I saw their systems live' : 'No'}
- Documents uploaded: ${multimodalContext?.hasRecentUploads ? 'Yes' : 'No'}

TOOLS AVAILABLE:
- create_chart: Show ROI breakdown
- create_calendar_widget: Final booking CTA

CLOSING RULES:
- Reference the multimodal experience: "You've already seen what our AI can do live"
- Create urgency: "Slots are filling fast"
- Remove friction: "Free call, no commitment"
- Use tools when appropriate

Respond to the user's last message and close.`;

  const tools = {
    create_chart: {
      description: 'Show cost/benefit analysis',
      parameters: z.object({
        title: z.string(),
        data: z.array(z.object({
          label: z.string(),
          value: z.number()
        }))
      }),
      execute: async (args: any) => {
        const result = await toolExecutor.execute({
          toolName: 'create_chart',
          sessionId,
          agent: 'Closer Agent',
          inputs: args,
          handler: async () => Promise.resolve({ type: 'chart', title: args.title, data: args.data, rendered: true }),
          cacheable: false
        });
        if (!result.success) throw new Error('Chart failed');
        return result.data;
      }
    },
    create_calendar_widget: {
      description: 'Show booking calendar',
      parameters: z.object({
        title: z.string().default("Book Your Free Strategy Call"),
        description: z.string().optional(),
        url: z.string().optional()
      }),
      execute: async (args: any) => {
        const result = await toolExecutor.execute({
          toolName: 'create_calendar_widget',
          sessionId,
          agent: 'Closer Agent',
          inputs: args,
          handler: async () => Promise.resolve({
            type: 'calendar_widget',
            title: args.title,
            description: args.description,
            url: args.url || 'https://cal.com/farzad/strategy-call',
            rendered: true
          }),
          cacheable: false
        });
        if (!result.success) throw new Error('Calendar failed');
        return result.data;
      }
    }
  };

  const result = await safeGenerateText({
    system: systemPrompt,
    messages: formatMessagesForAI(messages),
    temperature: 0.8,
    tools
  });

  return {
    output: result.text || '',
    agent: 'Closer Agent',
    model: `${GEMINI_MODELS.GEMINI_3_PRO_PREVIEW} → ${GEMINI_MODELS.DEFAULT_RELIABLE} (auto-fallback)`,
    metadata: {
      stage: 'CLOSING' as const,
      toolsUsed: result.toolCalls?.length > 0,
      multimodalProofUsed: Boolean(multimodalContext?.hasRecentAudio || multimodalContext?.hasRecentImages)
    }
  };
}
