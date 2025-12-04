import { safeGenerateText } from '../../lib/gemini-safe.js';
import { formatMessagesForAI } from '../../lib/format-messages.js';
import { toolExecutor } from '../tools/tool-executor.js';
import { getChatToolDefinitions } from '../tools/unified-tool-registry.js';
import { z } from 'zod';
import type { AgentContext, ChatMessage } from './types';
import { GEMINI_MODELS } from '../../config/constants.js';

// src/core/agents/closer-agent.ts — FINAL UPGRADED VERSION
// Uses unified tool registry + agent-specific tools

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
- search_web: Search for current information
- calculate_roi: Calculate ROI based on investment and savings
- extract_action_items: Extract key outcomes from the conversation
- generate_summary_preview: Generate conversation summary preview
- draft_follow_up_email: Draft follow-up email
- generate_proposal_draft: Generate proposal draft
- create_chart: Show ROI breakdown
- create_calendar_widget: Final booking CTA

CLOSING RULES:
- Reference the multimodal experience: "You've already seen what our AI can do live"
- Create urgency: "Slots are filling fast"
- Remove friction: "Free call, no commitment"
- Use tools when appropriate (calculate_roi for ROI discussions, create_chart for visualization)

Respond to the user's last message and close.`;

  // Get unified tools from registry (includes retry, caching, logging)
  const unifiedTools = getChatToolDefinitions(sessionId, 'Closer Agent');

  // Agent-specific tools (not in unified registry)
  const agentTools = {
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

  // Merge unified tools with agent-specific tools
  const tools = {
    ...unifiedTools,
    ...agentTools
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
