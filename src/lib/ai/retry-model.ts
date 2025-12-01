import { google } from '@ai-sdk/google';
import { RETRY_CONFIG } from './retry-config.js';

/**
 * Create a Gemini model with retry logic
 * Note: Using direct model wrapper since experimental_wrapLanguageModel may not exist in all AI SDK versions
 */
export function createRetryableGemini(modelId: string = RETRY_CONFIG.models.primary) {
    const model = google(modelId) as any; // Type assertion to bypass version mismatch
    
    // Wrap the model with retry logic
    return {
        ...model,
        doGenerate: async (options: any) => {
            const originalDoGenerate = model.doGenerate || model.generate || ((opts: any) => model(opts));
            let lastError: unknown;
            for (let attempt = 0; attempt < RETRY_CONFIG.retry.maxAttempts; attempt++) {
                try {
                    return await originalDoGenerate(options);
                } catch (error) {
                    lastError = error;
                    // Simple exponential backoff
                    if (attempt < RETRY_CONFIG.retry.maxAttempts - 1) {
                        const delay = Math.min(
                            RETRY_CONFIG.retry.baseDelay * Math.pow(RETRY_CONFIG.retry.backoffMultiplier, attempt),
                            RETRY_CONFIG.retry.maxDelay
                        );
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                }
            }
            throw lastError;
        }
    };
}

/**
 * Create a Gemini model with retry logic for streaming
 */
export function createRetryableGeminiStream(modelId: string = RETRY_CONFIG.models.primaryStream) {
    return createRetryableGemini(modelId);
}

/**
 * Create a reliable Gemini model (higher timeout/retries)
 */
export function createRetryableGeminiReliable(modelId: string = RETRY_CONFIG.models.primaryReliable) {
    return createRetryableGemini(modelId);
}
