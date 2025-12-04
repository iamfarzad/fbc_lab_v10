import { generateText, type GenerateTextResult } from 'ai';
import { google } from './ai-client.js';
import { GEMINI_MODELS } from '../config/constants.js';

export async function safeGenerateText(params: {
  system: string;
  messages: any[];
  temperature?: number;
  maxRetries?: number;
  tools?: any;
}): Promise<GenerateTextResult<any, any>> {
  const { system, messages, temperature = 0.7, maxRetries = 2, tools } = params;

  try {
    return await generateText({
      model: google(GEMINI_MODELS.DEFAULT_CHAT),
      system,
      messages: messages.slice(-20),
      temperature,
      maxRetries,
      tools,
    });
  } catch (err: any) {
    console.warn('[Gemini] Pro failed, falling back to Flash', err.message);

    // Flash is cheaper, faster, and almost as good for sales
    return await generateText({
      model: google(GEMINI_MODELS.DEFAULT_RELIABLE),
      system: system.slice(0, 1500), // Flash has smaller context
      messages: messages.slice(-15),
      temperature: temperature + 0.1, // slightly more creative
      maxRetries: 1,
      tools,
    });
  }
}
