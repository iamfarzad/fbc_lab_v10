import { generateText, type GenerateTextResult } from 'ai';
import { google, type GeminiModelSettings } from './ai-client.js';
import { GEMINI_MODELS } from '../config/constants.js';

export async function safeGenerateText(params: {
  system: string;
  messages: any[];
  temperature?: number;
  maxRetries?: number;
  tools?: any;
  modelSettings?: GeminiModelSettings;
  modelId?: import('../config/constants.js').GeminiModel;
}): Promise<GenerateTextResult<any, any>> {
  const {
    system,
    messages,
    temperature = 1.0,
    maxRetries = 2,
    tools,
    modelSettings = { thinking_level: 'high' },
    modelId = GEMINI_MODELS.DEFAULT_CHAT
  } = params;

  try {
    return await generateText({
      model: google(modelId, modelSettings),
      system,
      messages: messages.slice(-20),
      temperature,
      maxRetries,
      tools,
    });
  } catch (err: any) {
    console.warn('[Gemini] Pro failed, falling back to Flash', err?.message || String(err));

    // Flash is cheaper, faster, and almost as good for sales
    return await generateText({
      model: google(GEMINI_MODELS.DEFAULT_RELIABLE, modelSettings),
      system: system.slice(0, 1500), // Flash has smaller context
      messages: messages.slice(-15),
      temperature: temperature + 0.1, // slightly more creative
      maxRetries: 1,
      tools,
    });
  }
}
